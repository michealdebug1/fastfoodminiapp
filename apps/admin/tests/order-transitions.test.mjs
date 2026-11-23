import assert from "node:assert/strict";
import test from "node:test";
import { getNextOrderStatuses } from "../../../packages/shared/src/order.ts";

test("pending and in-progress orders expose only database-allowed transitions", () => {
  assert.deepEqual(getNextOrderStatuses("pending", "delivery"), [
    "confirmed",
    "cancelled",
  ]);
  assert.deepEqual(getNextOrderStatuses("confirmed", "pickup"), [
    "preparing",
    "cancelled",
  ]);
  assert.deepEqual(getNextOrderStatuses("preparing", "delivery"), [
    "ready",
    "cancelled",
  ]);
  assert.deepEqual(getNextOrderStatuses("preparing", "pickup"), [
    "ready_for_pickup",
    "cancelled",
  ]);
});

test("legacy ready orders and pickup-ready orders use their valid next steps", () => {
  assert.deepEqual(getNextOrderStatuses("ready", "delivery"), [
    "out_for_delivery",
    "cancelled",
  ]);
  assert.deepEqual(getNextOrderStatuses("ready", "pickup"), [
    "delivered",
    "cancelled",
  ]);
  assert.deepEqual(getNextOrderStatuses("ready_for_pickup", "pickup"), [
    "completed",
    "cancelled",
  ]);
});

test("terminal order states cannot transition again", () => {
  assert.deepEqual(getNextOrderStatuses("delivered", "delivery"), []);
  assert.deepEqual(getNextOrderStatuses("completed", "pickup"), []);
  assert.deepEqual(getNextOrderStatuses("cancelled", "pickup"), []);
});
