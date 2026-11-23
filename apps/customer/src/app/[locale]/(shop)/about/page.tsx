import {
  ArrowLeft,
  Clock3,
  CookingPot,
  MapPin,
  Phone,
  ShoppingBag,
  Sparkles,
  Utensils,
} from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getMenuCatalog } from "@/features/menu/services/menu-service";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("About");
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

const benefits = [
  { key: "fresh", icon: CookingPot, tone: "bg-yellow-100 text-ink-900" },
  { key: "quick", icon: ShoppingBag, tone: "bg-tomato-100 text-tomato-700" },
  { key: "care", icon: Sparkles, tone: "bg-basil-100 text-basil-600" },
] as const;

const specialties = ["burgers", "chicken", "sides", "drinks"] as const;
const weekdays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

interface AboutPageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function AboutPage({ params }: AboutPageProps) {
  const [{ locale }, t] = await Promise.all([params, getTranslations("About")]);
  const catalog = await getMenuCatalog(locale);
  const { restaurant } = catalog;
  const workingHours = isRecord(restaurant.workingHours)
    ? restaurant.workingHours
    : {};
  const schedule = weekdays.flatMap((day) => {
    const value = workingHours[day];
    if (
      !isRecord(value) ||
      typeof value.open !== "string" ||
      typeof value.close !== "string"
    ) {
      return [];
    }

    return [{ day: t(`days.${day}`), hours: `${value.open}–${value.close}` }];
  });

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 pb-36 pt-5 sm:px-6 sm:pt-8 motion-safe:animate-[page-enter_250ms_ease-out_both]">
      <Link
        href="/"
        className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-extrabold text-ink-600 transition-colors hover:bg-cream-200 hover:text-ink-900"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("backToMenu")}
      </Link>

      <section className="relative isolate overflow-hidden rounded-[2rem] border border-line bg-yellow-300 px-5 py-7 shadow-card sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-12 -top-16 -z-10 size-56 rounded-full border-[28px] border-white/25" />
        <div className="pointer-events-none absolute -bottom-20 right-24 -z-10 size-40 rounded-full bg-tomato-500/10" />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/75 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-ink-700">
          <Utensils className="size-3.5" aria-hidden="true" />
          {t("eyebrow")}
        </span>
        <h1 className="mt-4 max-w-2xl whitespace-pre-line font-display text-3xl font-black leading-[1.05] tracking-tight text-ink-900 sm:text-5xl">
          {t("title", { name: restaurant.name })}
        </h1>
        <p className="mt-4 max-w-xl text-sm font-medium leading-6 text-ink-700 sm:text-base sm:leading-7">
          {t("intro", { name: restaurant.name })}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-ink-900 px-5 text-sm font-black text-white shadow-soft transition-transform hover:-translate-y-0.5 active:translate-y-0"
        >
          {t("exploreMenu")}
        </Link>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-tomato-600">
            {t("specialtiesEyebrow")}
          </p>
          <h2 className="mt-1 font-display text-2xl font-black text-ink-900">
            {t("specialtiesTitle")}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {specialties.map((key, index) => (
            <div
              key={key}
              className={`rounded-2xl border border-line p-4 shadow-soft ${index % 2 === 0 ? "bg-surface" : "bg-cream-200/70"}`}
            >
              <span className="grid size-10 place-items-center rounded-xl bg-yellow-300 text-2xl" aria-hidden="true">
                {(["🍔", "🍗", "🍟", "🥤"] as const)[index]}
              </span>
              <p className="mt-3 text-sm font-black text-ink-900">{t(`specialties.${key}`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-tomato-600">
            {t("whyEyebrow")}
          </p>
          <h2 className="mt-1 font-display text-2xl font-black text-ink-900">
            {t("whyTitle")}
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {benefits.map(({ key, icon: Icon, tone }) => (
            <article key={key} className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
              <span className={`grid size-11 place-items-center rounded-xl ${tone}`}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-3 font-display text-base font-black text-ink-900">{t(`benefits.${key}.title`)}</h3>
              <p className="mt-1.5 text-xs leading-5 text-ink-500">{t(`benefits.${key}.description`)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
          <span className="grid size-10 place-items-center rounded-xl bg-yellow-100 text-ink-900">
            <Clock3 className="size-5" aria-hidden="true" />
          </span>
          <h2 className="mt-3 font-display text-lg font-black text-ink-900">{t("hoursTitle")}</h2>
          {schedule.length > 0 ? (
            <ul className="mt-3 space-y-1.5 text-sm text-ink-600">
              {schedule.map(({ day, hours }) => (
                <li key={day} className="flex justify-between gap-3">
                  <span>{day}</span>
                  <span className="font-bold">{hours}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-500">
              {t("workingHoursUnavailable")}
            </p>
          )}
        </article>

        <article className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
          <span className="grid size-10 place-items-center rounded-xl bg-tomato-100 text-tomato-700">
            <MapPin className="size-5" aria-hidden="true" />
          </span>
          <h2 className="mt-3 font-display text-lg font-black text-ink-900">{t("locationTitle")}</h2>
          <p className="mt-1 text-sm leading-6 text-ink-500">
            {restaurant.address || t("locationUnavailable")}
          </p>
          <p className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-ink-600">
            <Phone className="size-3.5" aria-hidden="true" />
            {restaurant.phone ? (
              <a href={`tel:${restaurant.phone}`} className="hover:underline">
                {restaurant.phone}
              </a>
            ) : (
              t("contactUnavailable")
            )}
          </p>
        </article>
      </section>
    </div>
  );
}
