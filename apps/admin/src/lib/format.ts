import type { Locale } from "@/i18n/config";

function intlLocale(locale: Locale) {
  return locale === "ru" ? "ru-RU" : "uz-UZ";
}

export function formatUzs(
  value: string | number | bigint,
  locale: Locale = "uz",
) {
  const amount = typeof value === "bigint" ? value : BigInt(value);

  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "UZS",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number, locale: Locale = "uz") {
  return new Intl.NumberFormat(intlLocale(locale)).format(value);
}

export function formatDateTime(value: string, locale: Locale = "uz") {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tashkent",
  }).format(new Date(value));
}

export function formatDate(value: string, locale: Locale = "uz") {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: "medium",
    timeZone: "Asia/Tashkent",
  }).format(new Date(value));
}

export function formatTime(value: string | Date, locale: Locale = "uz") {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tashkent",
  }).format(new Date(value));
}

export function formatShortDateTime(
  value: string | Date,
  locale: Locale = "uz",
) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tashkent",
  }).format(new Date(value));
}

export function getElapsedMinutes(from: string | Date, now: Date = new Date()) {
  return Math.max(
    0,
    Math.floor((now.getTime() - new Date(from).getTime()) / 60_000),
  );
}

export function formatShortDateLabel(
  value: string,
  period: "daily" | "weekly",
  locale: Locale = "uz",
) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    ...(period === "daily"
      ? { weekday: "short", day: "numeric" }
      : { month: "short", day: "numeric" }),
    timeZone: "Asia/Tashkent",
  }).format(new Date(`${value}T12:00:00+05:00`));
}
