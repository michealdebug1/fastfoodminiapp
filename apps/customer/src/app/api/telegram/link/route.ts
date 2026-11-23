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
  if (isApiRateLimited(request, "identity-link", 5, 60_000)) {
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
    .select("profile_id, telegram_user_id, contact_verified_at, expires_at")
    .eq("challenge_hash", challengeHash)
    .eq("profile_id", userData.user.id)
    .eq("telegram_user_id", telegram.telegramUserId)
    .maybeSingle();
  if (challengeError) {
    console.error("Telegram identity challenge lookup failed", challengeError.code);
    return apiError(503, "identity_unavailable");
  }
  if (!challenge) return apiError(404, "challenge_not_found");
  if (
    challenge.contact_verified_at === null ||
    challenge.expires_at <= new Date().toISOString()
  ) {
    return apiError(409, "contact_not_verified");
  }

  const { error: linkError } = await serviceClient.rpc(
    "finalize_customer_telegram_identity",
    { p_challenge_hash: challengeHash },
  );
  if (linkError) {
    if (linkError.message.includes("identity_conflict")) {
      return apiError(409, "identity_conflict");
    }
    if (
      linkError.message.includes("challenge_expired") ||
      linkError.message.includes("challenge_not_verified")
    ) {
      return apiError(409, "contact_not_verified");
    }
    console.error("Telegram identity finalization failed", linkError.code);
    return apiError(503, "identity_unavailable");
  }

  return apiSuccess({ linked: true });
}
