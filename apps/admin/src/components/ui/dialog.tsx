"use client";

import type { ReactNode } from "react";
import { useEffect, useId } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

export function Dialog({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const t = useTranslations("Common");
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl border bg-white p-5 shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold" id={titleId}>
              {title}
            </h2>
            {description && (
              <p
                className="mt-1 text-sm text-admin-muted"
                id={descriptionId}
              >
                {description}
              </p>
            )}
          </div>
          <button
            aria-label={t("closeDialog")}
            className="flex size-8 items-center justify-center rounded-lg text-admin-muted hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={17} />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </section>
    </div>
  );
}
