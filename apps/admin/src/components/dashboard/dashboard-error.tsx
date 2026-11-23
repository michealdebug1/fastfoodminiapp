"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

export function DashboardError({ reset }: { reset: () => void }) {
  const t = useTranslations("Errors");

  return (
    <section
      aria-labelledby="dashboard-error-title"
      className="rounded-xl border border-admin-red/20 bg-white p-8 text-center"
      role="alert"
    >
      <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-admin-red-soft text-admin-red">
        <AlertTriangle aria-hidden="true" size={18} />
      </span>
      <h2
        className="mt-4 text-base font-semibold"
        id="dashboard-error-title"
      >
        {t("workspaceTitle")}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-5 text-admin-muted">
        {t("workspaceDescription")}
      </p>
      <button
        className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-admin-ink px-3 text-xs font-semibold text-white hover:bg-slate-800"
        onClick={reset}
        type="button"
      >
        <RotateCcw aria-hidden="true" size={14} />
        {t("retry")}
      </button>
    </section>
  );
}
