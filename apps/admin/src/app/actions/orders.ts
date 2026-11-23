"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { requireAdminArea } from "@/lib/auth/access";
import { getNextOrderStatuses, orderStatusSchema } from "@/lib/management/orders";
import { createClient } from "@/lib/supabase/server";

const transitionSchema = z.object({
  orderId: z.uuid(),
  expectedStatus: orderStatusSchema,
  nextStatus: orderStatusSchema,
});

export type OrderActionState = {
  error?: string;
  success?: string;
};

export async function transitionOrderAction(input: {
  orderId: string;
  expectedStatus: string;
  nextStatus: string;
}): Promise<OrderActionState> {
  const t = await getTranslations("OrderErrors");
  const tActions = await getTranslations("OrderActions");
  const tStatus = await getTranslations("OrderStatus");

  const parsed = transitionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: t("invalidAction") };
  }

  const supabase = await createClient();
  const staff = await requireAdminArea("orders", supabase);

  const { data: current, error: readError } = await supabase
    .from("orders")
    .select("id, status, fulfillment_type")
    .eq("id", parsed.data.orderId)
    .eq("restaurant_id", staff.restaurantId)
    .maybeSingle();

  if (readError) {
    throw new Error("Unable to verify the current order status", {
      cause: readError,
    });
  }
  if (!current) {
    return { error: t("unavailable") };
  }
  if (current.status !== parsed.data.expectedStatus) {
    return {
      error: t("statusChanged", { status: tStatus(current.status) }),
    };
  }
  if (
    !getNextOrderStatuses(current.status, current.fulfillment_type).includes(
      parsed.data.nextStatus,
    )
  ) {
    return { error: t("transitionNotAllowed") };
  }

  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update({ status: parsed.data.nextStatus })
    .eq("id", current.id)
    .eq("restaurant_id", staff.restaurantId)
    .eq("status", parsed.data.expectedStatus)
    .select("id, status")
    .maybeSingle();

  if (updateError) {
    if (updateError.code === "P0001") {
      return { error: t("rejectedByDatabase") };
    }
    console.error("Order status update failed", updateError);
    return { error: t("updateFailed") };
  }
  if (!updated) {
    return { error: t("changedByOther") };
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${current.id}`);

  return {
    success: tActions("movedTo", { status: tStatus(updated.status) }),
  };
}

export async function markCashPaymentPaidAction(input: {
  orderId: string;
  paymentId: string;
}): Promise<OrderActionState> {
  const t = await getTranslations("OrderErrors");
  const tActions = await getTranslations("OrderActions");

  const parsed = z
    .object({ orderId: z.uuid(), paymentId: z.uuid() })
    .safeParse(input);
  if (!parsed.success) {
    return { error: t("invalidPayment") };
  }

  const supabase = await createClient();
  const staff = await requireAdminArea("orders", supabase);
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id")
    .eq("id", parsed.data.orderId)
    .eq("restaurant_id", staff.restaurantId)
    .maybeSingle();

  if (orderError) {
    throw new Error("Unable to verify the payment's order", {
      cause: orderError,
    });
  }
  if (!order) {
    return { error: t("unavailable") };
  }

  const { error } = await supabase.rpc("mark_cash_payment_paid", {
    p_payment_id: parsed.data.paymentId,
  });
  if (error) {
    console.error("Cash payment confirmation failed", error);
    return { error: t("paymentFailed") };
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${order.id}`);
  return { success: tActions("cashReceived") };
}
