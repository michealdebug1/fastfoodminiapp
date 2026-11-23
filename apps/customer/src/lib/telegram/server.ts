import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Database } from "@food-platform/shared";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { verifyTelegramWebhookSecretValue } from "./webhook-security";

const verifiedTelegramCookieName = "customer_telegram_verified";
const verifiedTelegramCookieTtlSeconds = 30 * 60;

export interface VerifiedTelegramSession {
  telegramUserId: string;
  firstName: string | null;
  expiresAt: number;
}

interface TelegramSessionPayload {
  telegramUserId: string;
  firstName: string | null;
  issuedAt: number;
  expiresAt: number;
}

export function createTelegramServiceClient() {
  const { url } = getSupabasePublicConfig();
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing required server environment variable.");
  }

  return createSupabaseClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export function getTelegramBotConfig() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  if (
    !botToken ||
    !botUsername ||
    !/^[A-Za-z0-9_]{5,32}$/.test(botUsername)
  ) {
    throw new Error("Telegram bot configuration is incomplete.");
  }
  return { botToken, botUsername };
}

export function verifyTelegramWebhookSecret(receivedSecret: string | null) {
  return verifyTelegramWebhookSecretValue(
    receivedSecret,
    process.env.TELEGRAM_WEBHOOK_SECRET,
  );
}

export function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function getCookieSigningKey() {
  const { botToken } = getTelegramBotConfig();
  return createHmac("sha256", "customer-telegram-session")
    .update(botToken)
    .digest();
}

function signPayload(payload: TelegramSessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", getCookieSigningKey())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

function verifyPayload(value: string): TelegramSessionPayload | null {
  const [encoded, suppliedSignature, ...extra] = value.split(".");
  if (!encoded || !suppliedSignature || extra.length > 0) return null;

  const expected = createHmac("sha256", getCookieSigningKey())
    .update(encoded)
    .digest();
  const received = Buffer.from(suppliedSignature, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return null;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!isRecord(payload)) {
    return null;
  }

  const now = Math.floor(Date.now() / 1_000);
  if (
    typeof payload.telegramUserId !== "string" ||
    !/^[1-9][0-9]{0,19}$/.test(payload.telegramUserId) ||
    typeof payload.issuedAt !== "number" ||
    !Number.isSafeInteger(payload.issuedAt) ||
    typeof payload.expiresAt !== "number" ||
    !Number.isSafeInteger(payload.expiresAt) ||
    payload.expiresAt <= now ||
    payload.issuedAt > now + 30 ||
    payload.expiresAt <= payload.issuedAt ||
    payload.expiresAt - payload.issuedAt > verifiedTelegramCookieTtlSeconds ||
    (payload.firstName !== null && typeof payload.firstName !== "string") ||
    (typeof payload.firstName === "string" && payload.firstName.length > 64)
  ) {
    return null;
  }

  return {
    telegramUserId: payload.telegramUserId,
    firstName: payload.firstName,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function setVerifiedTelegramCookie(
  telegramUserId: string,
  firstName: string | null,
) {
  const now = Math.floor(Date.now() / 1_000);
  const payload: TelegramSessionPayload = {
    telegramUserId,
    firstName,
    issuedAt: now,
    expiresAt: now + verifiedTelegramCookieTtlSeconds,
  };
  const cookieStore = await cookies();
  cookieStore.set(
    verifiedTelegramCookieName,
    signPayload(payload),
    {
      httpOnly: true,
      maxAge: verifiedTelegramCookieTtlSeconds,
      path: "/api/telegram",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    },
  );
}

export async function getVerifiedTelegramSession():
  Promise<VerifiedTelegramSession | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(verifiedTelegramCookieName)?.value;
  if (!value) return null;

  let payload: TelegramSessionPayload | null;
  try {
    payload = verifyPayload(value);
  } catch {
    return null;
  }
  if (!payload) return null;

  return {
    telegramUserId: payload.telegramUserId,
    firstName: payload.firstName,
    expiresAt: payload.expiresAt,
  };
}

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  replyMarkup?: Record<string, unknown>,
) {
  const { botToken } = getTelegramBotConfig();
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      }),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error("Telegram API request failed.");
  }

  const result: unknown = await response.json();
  if (
    !result ||
    typeof result !== "object" ||
    !("ok" in result) ||
    result.ok !== true
  ) {
    throw new Error("Telegram API request failed.");
  }
}

export function maskPhone(phone: string) {
  return `${phone.slice(0, 4)}••••••${phone.slice(-2)}`;
}
