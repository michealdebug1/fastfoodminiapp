import { Hero } from "@/features/menu/components/hero";
import { MenuBrowser } from "@/features/menu/components/menu-browser";
import { PerksStrip } from "@/features/menu/components/perks-strip";
import { getMenuCatalog } from "@/features/menu/services/menu-service";
import { formatUzs } from "@/lib/format-uzs";

export default async function ShopPage({
  params,
}: {
  params: Promise<{ locale: "uz" | "ru" }>;
}) {
  const { locale } = await params;
  const catalog = await getMenuCatalog(locale);
  const products = catalog.products.map((product) => ({
    ...product,
    formattedPrice: formatUzs(product.priceUzs, locale),
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-7 px-4 pb-8 pt-5 sm:px-6 lg:px-8 motion-safe:animate-[page-enter_250ms_ease-out_both]">
      <Hero />
      <PerksStrip />
      <MenuBrowser
        categories={catalog.categories}
        products={products}
      />
    </div>
  );
}
