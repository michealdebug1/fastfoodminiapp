import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { CartProvider } from "@/features/cart/cart-provider";
import { ShopNavigation } from "@/features/cart/components/shop-navigation";
import { getMenuCatalog } from "@/features/menu/services/menu-service";
import { TelegramBootstrap } from "@/features/telegram/telegram-bootstrap";
import type { Locale } from "@/i18n/routing";

export default async function ShopLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: routeLocale } = await params;
  if (routeLocale !== "uz" && routeLocale !== "ru") {
    throw new Error("Unsupported storefront locale.");
  }
  const locale: Locale = routeLocale;
  const catalog = await getMenuCatalog(locale);
  const validProductIds = catalog.products.map((product) => product.id);

  return (
    <CartProvider validProductIds={validProductIds}>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter restaurant={catalog.restaurant} />
        <ShopNavigation
          products={catalog.products}
          restaurant={catalog.restaurant}
        />
        <TelegramBootstrap />
      </div>
    </CartProvider>
  );
}
