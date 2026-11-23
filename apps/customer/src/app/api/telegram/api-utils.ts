import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import {
  createTelegramServiceClient,
} from "@/lib/telegram/server";
import {
  getRateLimitKey,
  isRateLimited,
} from "@/lib/telegram/rate-limit";

const noStoreHeaders = { "cache-control": "no-store" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function apiError(status: number, error: string) {
  return NextResponse.json(
    { error },
    { status, headers: noStoreHeaders },
  );
}

export function apiSuccess<T extends Record<string, unknown>>(data: T) {
  return NextResponse.json(data, { headers: noStoreHeaders });
}

export async function readJsonBody(
  request: Request,
  maximumBytes = 8_192,
): Promise<Record<string, unknown> | null> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    return null;
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) return null;

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maximumBytes) return null;

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;
  return value;
}

export function isApiRateLimited(
  request: Request,
  action: string,
  limit: number,
  windowMilliseconds: number,
) {
  return isRateLimited(
    `${action}:${getRateLimitKey(request)}`,
    limit,
    windowMilliseconds,
  );
}

export async function consumeDurableRateLimit(
  serviceClient: ReturnType<typeof createTelegramServiceClient>,
  action:
    | "identity"
    | "recovery_start"
    | "recovery_verify"
    | "recovery_enroll_start"
    | "recovery_enroll_verify",
  request: Request,
  telegramUserId?: string,
): Promise<"allowed" | "limited" | "unavailable"> {
  const rateLimitKey = process.env.TELEGRAM_BOT_TOKEN;
  if (!rateLimitKey) return "unavailable";
  const ipHash = createHmac("sha256", rateLimitKey)
    .update(getRateLimitKey(request))
    .digest("hex");
  const { error } = await serviceClient.rpc(
    "check_customer_telegram_rate_limit",
    {
      p_action: action,
      p_ip_hash: ipHash,
      p_telegram_user_id: telegramUserId ?? null,
    },
  );
  if (!error) return "allowed";
  if (error.message.includes("rate_limited")) return "limited";
  console.error("Telegram API rate-limit check failed", error.code);
  return "unavailable";
}
