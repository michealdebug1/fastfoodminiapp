"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocaleAction } from "@/app/actions/locale";
import { LOCALES, type Locale } from "@/i18n/config";

export function LocaleSwitcher({
  className = "",
}: {
  className?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("LocaleSwitcher");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(nextLocale: Locale) {
    if (nextLocale === locale) return;

    startTransition(async () => {
      await setLocaleAction(nextLocale);
      router.refresh();
    });
  }

  return (
    <div
      aria-busy={isPending}
      aria-label={t("label")}
      className={`inline-flex items-center gap-0.5 rounded-lg border bg-white p-0.5 ${isPending ? "opacity-60" : ""} ${className}`}
      role="group"
    >
      {LOCALES.map((option) => {
        const active = option === locale;
        return (
          <button
            aria-pressed={active}
            className={`h-7 rounded-md px-2 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
              active
                ? "bg-admin-orange-soft text-admin-orange"
                : "text-admin-muted hover:bg-slate-50 hover:text-admin-ink"
            }`}
            disabled={isPending}
            key={option}
            onClick={() => handleChange(option)}
            title={t(option)}
            type="button"
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
