import { routing } from "@/i18n/routing";
import messages from "@/messages/uz.json";

/**
 * Strict, app-wide next-intl types. `Locale` is derived from the routing
 * configuration and `Messages` from the default catalog, so unknown keys and
 * invalid locales fail at compile time.
 */
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
