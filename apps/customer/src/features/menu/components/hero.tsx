import { ArrowDown, Banknote, ShoppingBag } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonStyles } from "@/components/ui/button";

/**
 * Storefront hero. Server-rendered: no client JavaScript beyond the anchor.
 */
export async function Hero() {
  const t = await getTranslations("Home.hero");

  return (
    <section className="relative overflow-hidden rounded-3xl bg-yellow-300 shadow-card ring-1 ring-ink-900/5">
      <div
        className="bg-dot-grid absolute inset-0 opacity-[0.18]"
        aria-hidden="true"
      />
      <div
        className="absolute -right-24 -top-24 size-72 rounded-full bg-tomato-400/30 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-28 -left-20 size-64 rounded-full bg-cream-50/50 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-6">
        <div>
          <span className="inline-flex items-center gap-2 rounded-pill bg-cream-50/75 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-700 ring-1 ring-ink-900/5">
            <span
              className="size-1.5 rounded-full bg-basil-500"
              aria-hidden="true"
            />
            {t("eyebrow")}
          </span>

          <h1 className="mt-4 whitespace-pre-line text-[2.6rem] font-black leading-[0.94] sm:text-6xl">
            {t("title")}
          </h1>

          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-700 sm:text-base">
            {t("description")}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="#menu"
              className={buttonStyles({ variant: "dark", size: "lg" })}
            >
              {t("cta")}
              <ArrowDown className="size-4" aria-hidden="true" />
            </a>
            <span className="inline-flex items-center gap-2 rounded-pill bg-cream-50/70 px-3.5 py-2 text-xs font-bold text-ink-700 ring-1 ring-ink-900/5">
              <ShoppingBag className="size-4 text-basil-600" aria-hidden="true" />
              {t("pickup")}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold text-ink-600">
            <span className="inline-flex items-center gap-1.5">
              <Banknote className="size-4" aria-hidden="true" />
              {t("paymentAtRestaurant")}
            </span>
          </div>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[18rem] sm:max-w-[21rem]">
          <div
            className="absolute inset-5 rounded-full bg-cream-50/85 shadow-float ring-1 ring-ink-900/5"
            aria-hidden="true"
          />
          <div
            className="absolute inset-9 rounded-full border-2 border-dashed border-ink-900/10"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 grid place-items-center text-[6.5rem] drop-shadow-[0_18px_18px_rgba(36,26,18,0.22)] sm:text-[8rem]"
            aria-hidden="true"
          >
            🍔
          </div>
          <div className="absolute left-0 top-6 -rotate-6 rounded-2xl bg-tomato-500 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-white shadow-float">
            {t("heroBadge")}
          </div>
          <div className="absolute -right-1 bottom-8 rotate-6 rounded-2xl bg-ink-900 px-3 py-2 text-xs font-black text-cream-50 shadow-float">
            {t("heroBadge")}
          </div>
        </div>
      </div>
    </section>
  );
}
