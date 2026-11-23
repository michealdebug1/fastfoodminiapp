import "server-only";

import { cache } from "react";
import type { Json } from "@food-platform/shared";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";
import type {
  MenuCatalog,
  ProductAccent,
  ProductOptionGroup,
} from "../types";

const PRODUCT_IMAGE_BUCKET = "restaurant-product-images";
const accents: readonly ProductAccent[] = [
  "yellow",
  "tomato",
  "cream",
  "basil",
];

function localizedText(value: Json, locale: Locale): string {
  if (typeof value === "string") return value;
  if (!value || Array.isArray(value) || typeof value !== "object") return "";
  const localized = value[locale];
  if (typeof localized === "string") return localized;
  const fallback = value.uz ?? value.ru;
  return typeof fallback === "string" ? fallback : "";
}

export const getMenuCatalog = cache(
  async (locale: Locale): Promise<MenuCatalog> => {
    const supabase = await createClient();
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, name, address, phone, currency")
      .eq("is_active", true)
      .maybeSingle();

    if (restaurantError) {
      throw new Error("Unable to load the restaurant menu", {
        cause: restaurantError,
      });
    }
    if (!restaurant) {
      throw new Error("No active restaurant is configured.");
    }
    if (restaurant.currency !== "UZS") {
      throw new Error("The restaurant currency must be UZS.");
    }

    const [
      { data: settings, error: settingsError },
      { data: categoryRows, error: categoriesError },
      { data: productRows, error: productsError },
    ] = await Promise.all([
      supabase
        .from("restaurant_settings")
        .select("working_hours, minimum_order_amount, pickup_enabled")
        .eq("restaurant_id", restaurant.id)
        .maybeSingle(),
      supabase
        .from("categories")
        .select("id, name")
        .eq("restaurant_id", restaurant.id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("display_order", { ascending: true }),
      supabase
        .from("products")
        .select(
          "id, category_id, name, description, price, image_path, is_featured",
        )
        .eq("restaurant_id", restaurant.id)
        .eq("is_available", true)
        .is("deleted_at", null)
        .order("display_order", { ascending: true }),
    ]);

    if (settingsError) {
      throw new Error("Unable to load restaurant pickup settings", {
        cause: settingsError,
      });
    }
    if (categoriesError) {
      throw new Error("Unable to load menu categories", {
        cause: categoriesError,
      });
    }
    if (productsError) {
      throw new Error("Unable to load available menu products", {
        cause: productsError,
      });
    }

    const productIds = (productRows ?? []).map(({ id }) => id);
    const { data: optionRows, error: optionsError } = productIds.length
      ? await supabase
          .from("product_options")
          .select(
            "id, product_id, name, is_required, min_selections, max_selections",
          )
          .eq("restaurant_id", restaurant.id)
          .in("product_id", productIds)
          .is("deleted_at", null)
          .order("display_order", { ascending: true })
      : { data: [], error: null };

    if (optionsError) {
      throw new Error("Unable to load product options", {
        cause: optionsError,
      });
    }

    const optionIds = (optionRows ?? []).map(({ id }) => id);
    const { data: valueRows, error: valuesError } = optionIds.length
      ? await supabase
          .from("product_option_values")
          .select("id, option_id, name, price_delta")
          .eq("restaurant_id", restaurant.id)
          .eq("is_available", true)
          .in("option_id", optionIds)
          .is("deleted_at", null)
          .order("display_order", { ascending: true })
      : { data: [], error: null };

    if (valuesError) {
      throw new Error("Unable to load selectable product extras", {
        cause: valuesError,
      });
    }

    const valuesByOption = new Map<string, ProductOptionGroup["values"]>();
    for (const value of valueRows ?? []) {
      const current = valuesByOption.get(value.option_id) ?? [];
      valuesByOption.set(value.option_id, [
        ...current,
        {
          id: value.id,
          name: localizedText(value.name, locale),
          priceDelta: value.price_delta,
        },
      ]);
    }

    const optionsByProduct = new Map<string, ProductOptionGroup[]>();
    for (const option of optionRows ?? []) {
      const current = optionsByProduct.get(option.product_id) ?? [];
      current.push({
        id: option.id,
        name: localizedText(option.name, locale),
        isRequired: option.is_required,
        minSelections: option.min_selections,
        maxSelections: option.max_selections,
        values: valuesByOption.get(option.id) ?? [],
      });
      optionsByProduct.set(option.product_id, current);
    }

    return {
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        address: restaurant.address,
        phone: restaurant.phone,
        currency: "UZS",
        pickupEnabled: settings?.pickup_enabled ?? false,
        minimumOrderAmount: settings?.minimum_order_amount ?? 0,
        workingHours: settings?.working_hours ?? {},
      },
      categories: (categoryRows ?? []).map((category) => ({
        id: category.id,
        name: localizedText(category.name, locale),
      })),
      products: (productRows ?? []).map((product, index) => ({
        id: product.id,
        categoryId: product.category_id,
        name: localizedText(product.name, locale),
        description: localizedText(product.description, locale),
        priceUzs: product.price,
        imageUrl: product.image_path
          ? supabase.storage
              .from(PRODUCT_IMAGE_BUCKET)
              .getPublicUrl(product.image_path).data.publicUrl
          : null,
        isFeatured: product.is_featured,
        accent: accents[index % accents.length] ?? "yellow",
        options: optionsByProduct.get(product.id) ?? [],
      })),
    };
  },
);
