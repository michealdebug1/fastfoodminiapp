import { Send } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { MenuCatalog } from "@/features/menu/types";

interface SiteFooterProps {
  restaurant: MenuCatalog["restaurant"];
}

export async function SiteFooter({ restaurant }: SiteFooterProps) {
  const t = await getTranslations("Home.footer");

  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pb-36 pt-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 border-t border-line pt-5 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between">
        <p className="inline-flex items-center gap-1.5 font-bold text-ink-600">
          <Send className="size-3.5 text-tomato-500" aria-hidden="true" />
          {t("madeFor")}
        </p>
        <p className="text-ink-400">
          {restaurant.address || t("addressUnavailable")} · {t("pickupOnly")}
        </p>
      </div>
    </footer>
  );
}
