import { Banknote, ShoppingBag, Sparkles, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

interface Perk {
  key: "pickup" | "payment" | "status";
  icon: LucideIcon;
  title: string;
  description: string;
}

export async function PerksStrip() {
  const t = await getTranslations("Home.perks");

  const perks: readonly Perk[] = [
    {
      key: "pickup",
      icon: ShoppingBag,
      title: t("pickup.title"),
      description: t("pickup.description"),
    },
    {
      key: "payment",
      icon: Banknote,
      title: t("payment.title"),
      description: t("payment.description"),
    },
    {
      key: "status",
      icon: Sparkles,
      title: t("status.title"),
      description: t("status.description"),
    },
  ];

  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {perks.map((perk) => {
        const Icon = perk.icon;

        return (
          <li
            key={perk.key}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-soft"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cream-200 text-ink-800">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm font-extrabold text-ink-900">
                {perk.title}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-ink-500">
                {perk.description}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
