import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/config";
import { PageHeading } from "@/components/page-heading";
import { ProductForm } from "@/components/products/product-form";
import { Button } from "@/components/ui/button";
import { requireAdminArea } from "@/lib/auth/access";
import { localizedValue } from "@/lib/management/product-contracts";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("ProductForm");
  return { title: t("createProduct") };
}

export default async function NewProductPage() {
  const t = await getTranslations("ProductForm");
  const tProducts = await getTranslations("Products");
  const locale = resolveLocale(await getLocale());
  const supabase = await createClient();
  const staff = await requireAdminArea("products", supabase);
  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, name")
    .eq("restaurant_id", staff.restaurantId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("display_order", { ascending: true });

  if (error) {
    throw new Error("Unable to load categories for the product form", {
      cause: error,
    });
  }

  return (
    <>
      <PageHeading
        description={t("createDescription")}
        eyebrow={tProducts("eyebrow")}
        title={t("createProduct")}
        action={
          <Link href="/products">
            <Button>{t("backToProducts")}</Button>
          </Link>
        }
      />
      <ProductForm
        categories={(categories ?? []).map((category) => ({
          id: category.id,
          name:
            localizedValue(category.name, locale) ||
            tProducts("unnamedCategory"),
        }))}
        optionGroups={[]}
      />
    </>
  );
}
