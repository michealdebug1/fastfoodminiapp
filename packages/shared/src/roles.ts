export const STAFF_ROLES = [
  "administrator",
  "manager",
  "order_staff",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];
