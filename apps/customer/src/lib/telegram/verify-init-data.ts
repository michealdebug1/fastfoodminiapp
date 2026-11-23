import { createHmac, timingSafeEqual } from "node:crypto";

export interface VerifiedTelegramInitData {
  telegramUserId: string;
  firstName: string | null;
  authDate: number;
}

const maximumAgeSeconds = 5 * 60;
const allowedFutureSkewSeconds = 30;
const maximumInitDataLength = 8_192;

export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  nowMilliseconds = Date.now(),
): VerifiedTelegramInitData | null {
  if (
    !botToken ||
    initData.length === 0 ||
    initData.length > maximumInitDataLength
  ) {
    return null;
  }

  const entries = [...new URLSearchParams(initData).entries()];
  const values = new Map<string, string>();
  for (const [key, value] of entries) {
    if (values.has(key)) return null;
    values.set(key, value);
  }

  const suppliedHash = values.get("hash");
  const authDateValue = values.get("auth_date");
  const userValue = values.get("user");
  if (
    !suppliedHash ||
    !/^[0-9a-f]{64}$/i.test(suppliedHash) ||
    !authDateValue ||
    !/^\d{1,12}$/.test(authDateValue) ||
    !userValue
  ) {
    return null;
  }

  const authDate = Number(authDateValue);
  const nowSeconds = Math.floor(nowMilliseconds / 1_000);
  if (
    !Number.isSafeInteger(authDate) ||
    authDate > nowSeconds + allowedFutureSkewSeconds ||
    nowSeconds - authDate > maximumAgeSeconds
  ) {
    return null;
  }

  let user: unknown;
  try {
    user = JSON.parse(userValue);
  } catch {
    return null;
  }
  if (
    !user ||
    typeof user !== "object" ||
    !("id" in user) ||
    typeof user.id !== "number" ||
    !Number.isSafeInteger(user.id) ||
    user.id <= 0
  ) {
    return null;
  }

  const dataCheckString = entries
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const expectedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest();
  const actualHash = Buffer.from(suppliedHash, "hex");
  if (
    actualHash.length !== expectedHash.length ||
    !timingSafeEqual(actualHash, expectedHash)
  ) {
    return null;
  }

  const firstName =
    "first_name" in user &&
    typeof user.first_name === "string" &&
    user.first_name.trim().length > 0
      ? user.first_name.trim().slice(0, 64)
      : null;

  return {
    telegramUserId: String(user.id),
    firstName,
    authDate,
  };
}
