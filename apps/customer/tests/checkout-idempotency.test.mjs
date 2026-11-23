import assert from "node:assert/strict";
import test from "node:test";
import {
  clearIdempotencyKey,
  getIdempotencyKey,
} from "../src/features/cart/lib/idempotency-key.ts";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    values,
  };
}

test("checkout idempotency key persists and is reused for the same cart", () => {
  const storage = createStorage();
  const fallback = new Map();
  const first = getIdempotencyKey("cart-a", storage, fallback, () => "key-a");
  const second = getIdempotencyKey("cart-a", storage, fallback, () => "key-b");

  assert.deepEqual(first, { key: "key-a", storageAvailable: true });
  assert.deepEqual(second, { key: "key-a", storageAvailable: true });
  assert.equal(clearIdempotencyKey("cart-a", storage, fallback), true);
  assert.equal(storage.values.size, 0);
});

test("checkout retries remain idempotent when browser storage throws", () => {
  const blockedStorage = {
    getItem() {
      throw new Error("storage blocked");
    },
    setItem() {
      throw new Error("storage blocked");
    },
    removeItem() {
      throw new Error("storage blocked");
    },
  };
  const fallback = new Map();
  const first = getIdempotencyKey(
    "cart-a",
    blockedStorage,
    fallback,
    () => "volatile-key",
  );
  const retry = getIdempotencyKey(
    "cart-a",
    blockedStorage,
    fallback,
    () => "unexpected-key",
  );

  assert.deepEqual(first, {
    key: "volatile-key",
    storageAvailable: false,
  });
  assert.deepEqual(retry, {
    key: "volatile-key",
    storageAvailable: false,
  });
  assert.equal(clearIdempotencyKey("cart-a", blockedStorage, fallback), false);
});

test("a changed cart gets a new idempotency key", () => {
  const storage = createStorage();
  const fallback = new Map();
  const first = getIdempotencyKey("cart-a", storage, fallback, () => "key-a");
  const second = getIdempotencyKey("cart-b", storage, fallback, () => "key-b");
  const retryFirst = getIdempotencyKey(
    "cart-a",
    storage,
    fallback,
    () => "unexpected-key",
  );

  assert.equal(first.key, "key-a");
  assert.equal(second.key, "key-b");
  assert.equal(retryFirst.key, "key-a");
});
