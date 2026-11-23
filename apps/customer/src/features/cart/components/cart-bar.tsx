"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatUzs } from "@/lib/format-uzs";
import { useCart } from "../use-cart";

interface CartBarProps {
  onOpen: () => void;
}

export function CartBar({ onOpen }: CartBarProps) {
  const t = useTranslations("Cart");
  const locale = useLocale();
  const reduceMotion = useReducedMotion();
  const { itemCount, subtotalUzs, isHydrated } = useCart();

  const total = formatUzs(subtotalUzs, locale);

  return (
    <AnimatePresence>
      {isHydrated && itemCount > 0 ? (
        <motion.div
          key="cart-bar"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: 18 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 px-4"
        >
          <button
            type="button"
            onClick={onOpen}
            aria-haspopup="dialog"
            aria-label={t("barLabel", { count: itemCount, total })}
            className="mx-auto flex w-full max-w-md items-center gap-3 rounded-pill bg-ink-900 py-2.5 pl-2.5 pr-3.5 text-cream-50 shadow-float ring-1 ring-white/10 transition-transform active:scale-[0.99]"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-yellow-400 font-display text-sm font-black text-ink-900">
              {itemCount}
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-sm font-extrabold leading-tight">
                {t("viewCart")}
              </span>
              <span className="mt-0.5 block text-[10px] font-semibold text-cream-200/60">
                {t("count", { count: itemCount })}
              </span>
            </span>
            <span className="font-display text-base font-black">{total}</span>
            <ChevronRight className="size-4 text-cream-200/70" aria-hidden="true" />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
