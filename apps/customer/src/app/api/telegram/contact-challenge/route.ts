import { randomBytes, createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import {
  createTelegramServiceClient,
  getTelegramBotConfig,
  getVerifiedTelegramSession,
  hasSameOrigin,
} from "@/lib/telegram/server";
import {
  apiError,
  apiSuccess,
  isApiRateLimited,
  readJsonBody,
} from "../api-utils";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return apiError(403, "invalid_origin");
  if (isApiRateLimited(request, "contact-challenge", 5, 60_000)) {
    return apiError(429, "rate_limited");
  }

  const telegram = await getVerifiedTelegramSession();
  if (!telegram) return apiError(401, "telegram_verification_required");
  const body = await readJsonBody(request);
  if (body?.consent !== true) return apiError(400, "consent_required");

  let supabase;
  let serviceClient;
  let botConfig: ReturnType<typeof getTelegramBotConfig>;
  try {
    [supabase, serviceClient] = await Promise.all([
      createClient(),
      Promise.resolve(createTelegramServiceClient()),
    ]);
    botConfig = getTelegramBotConfig();
  } catch {
    return apiError(503, "identity_unavailable");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return apiError(401, "session_required");

  const challengeToken = randomBytes(32).toString("base64url");
  const challengeHash = createHash("sha256")
    .update(challengeToken)
    .digest("hex");
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  const { error: challengeError } = await serviceClient.rpc(
    "create_customer_telegram_contact_challenge",
    {
      p_challenge_hash: challengeHash,
      p_telegram_user_id: telegram.telegramUserId,
      p_profile_id: userData.user.id,
      p_expires_at: expiresAt,
    },
  );
  if (challengeError) {
    if (challengeError.message.includes("rate_limited")) {
      return apiError(429, "rate_limited");
    }
    if (challengeError.message.includes("identity_exists")) {
      return apiError(409, "identity_already_linked");
    }
    if (challengeError.message.includes("challenge_already_pending")) {
      return apiError(409, "identity_conflict");
    }
    if (challengeError.message.includes("invalid_challenge")) {
      return apiError(400, "invalid_request");
    }
    console.error("Telegram contact challenge creation failed", challengeError.code);
    return apiError(503, "identity_unavailable");
  }

  return apiSuccess({
    challengeToken,
    botUrl: `https://t.me/${botConfig.botUsername}?start=${challengeToken}`,
    expiresAt,
  });
}
