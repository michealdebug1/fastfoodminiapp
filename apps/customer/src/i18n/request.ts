import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";
import { restaurant } from "@/config/restaurant";
import { routing } from "./routing";

/**
 * Resolves the active locale for every server request and loads the matching
 * message catalog. `next/root-params` (Next.js 16.3+) keeps locale routes
 * statically renderable without the legacy `setRequestLocale` calls.
 */
export default getRequestConfig(async ({ locale }) => {
  const requestedLocale = locale ?? (await rootParams.locale());

  if (!hasLocale(routing.locales, requestedLocale)) {
    notFound();
  }

  return {
    locale: requestedLocale,
    messages: (await import(`../messages/${requestedLocale}.json`)).default,
    timeZone: restaurant.timeZone,
  };
});
