import { createClient } from "@/lib/supabase/server";
import {
  createTelegramServiceClient,
  getVerifiedTelegramSession,
  hasSameOrigin,
} from "@/lib/telegram/server";
import {
  isRecoveryEnabledForIdentity,
  recoverySessionMatchesProfile,
} from "@/lib/telegram/identity-policy";
import {
  consumeDurableRateLimit,
  apiError,
  apiSuccess,
  isApiRateLimited,
  readJsonBody,
} from "../../api-utils";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return apiError(403, "invalid_origin");
  if (isApiRateLimited(request, "recovery-verify", 10, 15 * 60_000)) {
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
    "recovery_verify",
    request,
    telegram.telegramUserId,
  );
  if (rateLimit === "limited") return apiError(429, "rate_limited");
  if (rateLimit === "unavailable") {
    return apiError(503, "identity_unavailable");
  }
  const { data: identity, error: identityError } = await serviceClient
    .from("customer_telegram_identities")
    .select("profile_id, phone_e164")
    .eq("telegram_user_id", telegram.telegramUserId)
    .maybeSingle();
  if (identityError) {
    console.error("Telegram recovery lookup failed", identityError.code);
    return apiError(503, "identity_unavailable");
  }
  if (!identity) return apiError(404, "identity_not_linked");

  const { data: authUserData, error: authUserError } =
    await serviceClient.auth.admin.getUserById(identity.profile_id);
  if (authUserError || !authUserData.user) {
    console.error("Telegram recovery account lookup failed");
    return apiError(503, "identity_unavailable");
  }
  if (
    !isRecoveryEnabledForIdentity(
      identity.phone_e164,
      authUserData.user.phone,
      authUserData.user.phone_confirmed_at,
    )
  ) {
    return apiError(409, "recovery_not_enabled");
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return apiError(503, "recovery_unavailable");
  }
  const { data: verificationData, error: verificationError } =
    await supabase.auth.verifyOtp({
      phone: identity.phone_e164,
      token: body.code,
      type: "sms",
    });
  if (verificationError || !verificationData.user) {
    return apiError(400, "invalid_code");
  }
  if (!recoverySessionMatchesProfile(identity.profile_id, verificationData.user.id)) {
    const { error: signOutError } = await supabase.auth.signOut({
      scope: "local",
    });
    if (signOutError) {
      console.error("Mismatched recovery session could not be cleared");
      return apiError(503, "recovery_unavailable");
    }
    return apiError(409, "recovery_account_mismatch");
  }

  return apiSuccess({ recovered: true });
}
