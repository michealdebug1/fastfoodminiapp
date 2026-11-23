import { timingSafeEqual } from "node:crypto";

export function verifyTelegramWebhookSecretValue(
  receivedSecret: string | null,
  expectedSecret: string | undefined,
): boolean {
  if (
    !expectedSecret ||
    expectedSecret.length < 32 ||
    expectedSecret.length > 256 ||
    !/^[A-Za-z0-9_-]+$/.test(expectedSecret) ||
    !receivedSecret
  ) {
    return false;
  }

  const expected = Buffer.from(expectedSecret);
  const received = Buffer.from(receivedSecret);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

export function parseTelegramWebhookUpdateId(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? value
    : null;
}
