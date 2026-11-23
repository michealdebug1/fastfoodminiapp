"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("LocaleSwitcher");
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(nextLocale: Locale) {
    if (nextLocale === locale) return;

    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <div
      role="group"
      aria-label={t("label")}
      aria-busy={isPending}
      className={cn(
        "flex items-center gap-0.5 rounded-pill border border-line bg-surface p-0.5 shadow-soft transition-opacity",
        isPending && "opacity-60",
      )}
    >
      {routing.locales.map((option) => {
        const isActive = option === locale;

        return (
          <button
            key={option}
            type="button"
            lang={option}
            aria-label={t(option)}
            aria-pressed={isActive}
            onClick={() => handleChange(option)}
            className={cn(
              "rounded-pill px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide transition-colors",
              isActive
                ? "bg-ink-900 text-cream-50"
                : "text-ink-500 hover:text-ink-900",
            )}
          >
            {option.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
