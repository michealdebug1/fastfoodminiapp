"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import type { DashboardPeriod } from "@/lib/dashboard/data";

export function DashboardControls({
  period,
}: {
  period: DashboardPeriod;
}) {
  const router = useRouter();
  const t = useTranslations("Dashboard");
  const [pending, startTransition] = useTransition();

  function changePeriod(nextPeriod: DashboardPeriod) {
    if (nextPeriod === period) return;

    startTransition(() => {
      router.push(`/?period=${nextPeriod}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        aria-label={t("rangeLabel")}
        className="inline-flex rounded-lg border bg-white p-1"
        role="group"
      >
        {(["daily", "weekly"] as const).map((range) => (
          <button
            aria-pressed={period === range}
            className={`h-8 rounded-md px-3 text-xs font-semibold transition ${
              period === range
                ? "bg-admin-orange-soft text-admin-orange"
                : "text-slate-500 hover:bg-slate-50"
            }`}
            disabled={pending}
            key={range}
            onClick={() => changePeriod(range)}
            type="button"
          >
            {range === "daily" ? t("rangeDaily") : t("rangeWeekly")}
          </button>
        ))}
      </div>
      <button
        aria-label={t("refreshLabel")}
        className="inline-flex h-10 items-center gap-2 rounded-lg border bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
        disabled={pending}
        onClick={() =>
          startTransition(() => {
            router.refresh();
          })
        }
        type="button"
      >
        <RefreshCw
          aria-hidden="true"
          className={pending ? "animate-spin" : ""}
          size={15}
        />
        <span className="hidden sm:inline">
          {pending ? t("refreshing") : t("refresh")}
        </span>
      </button>
    </div>
  );
}
