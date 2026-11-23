import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessArea,
  getStaffHomePath,
} from "../src/lib/auth/permissions.ts";

test("administrator can access every admin area", () => {
  for (const area of ["dashboard", "orders", "products", "settings", "account"]) {
    assert.equal(canAccessArea("administrator", area), true);
  }
});

test("manager can access dashboard, orders, products and settings", () => {
  for (const area of ["dashboard", "orders", "products", "settings", "account"]) {
    assert.equal(canAccessArea("manager", area), true);
  }
});

test("order processing staff can only access orders", () => {
  assert.equal(canAccessArea("order_staff", "orders"), true);
  assert.equal(canAccessArea("order_staff", "account"), true);
  for (const area of ["dashboard", "products", "settings"]) {
    assert.equal(canAccessArea("order_staff", area), false);
  }
});

test("staff home route is allowed for each role", () => {
  assert.equal(getStaffHomePath("administrator"), "/");
  assert.equal(getStaffHomePath("manager"), "/");
  assert.equal(getStaffHomePath("order_staff"), "/orders");
});
