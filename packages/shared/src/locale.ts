export const SUPPORTED_LOCALES = ["uz", "ru"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type CurrencyCode = "UZS";
