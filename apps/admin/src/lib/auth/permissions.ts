import type { StaffRole } from "@food-platform/shared";

export const ADMIN_AREAS = [
  "dashboard",
  "orders",
  "products",
  "settings",
  "account",
] as const;

export type AdminArea = (typeof ADMIN_AREAS)[number];

const areaRoles: Record<AdminArea, readonly StaffRole[]> = {
  dashboard: ["administrator", "manager"],
  orders: ["administrator", "manager", "order_staff"],
  products: ["administrator", "manager"],
  settings: ["administrator", "manager"],
  account: ["administrator", "manager", "order_staff"],
} as const satisfies Record<AdminArea, readonly StaffRole[]>;

export function canAccessArea(role: StaffRole, area: AdminArea) {
  return areaRoles[area].includes(role);
}

export function getStaffHomePath(role: StaffRole) {
  return role === "order_staff" ? "/orders" : "/";
}
