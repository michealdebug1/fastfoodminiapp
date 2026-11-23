import { createClient } from "@/lib/supabase/server";
import {
  createTelegramServiceClient,
  getVerifiedTelegramSession,
  hasSameOrigin,
} from "@/lib/telegram/server";
import {
  consumeDurableRateLimit,
  apiError,
  apiSuccess,
  isApiRateLimited,
  readJsonBody,
} from "../../../api-utils";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return apiError(403, "invalid_origin");
  if (isApiRateLimited(request, "recovery-enroll-verify", 10, 15 * 60_000)) {
    return apiError(429, "rate_limited");
  }

  const telegram = await getVerifiedTelegramSession();
  if (!telegram) return apiError(401, "telegram_verification_required");
  const body = await readJsonBody(request);
  if (typeof body?.code !== "string" || !/^\d{6}$/.test(body.code)) {
    return apiError(400, "invalid_code");
  }

  let serviceClient;
  try {
    serviceClient = createTelegramServiceClient();
  } catch {
    return apiError(503, "identity_unavailable");
  }
  const rateLimit = await consumeDurableRateLimit(
    serviceClient,
    "recovery_enroll_verify",
    request,
    telegram.telegramUserId,
  );
  if (rateLimit === "limited") return apiError(429, "rate_limited");
  if (rateLimit === "unavailable") {
    return apiError(503, "identity_unavailable");
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return apiError(503, "recovery_unavailable");
  }
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return apiError(401, "session_required");
  const { data: identity, error: identityError } = await serviceClient
    .from("customer_telegram_identities")
    .select("profile_id, phone_e164")
    .eq("telegram_user_id", telegram.telegramUserId)
    .maybeSingle();
  if (identityError) {
    console.error("Telegram recovery enrollment lookup failed", identityError.code);
    return apiError(503, "identity_unavailable");
  }
  if (!identity) return apiError(404, "identity_not_linked");
  if (identity.profile_id !== userData.user.id) {
    return apiError(403, "profile_mismatch");
  }

  const { data: verificationData, error: verificationError } =
    await supabase.auth.verifyOtp({
      phone: identity.phone_e164,
      token: body.code,
      type: "phone_change",
    });
  if (verificationError || verificationData.user?.id !== identity.profile_id) {
    return apiError(400, "invalid_code");
  }

  return apiSuccess({ recoveryEnabled: true });
}
