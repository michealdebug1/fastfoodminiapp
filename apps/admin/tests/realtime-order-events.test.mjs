import assert from "node:assert/strict";
import test from "node:test";
import { getNewPickupOrder } from "../src/lib/realtime/order-events.ts";

test("new pickup-order inserts produce a notification payload", () => {
  assert.deepEqual(
    getNewPickupOrder({
      eventType: "INSERT",
      new: {
        id: "order-id",
        public_number: "1042",
        fulfillment_type: "pickup",
      },
    }),
    { id: "order-id", number: "1042" },
  );
});

test("delivery, updates, and malformed inserts do not produce notifications", () => {
  assert.equal(
    getNewPickupOrder({
      eventType: "INSERT",
      new: { id: "delivery-id", fulfillment_type: "delivery" },
    }),
    null,
  );
  assert.equal(
    getNewPickupOrder({
      eventType: "UPDATE",
      new: { id: "updated-id", fulfillment_type: "pickup" },
    }),
    null,
  );
  assert.equal(
    getNewPickupOrder({
      eventType: "INSERT",
      new: { fulfillment_type: "pickup" },
    }),
    null,
  );
});
