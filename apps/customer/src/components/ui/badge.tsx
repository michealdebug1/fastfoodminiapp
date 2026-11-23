import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "yellow" | "tomato" | "basil" | "neutral" | "ink";

const toneStyles: Record<BadgeTone, string> = {
  yellow: "bg-yellow-200 text-ink-900",
  tomato: "bg-tomato-500 text-white",
  basil: "bg-basil-100 text-basil-600",
  neutral: "bg-cream-200 text-ink-600",
  ink: "bg-ink-900 text-cream-50",
};

interface BadgeProps {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}

export function Badge({
  tone = "neutral",
  className,
  children,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em]",
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
