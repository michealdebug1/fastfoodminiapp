"use client";

import { Minus, Plus } from "lucide-react";
import { MAX_ITEM_QUANTITY } from "@/lib/constants";
import { cn } from "@/lib/cn";

interface QuantityStepperProps {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  increaseLabel: string;
  decreaseLabel: string;
  disabled?: boolean;
  className?: string;
}

export function QuantityStepper({
  quantity,
  onIncrease,
  onDecrease,
  increaseLabel,
  decreaseLabel,
  disabled = false,
  className,
}: QuantityStepperProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-pill border border-line bg-cream-100 p-0.5",
        className,
      )}
    >
      <button
        type="button"
        onClick={onDecrease}
        disabled={disabled || quantity <= 1}
        aria-label={decreaseLabel}
        className="grid size-7 place-items-center rounded-full text-ink-700 transition-colors hover:bg-cream-300 disabled:pointer-events-none disabled:opacity-40"
      >
        <Minus className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
      </button>
      <span
        className="min-w-6 text-center text-xs font-extrabold tabular-nums text-ink-900"
        aria-live="polite"
      >
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        disabled={disabled || quantity >= MAX_ITEM_QUANTITY}
        aria-label={increaseLabel}
        className="grid size-7 place-items-center rounded-full text-ink-700 transition-colors hover:bg-cream-300 disabled:pointer-events-none disabled:opacity-40"
      >
        <Plus className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
      </button>
    </div>
  );
}
