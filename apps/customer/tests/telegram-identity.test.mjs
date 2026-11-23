import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { formatUzs } from "../src/lib/format-uzs.ts";
import { getOwnedTelegramContact, normalizeTelegramPhone } from "../src/lib/telegram/contact.ts";
import {
  isRecoveryEnabledForIdentity,
  recoverySessionMatchesProfile,
} from "../src/lib/telegram/identity-policy.ts";
import { isRateLimited } from "../src/lib/telegram/rate-limit.ts";
import { verifyTelegramInitData } from "../src/lib/telegram/verify-init-data.ts";
import {
  parseTelegramWebhookUpdateId,
  verifyTelegramWebhookSecretValue,
} from "../src/lib/telegram/webhook-security.ts";

const botToken = "test-telegram-bot-token";

function createSignedInitData(
  user = { id: 700000000000001, first_name: "Guest" },
  authDate = 1_700_000_000,
) {
  const values = new URLSearchParams({
    auth_date: String(authDate),
    query_id: "AAExample",
    user: JSON.stringify(user),
  });
  const dataCheckString = [...values.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const hash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");
  values.set("hash", hash);
  return values.toString();
}

test("Telegram initData verifies signature, user identity, and freshness", () => {
  const now = 1_700_000_000_000;
  const valid = createSignedInitData();

  assert.deepEqual(verifyTelegramInitData(valid, botToken, now), {
    telegramUserId: "700000000000001",
    firstName: "Guest",
    authDate: 1_700_000_000,
  });
  assert.equal(verifyTelegramInitData(valid, botToken, now + 301_000), null);
  assert.equal(
    verifyTelegramInitData(
      createSignedInitData({ id: 7 }, 1_700_000_031),
      botToken,
      now,
    ),
    null,
  );
});

test("Telegram initData rejects tampering, duplicate keys, and invalid users", () => {
  const now = 1_700_000_000_000;
  const signed = createSignedInitData();
  assert.equal(
    verifyTelegramInitData(signed.replace("Guest", "Other"), botToken, now),
    null,
  );
  assert.equal(
    verifyTelegramInitData(`${signed}&auth_date=1700000000`, botToken, now),
    null,
  );
  assert.equal(
    verifyTelegramInitData(
      createSignedInitData({ id: Number.MAX_SAFE_INTEGER + 1 }),
      botToken,
      now,
    ),
    null,
  );
});

test("Telegram contact must be a private, sender-owned contact with a valid phone", () => {
  const ownContact = {
    from: { id: 700000000000001 },
    chat: { id: 700000000000001, type: "private" },
    contact: {
      user_id: 700000000000001,
      phone_number: "+998 (90) 123-45-67",
    },
  };
  assert.deepEqual(getOwnedTelegramContact(ownContact), {
    telegramUserId: "700000000000001",
    phoneE164: "+998901234567",
  });
  assert.equal(
    getOwnedTelegramContact({
      ...ownContact,
      contact: { ...ownContact.contact, user_id: 700000000000002 },
    }),
    null,
  );
  assert.equal(
    getOwnedTelegramContact({
      ...ownContact,
      contact: { phone_number: "+998901234567" },
    }),
    null,
  );
  assert.equal(normalizeTelegramPhone("not a phone"), null);
});

test("SMS recovery requires the exact linked phone and auth profile", () => {
  assert.equal(
    isRecoveryEnabledForIdentity(
      "+998901234567",
      "+998901234567",
      "2026-01-01T00:00:00Z",
    ),
    true,
  );
  assert.equal(
    isRecoveryEnabledForIdentity("+998901234567", "+998901234568", "verified"),
    false,
  );
  assert.equal(
    isRecoveryEnabledForIdentity("+998901234567", "+998901234567", null),
    false,
  );
  assert.equal(recoverySessionMatchesProfile("profile-a", "profile-a"), true);
  assert.equal(recoverySessionMatchesProfile("profile-a", "profile-b"), false);
});

test("verification endpoint rate limiting allows the configured burst then blocks", () => {
  const key = `telegram-test-${Date.now()}`;
  assert.equal(isRateLimited(key, 2, 1_000, 10_000), false);
  assert.equal(isRateLimited(key, 2, 1_000, 10_100), false);
  assert.equal(isRateLimited(key, 2, 1_000, 10_200), true);
  assert.equal(isRateLimited(key, 2, 1_000, 11_001), false);
});

test("Telegram webhook secret rejects missing, malformed, and incorrect secrets", () => {
  const secret = "a".repeat(32);
  assert.equal(verifyTelegramWebhookSecretValue(secret, secret), true);
  assert.equal(verifyTelegramWebhookSecretValue("b".repeat(32), secret), false);
  assert.equal(verifyTelegramWebhookSecretValue(null, secret), false);
  assert.equal(verifyTelegramWebhookSecretValue(secret, "short"), false);
  assert.equal(
    verifyTelegramWebhookSecretValue(secret, `${secret} `),
    false,
  );
});

test("Telegram webhook update ids must be non-negative safe integers", () => {
  assert.equal(parseTelegramWebhookUpdateId(0), 0);
  assert.equal(parseTelegramWebhookUpdateId(12345), 12345);
  assert.equal(parseTelegramWebhookUpdateId(-1), null);
  assert.equal(parseTelegramWebhookUpdateId(1.5), null);
  assert.equal(parseTelegramWebhookUpdateId("12345"), null);
  assert.equal(parseTelegramWebhookUpdateId(Number.MAX_SAFE_INTEGER + 1), null);
});

test("customer UZS formatting is deterministic for Uzbek and Russian", () => {
  assert.equal(formatUzs(89000, "uz"), "89\u00a0000\u00a0soʻm");
  assert.equal(formatUzs(89000, "ru"), "89\u00a0000\u00a0сум");
});
