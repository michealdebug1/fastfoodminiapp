export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type FulfillmentType = "pickup" | "delivery";

export function getNextOrderStatuses(
  status: OrderStatus,
  fulfillment: FulfillmentType,
): OrderStatus[] {
  switch (status) {
    case "pending":
      return ["confirmed", "cancelled"];
    case "confirmed":
      return ["preparing", "cancelled"];
    case "preparing":
      return fulfillment === "pickup"
        ? ["ready_for_pickup", "cancelled"]
        : ["ready", "cancelled"];
    case "ready":
      return fulfillment === "delivery"
        ? ["out_for_delivery", "cancelled"]
        : ["delivered", "cancelled"];
    case "ready_for_pickup":
      return ["completed", "cancelled"];
    case "out_for_delivery":
      return ["delivered", "cancelled"];
    case "completed":
    case "delivered":
    case "cancelled":
      return [];
  }
}
