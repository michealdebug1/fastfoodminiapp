import type { FulfillmentType, OrderStatus } from "@food-platform/shared";

export type OrderActionKey =
  | "approve"
  | "reject"
  | "startPreparing"
  | "markReadyForPickup"
  | "completePickup"
  | "markReady"
  | "outForDelivery"
  | "markDelivered"
  | "cancel";

/**
 * Maps a database status transition to the staff-facing action label. Delivery
 * labels are retained only so legacy delivery orders remain operable.
 */
export function getOrderActionKey(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
  fulfillment: FulfillmentType,
): OrderActionKey {
  if (nextStatus === "cancelled") {
    return currentStatus === "pending" ? "reject" : "cancel";
  }

  switch (nextStatus) {
    case "confirmed":
      return "approve";
    case "preparing":
      return "startPreparing";
    case "ready_for_pickup":
      return "markReadyForPickup";
    case "completed":
      return "completePickup";
    case "ready":
      return "markReady";
    case "out_for_delivery":
      return "outForDelivery";
    case "delivered":
      return fulfillment === "pickup" ? "completePickup" : "markDelivered";
    default:
      return "approve";
  }
}
