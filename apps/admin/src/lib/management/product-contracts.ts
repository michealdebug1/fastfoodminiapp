import { z } from "zod";

export const PRODUCT_IMAGE_BUCKET = "restaurant-product-images";
export const PRODUCT_PAGE_SIZE = 20;

export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

const localizedSchema = z.object({
  uz: z.string().trim().min(1).max(160),
  ru: z.string().trim().min(1).max(160),
});

const optionValueSchema = z.object({
  id: z.uuid().optional(),
  name: localizedSchema,
  priceDelta: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  isAvailable: z.boolean(),
});

const optionGroupSchema = z
  .object({
    id: z.uuid().optional(),
    name: localizedSchema,
    isRequired: z.boolean(),
    minSelections: z.number().int().min(0).max(50),
    maxSelections: z.number().int().min(0).max(50).nullable(),
    values: z.array(optionValueSchema).max(50),
  })
  .refine(
    (group) => {
      if (
        group.maxSelections !== null &&
        group.maxSelections < group.minSelections
      ) {
        return false;
      }
      if (group.minSelections > group.values.length) return false;
      return !group.isRequired || group.minSelections > 0;
    },
    "Required groups need at least one selectable extra; review selection limits.",
  );

export const productInputSchema = z.object({
  id: z.union([z.uuid(), z.literal("")]),
  nameUz: z.string().trim().min(1).max(160),
  nameRu: z.string().trim().min(1).max(160),
  descriptionUz: z.string().trim().max(2000),
  descriptionRu: z.string().trim().max(2000),
  price: z
    .string()
    .regex(/^\d{1,15}$/, "Enter a whole-number price in UZS.")
    .transform(Number)
    .refine(Number.isSafeInteger, "Price exceeds the supported range."),
  categoryId: z.union([z.uuid(), z.literal("")]),
  isAvailable: z.enum(["true", "false"]).transform((value) => value === "true"),
  isFeatured: z.enum(["true", "false"]).transform((value) => value === "true"),
  displayOrder: z
    .string()
    .regex(/^\d{1,6}$/)
    .transform(Number),
});

export const optionGroupsSchema = z.array(optionGroupSchema).max(15);
export type OptionGroupInput = z.infer<typeof optionGroupSchema>;

export function localizedValue(value: unknown, locale: "uz" | "ru" = "uz") {
  if (value && typeof value === "object" && locale in value) {
    const localized = (value as Record<string, unknown>)[locale];
    if (typeof localized === "string") return localized;
  }
  if (typeof value === "string") return value;
  return "";
}
