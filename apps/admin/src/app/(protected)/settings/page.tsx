import { PageHeading } from "@/components/page-heading";
import { getTranslations } from "next-intl/server";
import { SettingsForm } from "@/components/settings/settings-form";
import { requireAdminArea } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

type WorkingHours = Partial<
  Record<
    "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday",
    { open: string; close: string }
  >
>;

export async function generateMetadata() {
  const t = await getTranslations("Settings");
  return { title: t("title") };
}

function readWorkingHours(value: unknown): WorkingHours {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ] as const;
  const schedule: WorkingHours = {};
  for (const day of days) {
    const hours = record[day];
    if (
      hours &&
      typeof hours === "object" &&
      "open" in hours &&
      "close" in hours &&
      typeof hours.open === "string" &&
      typeof hours.close === "string"
    ) {
      schedule[day] = { open: hours.open, close: hours.close };
    }
  }
  return schedule;
}

export default async function SettingsPage() {
  const t = await getTranslations("Settings");
  const supabase = await createClient();
  const staff = await requireAdminArea("settings", supabase);
  const [{ data: restaurant, error: restaurantError }, { data: settings, error: settingsError }] =
    await Promise.all([
      supabase
        .from("restaurants")
        .select("name, description, address, phone")
        .eq("id", staff.restaurantId)
        .maybeSingle(),
      supabase
        .from("restaurant_settings")
        .select(
          "working_hours, minimum_order_amount, pickup_enabled",
        )
        .eq("restaurant_id", staff.restaurantId)
        .maybeSingle(),
    ]);

  if (restaurantError) {
    throw new Error("Unable to load restaurant information", {
      cause: restaurantError,
    });
  }
  if (settingsError) {
    throw new Error("Unable to load restaurant configuration", {
      cause: settingsError,
    });
  }
  if (!restaurant) {
    throw new Error("The restaurant associated with this staff session is unavailable.");
  }

  return (
    <>
      <PageHeading
        description={t("description")}
        eyebrow={t("eyebrow")}
        title={t("title")}
      />
      <SettingsForm
        restaurant={{
          name: restaurant.name,
          description: restaurant.description ?? "",
          address: restaurant.address ?? "",
          phone: restaurant.phone ?? "",
        }}
        settings={{
          workingHours: readWorkingHours(settings?.working_hours),
          minimumOrderAmount: settings?.minimum_order_amount ?? 0,
          pickupEnabled: settings?.pickup_enabled ?? false,
        }}
      />
    </>
  );
}
