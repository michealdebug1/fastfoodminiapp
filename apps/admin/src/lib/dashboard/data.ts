import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@food-platform/shared";

export const dashboardPeriodSchema = z.enum(["daily", "weekly"]);

const moneySchema = z.string().regex(/^\d+$/);
const orderStatusSchema = z.enum([
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

const dashboardDataSchema = z.object({
  timezone: z.literal("Asia/Tashkent"),
  fulfillment_scope: z.literal("pickup").optional(),
  period: dashboardPeriodSchema,
  generated_at: z.string(),
  metrics: z.object({
    orders_today: z.number().int().nonnegative(),
    gross_order_value_today: moneySchema,
    collected_revenue_today: moneySchema,
    pending_orders: z.number().int().nonnegative(),
    completed_orders_today: z.number().int().nonnegative(),
  }),
  sales: z.array(
    z.object({
      date: z.string(),
      label: z.string(),
      gross_order_value: moneySchema,
      collected_revenue: moneySchema,
    }),
  ),
  popular_products: z.array(
    z.object({
      name: z.string().nullable(),
      units_ordered: z.number().int().nonnegative(),
      revenue_contribution: moneySchema,
    }),
  ),
  recent_orders: z.array(
    z.object({
      id: z.string().uuid().optional(),
      reference: z.string(),
      customer: z.string().nullable(),
      total: moneySchema,
      status: orderStatusSchema,
      created_at: z.string(),
    }),
  ),
  recent_status_changes: z.array(
    z.object({
      reference: z.string(),
      previous_status: orderStatusSchema.nullable(),
      new_status: orderStatusSchema,
      created_at: z.string(),
    }),
  ),
});

export type DashboardPeriod = z.infer<typeof dashboardPeriodSchema>;
export type DashboardData = z.infer<typeof dashboardDataSchema>;

export function parseDashboardPeriod(value?: string): DashboardPeriod {
  const parsed = dashboardPeriodSchema.safeParse(value);
  return parsed.success ? parsed.data : "daily";
}

export async function getDashboardData(
  supabase: SupabaseClient<Database>,
  restaurantId: string,
  period: DashboardPeriod,
): Promise<DashboardData> {
  const { data, error } = await supabase.rpc("get_restaurant_dashboard", {
    p_restaurant_id: restaurantId,
    p_period: period,
  });

  if (error) {
    throw new Error("Unable to load restaurant dashboard data", {
      cause: error,
    });
  }

  const parsed = dashboardDataSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Dashboard data did not match the expected schema", {
      cause: parsed.error,
    });
  }

  return parsed.data;
}

export { formatUzs } from "@/lib/format";
