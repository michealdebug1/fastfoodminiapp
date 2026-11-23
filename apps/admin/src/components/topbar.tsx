"use client";

import { Bell, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import type { StaffRole } from "@food-platform/shared";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";

export function Topbar({
  email,
  restaurantName,
  role,
  title,
}: {
  email: string | null;
  restaurantName: string;
  role: StaffRole;
  title: string;
}) {
  const t = useTranslations("Shell");
  const tn = useTranslations("Navigation");
  const tRoles = useTranslations("Roles");

  return (
    <header className="sticky top-0 z-30 hidden h-[72px] items-center justify-between border-b bg-white/95 px-6 backdrop-blur lg:flex lg:px-9">
      <div>
        <p className="text-[11px] font-medium text-admin-muted">
          {tn("workspace")} <span className="px-1 text-slate-300">/</span>{" "}
          {title}
        </p>
        <h1 className="mt-0.5 text-[15px] font-semibold tracking-tight">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <button
          aria-label={t("searchSoon")}
          className="flex h-9 w-[190px] items-center gap-2 rounded-lg border bg-slate-50 px-3 text-xs text-slate-400"
          disabled
          type="button"
        >
          <Search aria-hidden="true" size={15} />
          <span>{t("search")}</span>
          <span className="ml-auto rounded border bg-white px-1.5 py-0.5 text-[10px]">
            ⌘ K
          </span>
        </button>
        <LocaleSwitcher />
        <button
          aria-label={t("notificationsSoon")}
          className="relative flex size-9 items-center justify-center rounded-lg border text-slate-500"
          disabled
          type="button"
        >
          <Bell aria-hidden="true" size={17} />
        </button>
        <div className="ml-1 flex items-center gap-2 border-l pl-4">
          <div
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold uppercase text-slate-600"
          >
            {email?.slice(0, 1) ?? "S"}
          </div>
          <div className="hidden xl:block">
            <p className="max-w-40 truncate text-xs font-semibold">{email}</p>
            <p className="max-w-40 truncate text-[10px] text-admin-muted">
              {restaurantName} · {tRoles(role)}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
