import Link from "next/link";
import { SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <main className="grid min-h-screen place-items-center bg-admin-canvas px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border bg-white p-7 text-center shadow-[0_12px_42px_rgba(16,24,40,0.06)] sm:p-9">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          <SearchX aria-hidden="true" size={22} />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-admin-muted">
          {t("description")}
        </p>
        <Link
          className="mt-6 inline-flex h-10 items-center rounded-lg bg-admin-orange px-4 text-sm font-semibold text-white hover:bg-orange-700"
          href="/"
        >
          {t("home")}
        </Link>
      </section>
    </main>
  );
}
