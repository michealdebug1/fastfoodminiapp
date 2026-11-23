"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireAdminArea } from "@/lib/auth/access";
import { syncProductOptions } from "@/lib/management/products";
import {
  PRODUCT_IMAGE_BUCKET,
  optionGroupsSchema,
  productInputSchema,
} from "@/lib/management/product-contracts";
import { createClient } from "@/lib/supabase/server";

export type ProductActionState = {
  error?: string;
  success?: string;
  productId?: string;
  warning?: string;
};

function imageType(bytes: Uint8Array) {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { mime: "image/png", extension: "png" } as const;
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { mime: "image/jpeg", extension: "jpg" } as const;
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return { mime: "image/webp", extension: "webp" } as const;
  }
  return null;
}

function parseOptions(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.length > 100_000) {
    return { error: "optionsMissing" } as const;
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(value);
  } catch {
    return { error: "optionsJson" } as const;
  }

  const parsed = optionGroupsSchema.safeParse(decoded);
  if (!parsed.success) {
    return { error: "optionsInvalid" } as const;
  }
  return { data: parsed.data } as const;
}

export async function saveProductAction(
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const t = await getTranslations("ProductActionMessages");
  const parsed = productInputSchema.safeParse({
    id: formData.get("id") ?? "",
    nameUz: formData.get("nameUz"),
    nameRu: formData.get("nameRu"),
    descriptionUz: formData.get("descriptionUz") ?? "",
    descriptionRu: formData.get("descriptionRu") ?? "",
    price: formData.get("price"),
    categoryId: formData.get("categoryId") ?? "",
    isAvailable: formData.get("isAvailable"),
    isFeatured: formData.get("isFeatured"),
    displayOrder: formData.get("displayOrder") ?? "0",
  });
  if (!parsed.success) {
    return { error: t("invalidFields") };
  }

  const optionGroups = parseOptions(formData.get("optionGroups"));
  if ("error" in optionGroups && optionGroups.error) {
    return { error: t(optionGroups.error) };
  }

  const imageField = formData.get("image");
  const imageInput =
    imageField instanceof File && imageField.size === 0
      ? undefined
      : (imageField ?? undefined);
  const parsedImage = imageFileSchema.safeParse(imageInput);
  if (!parsedImage.success) {
    return { error: t("invalidImageFile") };
  }
  const image = parsedImage.data;

  const supabase = await createClient();
  const staff = await requireAdminArea("products", supabase);
  const productId = parsed.data.id || crypto.randomUUID();

  let existingImagePath: string | null = null;
  if (parsed.data.id) {
    const { data: existingProduct, error } = await supabase
      .from("products")
      .select("id, image_path")
      .eq("id", productId)
      .eq("restaurant_id", staff.restaurantId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) {
      throw new Error("Unable to verify the product before saving", {
        cause: error,
      });
    }
    if (!existingProduct) return { error: t("unavailable") };
    existingImagePath = existingProduct.image_path;
  }

  let uploadedPath: string | null = null;
  if (image) {
    const bytes = new Uint8Array(await image.arrayBuffer());
    const detectedType = imageType(bytes);
    if (!detectedType) {
      return { error: t("invalidImage") };
    }
    const path = `${staff.restaurantId}/products/${productId}/${crypto.randomUUID()}.${detectedType.extension}`;
    const { error } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(path, image, {
        contentType: detectedType.mime,
        upsert: false,
      });
    if (error) {
      console.error("Product image upload failed", error);
      return { error: t("uploadFailed") };
    }
    uploadedPath = path;
  }

  const productPayload = {
    restaurant_id: staff.restaurantId,
    category_id: parsed.data.categoryId || null,
    name: { uz: parsed.data.nameUz, ru: parsed.data.nameRu },
    description: {
      uz: parsed.data.descriptionUz,
      ru: parsed.data.descriptionRu,
    },
    price: parsed.data.price,
    is_available: parsed.data.isAvailable,
    is_featured: parsed.data.isFeatured,
    display_order: parsed.data.displayOrder,
    ...(uploadedPath ? { image_path: uploadedPath } : {}),
  };

  const productWrite = parsed.data.id
    ? await supabase
        .from("products")
        .update(productPayload)
        .eq("id", productId)
        .eq("restaurant_id", staff.restaurantId)
        .is("deleted_at", null)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("products")
        .insert({ id: productId, ...productPayload })
        .select("id")
        .single();

  if (productWrite.error || !productWrite.data) {
    if (uploadedPath) {
      const { error: cleanupError } = await supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .remove([uploadedPath]);
      if (cleanupError) {
        console.error("Failed to remove an unlinked product image", cleanupError);
      }
    }
    if (productWrite.error) {
      console.error("Product database write failed", productWrite.error);
    }
    return { error: t("saveFailed") };
  }

  let warning: string | undefined;
  if (
    uploadedPath &&
    existingImagePath &&
    existingImagePath.startsWith(`${staff.restaurantId}/products/`)
  ) {
    const { error } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .remove([existingImagePath]);
    if (error) {
      console.error("Old product image cleanup failed", error);
      warning = t("imageCleanupWarning");
    }
  }

  const optionError = await syncProductOptions(
    supabase,
    staff.restaurantId,
    productId,
    optionGroups.data,
  );
  if (optionError) return { error: t(optionError), productId, warning };

  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);

  return {
    success: parsed.data.id ? t("updated") : t("created"),
    productId,
    warning,
  };
}

const productIdSchema = z.uuid();
const imageFileSchema = z.file().max(4 * 1024 * 1024).optional();

export async function archiveProductAction(productId: string) {
  const t = await getTranslations("ProductActionMessages");
  const parsed = productIdSchema.safeParse(productId);
  if (!parsed.success) return { error: t("invalidId") };

  const supabase = await createClient();
  const staff = await requireAdminArea("products", supabase);
  const { data, error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString(), is_available: false })
    .eq("id", parsed.data)
    .eq("restaurant_id", staff.restaurantId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Product archive failed", error);
    return { error: t("archiveFailed") };
  }
  if (!data) return { error: t("alreadyArchived") };

  revalidatePath("/products");
  revalidatePath(`/products/${parsed.data}`);
  return { success: t("archived") };
}

export async function removeProductImageAction(productId: string) {
  const t = await getTranslations("ProductActionMessages");
  const parsed = productIdSchema.safeParse(productId);
  if (!parsed.success) return { error: t("invalidId") };

  const supabase = await createClient();
  const staff = await requireAdminArea("products", supabase);
  const { data: product, error: readError } = await supabase
    .from("products")
    .select("id, image_path")
    .eq("id", parsed.data)
    .eq("restaurant_id", staff.restaurantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (readError) {
    console.error("Could not load product image path", readError);
    return { error: t("imageLoadFailed") };
  }
  if (!product) return { error: t("unavailable") };
  if (!product.image_path) return { success: t("noImage") };

  const { data: updated, error: updateError } = await supabase
    .from("products")
    .update({ image_path: null })
    .eq("id", product.id)
    .eq("restaurant_id", staff.restaurantId)
    .eq("image_path", product.image_path)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("Could not unlink product image", updateError);
    return { error: t("imageRemoveFailed") };
  }
  if (!updated) return { error: t("changedByStaff") };

  let warning: string | undefined;
  if (product.image_path.startsWith(`${staff.restaurantId}/products/`)) {
    const { error } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .remove([product.image_path]);
    if (error) {
      console.error("Could not delete the product image object", error);
      warning = t("imageDetachedWarning");
    }
  }

  revalidatePath("/products");
  revalidatePath(`/products/${product.id}`);
  return { success: t("imageRemoved"), warning };
}
