import { notFound } from "next/navigation";

/**
 * Catch-all for paths that do not match a real route inside a locale.
 *
 * next-intl rewrites unprefixed URLs to the default locale, so this also turns
 * paths such as `/en` or `/missing` into the localized 404 instead of Next's
 * built-in English error page.
 */
export default function CatchAllPage() {
  notFound();
}
