import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import {
  createTelegramServiceClient,
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
  if (isApiRateLimited(request, "contact-status", 30, 60_000)) {
    return apiError(429, "rate_limited");
  }

  const telegram = await getVerifiedTelegramSession();
  if (!telegram) return apiError(401, "telegram_verification_required");
  const body = await readJsonBody(request);
  if (
    typeof body?.challengeToken !== "string" ||
    !/^[A-Za-z0-9_-]{43}$/.test(body.challengeToken)
  ) {
    return apiError(400, "invalid_request");
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return apiError(401, "session_required");

  const challengeHash = createHash("sha256")
    .update(body.challengeToken)
    .digest("hex");
  let serviceClient;
  try {
    serviceClient = createTelegramServiceClient();
  } catch {
    return apiError(503, "identity_unavailable");
  }
  const { data: challenge, error: challengeError } = await serviceClient
    .from("customer_telegram_contact_challenges")
    .select(
      "profile_id, telegram_user_id, expires_at, contact_verified_at, finalized_at",
    )
    .eq("challenge_hash", challengeHash)
    .eq("profile_id", userData.user.id)
    .eq("telegram_user_id", telegram.telegramUserId)
    .maybeSingle();
  if (challengeError) {
    console.error("Telegram contact status lookup failed", challengeError.code);
    return apiError(503, "identity_unavailable");
  }
  if (!challenge) return apiError(404, "challenge_not_found");

  const status =
    challenge.finalized_at !== null
      ? "linked"
      : challenge.expires_at <= new Date().toISOString()
        ? "expired"
        : challenge.contact_verified_at !== null
          ? "verified"
          : "pending";
  return apiSuccess({ status });
}
