import { createClient } from "@/lib/supabase/server";
import {
  createTelegramServiceClient,
  getTelegramBotConfig,
  setVerifiedTelegramCookie,
} from "@/lib/telegram/server";
import { verifyTelegramInitData } from "@/lib/telegram/verify-init-data";
import { isRecoveryEnabledForIdentity } from "@/lib/telegram/identity-policy";
import {
  consumeDurableRateLimit,
  apiError,
  apiSuccess,
  isApiRateLimited,
  readJsonBody,
} from "../api-utils";
import { hasSameOrigin } from "@/lib/telegram/server";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return apiError(403, "invalid_origin");
  if (isApiRateLimited(request, "identity", 20, 60_000)) {
    return apiError(429, "rate_limited");
  }

  const body = await readJsonBody(request);
  if (typeof body?.initData !== "string") {
    return apiError(400, "invalid_request");
  }

  let botConfig: ReturnType<typeof getTelegramBotConfig>;
  try {
    botConfig = getTelegramBotConfig();
  } catch {
    return apiError(503, "identity_unavailable");
  }
  let serviceClient;
  try {
    serviceClient = createTelegramServiceClient();
  } catch {
    return apiError(503, "identity_unavailable");
  }
  const rateLimit = await consumeDurableRateLimit(
    serviceClient,
    "identity",
    request,
  );
  if (rateLimit === "limited") return apiError(429, "rate_limited");
  if (rateLimit === "unavailable") {
    return apiError(503, "identity_unavailable");
  }

  const telegram = verifyTelegramInitData(
    body.initData,
    botConfig.botToken,
  );
  if (!telegram) return apiError(401, "telegram_verification_failed");

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return apiError(503, "identity_unavailable");
  }

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) return apiError(401, "session_invalid");

  let currentProfileId: string | null = null;
  if (sessionData.session) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return apiError(401, "session_invalid");
    }
    currentProfileId = userData.user.id;
  }

  const { data: identity, error: identityError } = await serviceClient
    .from("customer_telegram_identities")
    .select("profile_id, phone_e164")
    .eq("telegram_user_id", telegram.telegramUserId)
    .maybeSingle();
  if (identityError) {
    console.error("Telegram identity lookup failed", identityError.code);
    return apiError(503, "identity_unavailable");
  }

  let recoveryAvailable = false;
  if (identity) {
    const { data: authUserData, error: authUserError } =
      await serviceClient.auth.admin.getUserById(identity.profile_id);
    if (authUserError || !authUserData.user) {
      console.error("Telegram recovery profile lookup failed");
      return apiError(503, "identity_unavailable");
    }
    recoveryAvailable = isRecoveryEnabledForIdentity(
      identity.phone_e164,
      authUserData.user.phone,
      authUserData.user.phone_confirmed_at,
    );
  }

  try {
    await setVerifiedTelegramCookie(
      telegram.telegramUserId,
      telegram.firstName,
    );
  } catch {
    return apiError(503, "identity_unavailable");
  }

  return apiSuccess({
    firstName: telegram.firstName,
    linked: Boolean(identity),
    currentProfileMatches:
      Boolean(identity) && currentProfileId === identity?.profile_id,
    recoveryAvailable,
  });
}
