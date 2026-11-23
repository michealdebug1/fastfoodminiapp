import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { Logo } from "@/components/ui/logo";
import { TelegramIdentityPanel } from "@/features/telegram/telegram-identity-panel";

export async function SiteHeader() {
  const t = await getTranslations("Header");

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-cream-100/90 backdrop-blur-md">
      <div className="safe-top">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Logo />

          <div className="flex items-center gap-2 sm:gap-3">
            <TelegramIdentityPanel />
            <span className="hidden items-center rounded-pill border border-line bg-surface px-3 py-1.5 text-[11px] font-bold text-ink-600 sm:inline-flex">
              {t("pickupLabel")}
            </span>
            <LocaleSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
