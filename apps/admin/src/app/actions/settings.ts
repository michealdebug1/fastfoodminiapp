"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireAdminArea } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const dayHoursSchema = z.object({
  open: timeSchema,
  close: timeSchema,
});
const workingHoursSchema = z
  .object({
    monday: dayHoursSchema.optional(),
    tuesday: dayHoursSchema.optional(),
    wednesday: dayHoursSchema.optional(),
    thursday: dayHoursSchema.optional(),
    friday: dayHoursSchema.optional(),
    saturday: dayHoursSchema.optional(),
    sunday: dayHoursSchema.optional(),
  })
  .strict();

const settingsInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000),
  address: z.string().trim().max(500),
  phone: z.string().trim().max(64),
  minimumOrderAmount: z
    .string()
    .regex(/^\d{1,15}$/)
    .transform(Number)
    .refine(Number.isSafeInteger),
  pickupEnabled: z.enum(["true", "false"]).transform((value) => value === "true"),
  workingHours: z.string().max(10_000),
});

export type SettingsActionState = {
  error?: string;
  success?: string;
};

export async function saveRestaurantSettingsAction(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const t = await getTranslations("SettingsActionMessages");
  const parsed = settingsInputSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    address: formData.get("address") ?? "",
    phone: formData.get("phone") ?? "",
    minimumOrderAmount: formData.get("minimumOrderAmount"),
    pickupEnabled: formData.get("pickupEnabled"),
    workingHours: formData.get("workingHours"),
  });
  if (!parsed.success) {
    return { error: t("invalid") };
  }

  let workingHours: unknown;
  try {
    workingHours = JSON.parse(parsed.data.workingHours);
  } catch {
    return { error: t("scheduleJson") };
  }
  const parsedHours = workingHoursSchema.safeParse(workingHours);
  if (!parsedHours.success) {
    return { error: t("scheduleTimes") };
  }

  const supabase = await createClient();
  const staff = await requireAdminArea("settings", supabase);
  const { data: existingSettings, error: existingSettingsError } =
    await supabase
      .from("restaurant_settings")
      .select("delivery_fee, free_delivery_threshold, delivery_enabled")
      .eq("restaurant_id", staff.restaurantId)
      .maybeSingle();

  if (existingSettingsError) {
    throw new Error("Unable to preserve legacy restaurant configuration", {
      cause: existingSettingsError,
    });
  }

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
    })
    .eq("id", staff.restaurantId)
    .select("id")
    .maybeSingle();

  if (restaurantError) {
    console.error("Restaurant profile update failed", restaurantError);
    return { error: t("informationFailed") };
  }
  if (!restaurant) {
    return { error: t("forbidden") };
  }

  const { error: settingsError } = await supabase
    .from("restaurant_settings")
    .upsert(
      {
        restaurant_id: staff.restaurantId,
        working_hours: parsedHours.data,
        minimum_order_amount: parsed.data.minimumOrderAmount,
        delivery_fee: existingSettings?.delivery_fee ?? 0,
        free_delivery_threshold:
          existingSettings?.free_delivery_threshold ?? null,
        delivery_enabled: existingSettings?.delivery_enabled ?? false,
        pickup_enabled: parsed.data.pickupEnabled,
      },
      { onConflict: "restaurant_id" },
    );

  if (settingsError) {
    console.error("Restaurant pickup settings update failed", settingsError);
    return {
      error: t("partialSave"),
    };
  }

  revalidatePath("/settings");
  revalidatePath("/");
  return { success: t("saved") };
}
