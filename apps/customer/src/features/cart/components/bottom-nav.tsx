"use client";

import { Info, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useCart } from "../use-cart";

interface BottomNavProps {
  onOpenCart: () => void;
}

const itemStyles =
  "relative flex flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2 text-[10px] font-extrabold uppercase tracking-[0.08em] transition-colors";

export function BottomNav({ onOpenCart }: BottomNavProps) {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const { itemCount, isHydrated } = useCart();

  const isMenuActive = pathname === "/";
  const isAboutActive = pathname === "/about";

  return (
    <nav
      aria-label={t("primaryLabel")}
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2"
    >
      <div className="mx-auto grid max-w-md grid-cols-3 gap-1 rounded-3xl border border-line bg-surface/95 p-1.5 shadow-float backdrop-blur-md">
        <Link
          href="/"
          aria-current={isMenuActive ? "page" : undefined}
          className={cn(
            itemStyles,
            isMenuActive
              ? "bg-yellow-400 text-ink-900"
              : "text-ink-500 hover:bg-cream-200 hover:text-ink-900",
          )}
        >
          <UtensilsCrossed className="size-5" aria-hidden="true" />
          {t("menu")}
        </Link>

        <button
          type="button"
          onClick={onOpenCart}
          aria-haspopup="dialog"
          aria-label={
            isHydrated && itemCount > 0
              ? t("cartWithCount", { count: itemCount })
              : t("openCart")
          }
          className={cn(itemStyles, "text-ink-500 hover:bg-cream-200 hover:text-ink-900")}
        >
          <span className="relative">
            <ShoppingBag className="size-5" aria-hidden="true" />
            {isHydrated && itemCount > 0 ? (
              <span className="absolute -right-2 -top-1.5 grid min-w-4 place-items-center rounded-full bg-tomato-500 px-1 py-0.5 text-[9px] font-black leading-none text-white">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            ) : null}
          </span>
          {t("cart")}
        </button>

        <Link
          href="/about"
          aria-current={isAboutActive ? "page" : undefined}
          className={cn(
            itemStyles,
            isAboutActive
              ? "bg-yellow-400 text-ink-900"
              : "text-ink-500 hover:bg-cream-200 hover:text-ink-900",
          )}
        >
          <Info className="size-5" aria-hidden="true" />
          {t("about")}
        </Link>
      </div>
    </nav>
  );
}
