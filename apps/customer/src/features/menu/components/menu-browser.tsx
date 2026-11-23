"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { SectionHeading } from "@/components/ui/section-heading";
import type { MenuCategory, Product } from "../types";
import { CategoryTabs } from "./category-tabs";
import { ProductCard } from "./product-card";

interface MenuBrowserProps {
  categories: readonly MenuCategory[];
  products: readonly (Product & { formattedPrice: string })[];
}

export function MenuBrowser({ categories, products }: MenuBrowserProps) {
  const t = useTranslations("Home.menu");
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");
  const reduceMotion = useReducedMotion();

  const visibleProducts = useMemo(
    () =>
      activeCategory === "all"
        ? products
        : products.filter(
            (product) => product.categoryId === activeCategory,
          ),
    [activeCategory, products],
  );

  return (
    <section id="menu" aria-labelledby="menu-title" className="scroll-mt-24">
      <SectionHeading
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        id="menu-title"
      />

      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onChange={setActiveCategory}
      />

      <p
        className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400"
        aria-live="polite"
      >
        {t("results", { count: visibleProducts.length })}
      </p>

      <motion.ul layout className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {visibleProducts.map((product, index) => (
            <motion.li
              key={product.id}
              layout
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
              transition={{
                duration: 0.28,
                delay: reduceMotion ? 0 : Math.min(index * 0.035, 0.25),
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <ProductCard product={product} />
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>

      {visibleProducts.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line-strong bg-surface px-4 py-10 text-center text-sm font-semibold text-ink-500">
          {t("empty")}
        </p>
      ) : null}
    </section>
  );
}
