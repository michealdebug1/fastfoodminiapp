import { Compass } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonStyles } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-3xl bg-yellow-300 text-ink-900 shadow-soft">
        <Compass className="size-7" aria-hidden="true" />
      </span>
      <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-tomato-600">
        {t("eyebrow")}
      </p>
      <h1 className="mt-1 text-3xl font-black">{t("title")}</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">
        {t("description")}
      </p>
      <Link
        href="/"
        className={buttonStyles({
          variant: "dark",
          size: "md",
          className: "mt-6",
        })}
      >
        {t("cta")}
      </Link>
    </div>
  );
}
