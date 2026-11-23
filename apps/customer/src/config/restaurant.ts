/**
 * Single-restaurant configuration. Everything that identifies the business
 * lives here; translated copy lives in `src/messages`.
 */
export const restaurant = {
  name: "Bun Run",
  currency: "UZS",
  timeZone: "Asia/Tashkent",
} as const;

export type CurrencyCode = typeof restaurant.currency;
