import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database, OrderStatus } from "@food-platform/shared";
import type { Locale } from "@/i18n/config";
export { getNextOrderStatuses } from "@food-platform/shared";

export const orderStatusSchema = z.enum([
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "completed",
  "cancelled",
]);

export type { OrderStatus };

export const ORDER_PAGE_SIZE = 20;

export function parseOrderStatus(value?: string) {
  const parsed = orderStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export function localizedOrderText(
  value: unknown,
  locale: Locale,
  fallback: string,
) {
  if (typeof value === "string" && value.trim()) return value;
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return fallback;
  }

  const record = value as Record<string, unknown>;
  const localized = record[locale];
  if (typeof localized === "string" && localized.trim()) return localized;
  for (const candidateLocale of ["uz", "ru"] as const) {
    const candidate = record[candidateLocale];
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }
  return fallback;
}

export async function getOrderDetails(
  supabase: SupabaseClient<Database>,
  restaurantId: string,
  orderId: string,
) {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, public_number, restaurant_id, status, created_at, updated_at, cancelled_at, currency, subtotal, discount_total, delivery_fee, total, payment_method, fulfillment_type, customer_note, addresses:addresses!orders_address_id_fkey(recipient_name, phone, line1, line2, city, district)",
    )
    .eq("restaurant_id", restaurantId)
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    throw new Error("Unable to load order details", { cause: orderError });
  }
  if (!order) return null;

  const [itemsResult, paymentsResult, historyResult] = await Promise.all([
    supabase
      .from("order_items")
      .select("id, product_name, quantity, unit_price, line_total")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    supabase
      .from("payments")
      .select("id, provider, status, amount, currency, verified_at, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false }),
    supabase
      .from("order_status_history")
      .select("id, previous_status, new_status, changed_by, note, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
  ]);

  if (itemsResult.error) {
    throw new Error("Unable to load order items", { cause: itemsResult.error });
  }
  if (paymentsResult.error) {
    throw new Error("Unable to load payment records", {
      cause: paymentsResult.error,
    });
  }
  if (historyResult.error) {
    throw new Error("Unable to load order status history", {
      cause: historyResult.error,
    });
  }

  const itemIds = itemsResult.data.map((item) => item.id);
  const optionsResult = itemIds.length
    ? await supabase
        .from("order_item_options")
        .select("id, order_item_id, option_name, value_name, price_delta")
        .in("order_item_id", itemIds)
    : { data: [], error: null };

  if (optionsResult.error) {
    throw new Error("Unable to load selected order extras", {
      cause: optionsResult.error,
    });
  }

  return {
    order,
    items: itemsResult.data.map((item) => ({
      ...item,
      options: optionsResult.data.filter(
        (option) => option.order_item_id === item.id,
      ),
    })),
    payments: paymentsResult.data,
    history: historyResult.data,
  };
}
