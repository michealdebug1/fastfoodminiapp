import { getTranslations } from "next-intl/server";

export default async function ShopLoading() {
  const t = await getTranslations("Loading");

  return (
    <main
      aria-busy="true"
      aria-label={t("label")}
      className="mx-auto max-w-6xl space-y-6 px-4 pb-8 pt-5 sm:px-6 lg:px-8 motion-safe:animate-[page-enter_180ms_ease-out_both]"
    >
      <div className="h-72 animate-pulse rounded-3xl bg-yellow-200/70 motion-reduce:animate-none sm:h-80" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            className="h-20 animate-pulse rounded-2xl bg-cream-200 motion-reduce:animate-none"
            key={item}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            className="h-64 animate-pulse rounded-2xl bg-cream-200 motion-reduce:animate-none"
            key={item}
          />
        ))}
      </div>
    </main>
  );
}
