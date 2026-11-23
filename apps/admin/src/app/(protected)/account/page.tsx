import { PageHeading } from "@/components/page-heading";
import { AccountForms } from "@/components/account/account-forms";
import { createClient } from "@/lib/supabase/server";
import { requireStaffSession } from "@/lib/auth/access";
import { getLocale, getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/config";

export async function generateMetadata() {
  const t = await getTranslations("Account");
  return { title: t("title") };
}

export default async function AccountPage() {
  const t = await getTranslations("Account");
  const tRoles = await getTranslations("Roles");
  const locale = resolveLocale(await getLocale());
  const supabase = await createClient();
  const staff = await requireStaffSession(supabase);
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", staff.userId)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load your staff profile", { cause: error });
  }
  if (!profile) {
    throw new Error("Your staff profile is unavailable.");
  }
  return (
    <>
      <PageHeading
        description={t("description")}
        eyebrow={t("eyebrow")}
        title={t("title")}
      />
      <AccountForms
        email={staff.email}
        locale={locale}
        fullName={profile.full_name ?? ""}
        phone={profile.phone ?? ""}
        restaurantName={staff.restaurantName}
        role={tRoles(staff.role)}
      />
    </>
  );
}
