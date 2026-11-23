"use client";

import { UtensilsCrossed } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import type { MenuCategory } from "../types";

interface CategoryTabsProps {
  categories: readonly MenuCategory[];
  activeCategory: string | "all";
  onChange: (category: string | "all") => void;
}

export function CategoryTabs({
  categories,
  activeCategory,
  onChange,
}: CategoryTabsProps) {
  const tHome = useTranslations("Home.menu");
  const tabs = [
    { id: "all", label: tHome("all") },
    ...categories.map((category) => ({
      id: category.id,
      label: category.name,
    })),
  ];

  return (
    <div
      role="group"
      aria-label={tHome("categoriesLabel")}
      className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeCategory;

        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-2 rounded-pill border px-3.5 text-xs font-extrabold transition-colors duration-200",
              isActive
                ? "border-ink-900 bg-ink-900 text-cream-50 shadow-soft"
                : "border-line bg-surface text-ink-600 hover:border-line-strong hover:text-ink-900",
            )}
          >
            <UtensilsCrossed className="size-4" aria-hidden="true" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
