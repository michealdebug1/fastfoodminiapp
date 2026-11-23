import { LOCALES } from "@/i18n/config";
import messages from "@/messages/uz.json";

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof LOCALES)[number];
    Messages: typeof messages;
  }
}
