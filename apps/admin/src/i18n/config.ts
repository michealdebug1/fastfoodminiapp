import type { Locale } from "@food-platform/shared";

export const LOCALES = ["uz", "ru"] as const satisfies readonly Locale[];
export const DEFAULT_LOCALE: Locale = "uz";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export type { Locale };

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && LOCALES.includes(value as (typeof LOCALES)[number])
  );
}

export function resolveLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
