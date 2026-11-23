"use client";

import { Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Product } from "@/features/menu/types";
import { formatUzs } from "@/lib/format-uzs";
import { QuantityStepper } from "./quantity-stepper";

interface CartLineItemProps {
  product: Product;
  line: {
    productId: string;
    optionValueIds: readonly string[];
    quantity: number;
    unitPriceUzs: number;
  };
  disabled?: boolean;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}

export function CartLineItem({
  product,
  line,
  disabled = false,
  onIncrease,
  onDecrease,
  onRemove,
}: CartLineItemProps) {
  const t = useTranslations("Cart");
  const tMenu = useTranslations("Menu");
  const locale = useLocale();

  const name = product.name || tMenu("unnamedProduct");
  const selectedIds = new Set(line.optionValueIds);
  const selectedOptions = product.options.flatMap((group) =>
    group.values.filter((value) => selectedIds.has(value.id)),
  );
  const price = (amount: number) => formatUzs(amount, locale);

  return (
    <li className="flex gap-3 py-3">
      <div
        className="grid size-16 shrink-0 place-items-center rounded-xl bg-cream-200 text-3xl ring-1 ring-line"
        aria-hidden="true"
      >
        🍽️
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-extrabold text-ink-900">
              {name}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-ink-400">
              {price(line.unitPriceUzs)}
            </p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            aria-label={t("remove", { name })}
            className="grid size-7 shrink-0 place-items-center rounded-full text-ink-400 transition-colors hover:bg-tomato-100 hover:text-tomato-600"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </button>
        </div>

        {selectedOptions.length > 0 ? (
          <ul className="mt-1 space-y-0.5 text-[10px] leading-4 text-ink-500">
            {selectedOptions.map((option) => (
              <li className="flex justify-between gap-2" key={option.id}>
                <span className="truncate">{option.name}</span>
                {option.priceDelta > 0 ? (
                  <span className="shrink-0">+{price(option.priceDelta)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <QuantityStepper
            quantity={line.quantity}
            onIncrease={onIncrease}
            onDecrease={onDecrease}
            increaseLabel={t("increase", { name })}
            decreaseLabel={t("decrease", { name })}
            disabled={disabled}
          />
          <span className="font-display text-sm font-black text-ink-900">
            {price(line.unitPriceUzs * line.quantity)}
          </span>
        </div>
      </div>
    </li>
  );
}
