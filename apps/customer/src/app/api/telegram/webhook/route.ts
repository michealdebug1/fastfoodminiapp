import { createHash } from "node:crypto";
import { getTranslations } from "next-intl/server";
import {
  getOwnedTelegramContact,
  type TelegramContactMessage,
} from "@/lib/telegram/contact";
import {
  createTelegramServiceClient,
  sendTelegramMessage,
  verifyTelegramWebhookSecret,
} from "@/lib/telegram/server";
import { parseTelegramWebhookUpdateId } from "@/lib/telegram/webhook-security";
import { apiError, readJsonBody } from "../api-utils";

interface TelegramWebhookMessage extends TelegramContactMessage {
  text?: string;
  from?: TelegramContactMessage["from"] & {
    language_code?: string;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getPrivateMessage(value: unknown): TelegramWebhookMessage | null {
  if (!isRecord(value) || !isRecord(value.message)) return null;
  const message = value.message;
  const chatId = isRecord(message.chat) ? message.chat.id : null;
  const senderId = isRecord(message.from) ? message.from.id : null;
  if (
    typeof chatId !== "number" ||
    !Number.isSafeInteger(chatId) ||
    !isRecord(message.chat) ||
    message.chat.type !== "private" ||
    typeof senderId !== "number" ||
    !Number.isSafeInteger(senderId) ||
    chatId !== senderId ||
    !isRecord(message.from)
  ) {
    return null;
  }
  const from = message.from;
  const contact = isRecord(message.contact) ? message.contact : null;
  return {
    from: {
      id: senderId,
      ...(typeof from.language_code === "string"
        ? { language_code: from.language_code }
        : {}),
    },
    chat: { id: chatId, type: "private" },
    ...(typeof message.text === "string" ? { text: message.text } : {}),
    ...(contact
      ? {
          contact: {
            ...(typeof contact.phone_number === "string"
              ? { phone_number: contact.phone_number }
              : {}),
            ...(typeof contact.user_id === "number"
              ? { user_id: contact.user_id }
              : {}),
          },
        }
      : {}),
  };
}

async function processTelegramUpdate(
  body: Record<string, unknown>,
  serviceClient: ReturnType<typeof createTelegramServiceClient>,
): Promise<Response> {
  const message = getPrivateMessage(body);
  if (!message?.from) return Response.json({ ok: true });

  const locale =
    message.from.language_code?.toLowerCase().startsWith("ru") === true
      ? "ru"
      : "uz";
  const t = await getTranslations({
    locale,
    namespace: "TelegramIdentity.bot",
  });

  if (typeof message.text === "string") {
    const startMatch = message.text
      .trim()
      .match(/^\/start(?:@[A-Za-z0-9_]+)?(?:\s+([A-Za-z0-9_-]{1,64}))?$/);
    if (!startMatch) return Response.json({ ok: true });

    const startToken = startMatch[1];
    if (!startToken) {
      try {
        await sendTelegramMessage(message.from.id, t("openStore"));
      } catch {
        console.error("Telegram webhook response failed");
        return apiError(503, "telegram_unavailable");
      }
      return Response.json({ ok: true });
    }

    const challengeHash = createHash("sha256")
      .update(startToken)
      .digest("hex");
    const { data: challenge, error: challengeError } = await serviceClient
      .from("customer_telegram_contact_challenges")
      .select("challenge_hash, expires_at, contact_verified_at, finalized_at")
      .eq("challenge_hash", challengeHash)
      .eq("telegram_user_id", String(message.from.id))
      .gt("expires_at", new Date().toISOString())
      .is("finalized_at", null)
      .maybeSingle();
    if (challengeError) {
      console.error("Telegram start challenge lookup failed", challengeError.code);
      return apiError(503, "identity_unavailable");
    }
    if (!challenge || challenge.contact_verified_at) {
      try {
        await sendTelegramMessage(message.from.id, t("challengeExpired"));
      } catch {
        console.error("Telegram webhook response failed");
        return apiError(503, "telegram_unavailable");
      }
      return Response.json({ ok: true });
    }

    try {
      await sendTelegramMessage(message.from.id, t("shareContact"), {
        keyboard: [[{ text: t("shareButton"), request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      });
    } catch {
      console.error("Telegram webhook response failed");
      return apiError(503, "telegram_unavailable");
    }
    return Response.json({ ok: true });
  }

  if (message.contact) {
    const ownedContact = getOwnedTelegramContact(message);
    if (!ownedContact) {
      try {
        await sendTelegramMessage(message.from.id, t("ownContactOnly"), {
          remove_keyboard: true,
        });
      } catch {
        console.error("Telegram webhook response failed");
        return apiError(503, "telegram_unavailable");
      }
      return Response.json({ ok: true });
    }

    const { data: challenge, error: challengeError } = await serviceClient
      .from("customer_telegram_contact_challenges")
      .select("challenge_hash")
      .eq("telegram_user_id", ownedContact.telegramUserId)
      .gt("expires_at", new Date().toISOString())
      .is("finalized_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (challengeError) {
      console.error("Telegram contact challenge lookup failed", challengeError.code);
      return apiError(503, "identity_unavailable");
    }
    if (!challenge) {
      try {
        await sendTelegramMessage(message.from.id, t("challengeExpired"), {
          remove_keyboard: true,
        });
      } catch {
        console.error("Telegram webhook response failed");
        return apiError(503, "telegram_unavailable");
      }
      return Response.json({ ok: true });
    }

    const { error: contactError } = await serviceClient.rpc(
      "record_customer_telegram_contact",
      {
        p_challenge_hash: challenge.challenge_hash,
        p_telegram_user_id: ownedContact.telegramUserId,
        p_phone_e164: ownedContact.phoneE164,
      },
    );
    if (contactError) {
      if (
        contactError.message.includes("challenge_expired") ||
        contactError.message.includes("challenge_invalid") ||
        contactError.message.includes("contact_mismatch") ||
        contactError.message.includes("invalid_contact")
      ) {
        try {
          await sendTelegramMessage(
            message.from.id,
            contactError.message.includes("contact_mismatch") ||
              contactError.message.includes("invalid_contact")
              ? t("ownContactOnly")
              : t("challengeExpired"),
            { remove_keyboard: true },
          );
        } catch {
          console.error("Telegram webhook response failed");
          return apiError(503, "telegram_unavailable");
        }
        return Response.json({ ok: true });
      }
      console.error("Telegram contact verification failed", contactError.code);
      return apiError(503, "identity_unavailable");
    }

    try {
      await sendTelegramMessage(
        message.from.id,
        t("contactVerified"),
        { remove_keyboard: true },
      );
    } catch {
      console.error("Telegram webhook response failed");
      return apiError(503, "telegram_unavailable");
    }
    return Response.json({ ok: true });
  }

  return Response.json({ ok: true });
}

export async function POST(request: Request) {
  if (
    !verifyTelegramWebhookSecret(
      request.headers.get("x-telegram-bot-api-secret-token"),
    )
  ) {
    return apiError(401, "unauthorized");
  }
  const body = await readJsonBody(request, 32_768);
  if (!body) return apiError(400, "invalid_update");
  const updateId = parseTelegramWebhookUpdateId(body.update_id);
  if (updateId === null) return apiError(400, "invalid_update");

  let serviceClient: ReturnType<typeof createTelegramServiceClient>;
  try {
    serviceClient = createTelegramServiceClient();
  } catch {
    return apiError(503, "identity_unavailable");
  }
  const { data: claims, error: claimError } = await serviceClient.rpc(
    "claim_customer_telegram_webhook_update",
    { p_update_id: updateId },
  );
  if (claimError) {
    console.error("Telegram webhook update claim failed", claimError.code);
    return apiError(503, "identity_unavailable");
  }

  const claim = claims[0];
  if (!claim || claim.disposition === "processed") {
    return Response.json({ ok: true });
  }
  if (claim.disposition === "processing") {
    return apiError(503, "webhook_update_in_progress");
  }
  if (claim.disposition !== "claimed" || !claim.lease_token) {
    console.error("Telegram webhook update claim returned an invalid state");
    return apiError(503, "identity_unavailable");
  }
  const leaseToken = claim.lease_token;

  const releaseClaim = async () => {
    const { error } = await serviceClient.rpc(
      "release_customer_telegram_webhook_update",
      {
        p_update_id: updateId,
        p_lease_token: leaseToken,
      },
    );
    if (error) {
      console.error("Telegram webhook update claim release failed", error.code);
    }
  };

  let response: Response;
  try {
    response = await processTelegramUpdate(body, serviceClient);
  } catch {
    console.error("Telegram webhook update processing failed");
    await releaseClaim();
    return apiError(503, "identity_unavailable");
  }

  if (response.status >= 500) {
    await releaseClaim();
    return response;
  }

  const { data: completed, error: completeError } = await serviceClient.rpc(
    "complete_customer_telegram_webhook_update",
    {
      p_update_id: updateId,
      p_lease_token: leaseToken,
    },
  );
  if (completeError || !completed) {
    console.error(
      "Telegram webhook update completion failed",
      completeError?.code,
    );
    return apiError(503, "identity_unavailable");
  }

  return response;
}
