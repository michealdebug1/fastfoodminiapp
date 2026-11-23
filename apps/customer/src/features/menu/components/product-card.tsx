"use client";

import { Check, Plus, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/features/cart/use-cart";
import { cn } from "@/lib/cn";
import { formatUzs } from "@/lib/format-uzs";
import type { Product } from "../types";
import { ProductOptionsDialog } from "./product-options-dialog";
import { ProductVisual } from "./product-visual";

interface ProductCardProps {
  product: Product & { formattedPrice: string };
}

export function ProductCard({ product }: ProductCardProps) {
  const t = useTranslations("Menu");
  const locale = useLocale();
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) {
        window.clearTimeout(resetTimer.current);
      }
    };
  }, []);

  function showAddedFeedback() {
    setJustAdded(true);
    if (resetTimer.current !== null) {
      window.clearTimeout(resetTimer.current);
    }
    resetTimer.current = window.setTimeout(() => setJustAdded(false), 1400);
  }

  function handleAdd() {
    if (product.options.length > 0) {
      setOptionsOpen(true);
      return;
    }
    addItem(product, [], []);
    showAddedFeedback();
  }

  function handleAddWithOptions(
    optionValueIds: readonly string[],
    selectedValues: Product["options"][number]["values"],
  ) {
    addItem(product, optionValueIds, selectedValues);
    setOptionsOpen(false);
    showAddedFeedback();
  }

  return (
    <>
      <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-card motion-reduce:transform-none motion-reduce:transition-none">
        <div className="relative">
          <ProductVisual
            accent={product.accent}
            emoji="🍽️"
            imageAlt={product.name}
            imageUrl={product.imageUrl}
          />
          {product.isFeatured ? (
            <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-pill bg-yellow-300 px-2 py-1 text-[10px] font-black text-ink-900 shadow-soft">
              <Star className="size-3 fill-current" aria-hidden="true" />
              {t("featured")}
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-3.5">
          <h3 className="font-display text-[15px] font-extrabold leading-tight text-ink-900">
            {product.name}
          </h3>
          {product.description ? (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-500">
              {product.description}
            </p>
          ) : null}

          <div className="mt-auto flex items-center justify-between gap-2 pt-3">
            <span className="font-display text-lg font-black text-ink-900">
              {product.formattedPrice}
            </span>
            <button
              type="button"
              onClick={handleAdd}
              aria-label={t("addToCart", { name: product.name })}
              aria-haspopup={product.options.length ? "dialog" : undefined}
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-full text-cream-50 shadow-soft transition duration-200 active:scale-95 motion-reduce:transition-none",
                justAdded
                  ? "bg-basil-500 hover:bg-basil-600"
                  : "bg-ink-900 hover:bg-tomato-500",
              )}
            >
              {justAdded ? (
                <Check
                  className="size-4"
                  strokeWidth={3}
                  aria-hidden="true"
                  key="added"
                />
              ) : (
                <Plus className="size-4" strokeWidth={3} aria-hidden="true" />
              )}
            </button>
            <span className="sr-only" role="status">
              {justAdded ? t("added") : ""}
            </span>
          </div>
        </div>
      </article>
      <ProductOptionsDialog
        open={optionsOpen}
        product={product}
        formatPrice={(amount) => formatUzs(amount, locale)}
        onAdd={handleAddWithOptions}
        onClose={() => setOptionsOpen(false)}
      />
    </>
  );
}
