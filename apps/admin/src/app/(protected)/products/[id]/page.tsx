import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/config";
import { ArchiveProductButton } from "@/components/products/archive-product-button";
import { ProductForm } from "@/components/products/product-form";
import { RemoveProductImageButton } from "@/components/products/remove-product-image-button";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { requireAdminArea } from "@/lib/auth/access";
import {
  PRODUCT_IMAGE_BUCKET,
  localizedValue,
} from "@/lib/management/product-contracts";
import { createClient } from "@/lib/supabase/server";

type Localized = { uz: string; ru: string };

export async function generateMetadata() {
  const t = await getTranslations("ProductForm");
  return { title: t("editProduct") };
}

function localizedPair(value: unknown): Localized {
  return {
    uz: localizedValue(value, "uz"),
    ru: localizedValue(value, "ru"),
  };
}

export default async function ProductDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const locale = resolveLocale(await getLocale());
  const t = await getTranslations("ProductForm");
  const tProducts = await getTranslations("Products");
  const tActionMessages = await getTranslations("ProductActionMessages");
  const supabase = await createClient();
  const staff = await requireAdminArea("products", supabase);
  const [{ data: product, error: productError }, { data: categories, error: categoriesError }] =
    await Promise.all([
      supabase
        .from("products")
        .select(
          "id, name, description, price, category_id, is_available, is_featured, display_order, image_path",
        )
        .eq("id", id)
        .eq("restaurant_id", staff.restaurantId)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .from("categories")
        .select("id, name")
        .eq("restaurant_id", staff.restaurantId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("display_order", { ascending: true }),
    ]);

  if (productError) {
    throw new Error("Unable to load product details", { cause: productError });
  }
  if (categoriesError) {
    throw new Error("Unable to load product categories", {
      cause: categoriesError,
    });
  }
  if (!product) notFound();

  const { data: optionRows, error: optionError } = await supabase
    .from("product_options")
    .select("id, name, is_required, min_selections, max_selections")
    .eq("product_id", id)
    .eq("restaurant_id", staff.restaurantId)
    .is("deleted_at", null)
    .order("display_order", { ascending: true });
  if (optionError) {
    throw new Error("Unable to load product options", { cause: optionError });
  }

  const optionIds = (optionRows ?? []).map((option) => option.id);
  const { data: values, error: valuesError } = optionIds.length
    ? await supabase
        .from("product_option_values")
        .select("id, option_id, name, price_delta, is_available")
        .eq("restaurant_id", staff.restaurantId)
        .in("option_id", optionIds)
        .is("deleted_at", null)
        .order("display_order", { ascending: true })
    : { data: [], error: null };
  if (valuesError) {
    throw new Error("Unable to load product extras", { cause: valuesError });
  }

  const imageUrl = product.image_path
    ? supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .getPublicUrl(product.image_path).data.publicUrl
    : null;

  return (
    <>
      <PageHeading
        description={t("editDescription")}
        eyebrow={tProducts("eyebrow")}
        title={localizedValue(product.name, locale) || t("editProduct")}
        action={
          <Link href="/products">
            <Button>{t("backToProducts")}</Button>
          </Link>
        }
      />
      {query.saved === "1" && (
        <p
          aria-live="polite"
          className="mb-4 rounded-lg border border-admin-green/20 bg-admin-green-soft px-4 py-3 text-xs text-admin-green"
        >
          {tActionMessages("created")}
        </p>
      )}
      {product.image_path && (
        <div className="mb-4">
          <RemoveProductImageButton productId={product.id} />
        </div>
      )}
      <div className="mb-4 flex justify-end">
        <ArchiveProductButton productId={product.id} />
      </div>
      <ProductForm
        categories={(categories ?? []).map((category) => ({
          id: category.id,
          name: localizedValue(category.name, locale) || tProducts("unnamedCategory"),
        }))}
        imageUrl={imageUrl}
        optionGroups={(optionRows ?? []).map((option) => ({
          id: option.id,
          name: localizedPair(option.name),
          is_required: option.is_required,
          min_selections: option.min_selections,
          max_selections: option.max_selections,
          values: (values ?? [])
            .filter((value) => value.option_id === option.id)
            .map((value) => ({
              id: value.id,
              name: localizedPair(value.name),
              price_delta: value.price_delta,
              is_available: value.is_available,
            })),
        }))}
        product={{
          id: product.id,
          name: localizedPair(product.name),
          description: localizedPair(product.description),
          price: product.price,
          categoryId: product.category_id ?? "",
          isAvailable: product.is_available,
          isFeatured: product.is_featured,
          displayOrder: product.display_order,
        }}
      />
    </>
  );
}
