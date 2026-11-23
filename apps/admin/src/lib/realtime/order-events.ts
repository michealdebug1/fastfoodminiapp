export type OrderInsertEvent = {
  eventType: string;
  new: Record<string, unknown>;
};

export type NewPickupOrder = {
  id: string;
  number: string | null;
};

export function getNewPickupOrder(
  event: OrderInsertEvent,
): NewPickupOrder | null {
  const { id, fulfillment_type: fulfillmentType, public_number: number } =
    event.new;
  if (
    event.eventType !== "INSERT" ||
    fulfillmentType !== "pickup" ||
    typeof id !== "string" ||
    !id
  ) {
    return null;
  }

  return {
    id,
    number: typeof number === "string" ? number : null,
  };
}
