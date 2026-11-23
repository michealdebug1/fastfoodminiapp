import { defineRouting } from "next-intl/routing";

/**
 * Locale-based routing. Uzbek is the default and is served without a prefix
 * (`/`), while Russian lives at `/ru`. Detection uses the `NEXT_LOCALE` cookie
 * and the browser's Accept-Language header; Telegram's language can be wired
 * into the same cookie later.
 */
export const routing = defineRouting({
  locales: ["uz", "ru"],
  defaultLocale: "uz",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
