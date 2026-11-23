"use client";

import { RefreshCw } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";

export function OrderStatusRefresh({
  label,
  refreshingLabel,
}: {
  label: string;
  refreshingLabel: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line bg-white px-3 text-xs font-bold text-ink-700 transition-colors hover:bg-cream-100 disabled:opacity-60"
      disabled={isPending}
      onClick={() => startTransition(() => router.refresh())}
      type="button"
    >
      <RefreshCw
        aria-hidden="true"
        className={isPending ? "size-3.5 animate-spin motion-reduce:animate-none" : "size-3.5"}
      />
      {isPending ? refreshingLabel : label}
    </button>
  );
}
