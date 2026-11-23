"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaffSession } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { setLocaleAction } from "./locale";

export type AccountActionState = {
  error?: string;
  success?: string;
};

const profileSchema = z.object({
  fullName: z.string().trim().max(160),
  phone: z
    .string()
    .trim()
    .max(64)
    .regex(/^[+0-9().\-\s]*$/),
  locale: z.enum(["uz", "ru"]),
});

const passwordSchema = z
  .object({
    password: z.string().min(12).max(128),
    confirmPassword: z.string().min(12).max(128),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
  });

export async function saveAccountProfileAction(
  _previousState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const t = await getTranslations("AccountActionMessages");
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    locale: formData.get("locale"),
  });
  if (!parsed.success) {
    return { error: t("profileInvalid") };
  }

  const supabase = await createClient();
  const staff = await requireStaffSession(supabase);
  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName || null,
      phone: parsed.data.phone || null,
      locale: parsed.data.locale,
    })
    .eq("id", staff.userId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Staff profile update failed", error);
    return { error: t("profileFailed") };
  }
  if (!data) {
    return {
      error: t("profileUnavailable"),
    };
  }

  await setLocaleAction(parsed.data.locale);
  revalidatePath("/account");
  return { success: t("profileSaved") };
}

export async function changeAccountPasswordAction(
  _previousState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const t = await getTranslations("AccountActionMessages");
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.path[0] === "confirmPassword"
          ? t("passwordMismatch")
          : t("passwordTooShort"),
    };
  }

  const supabase = await createClient();
  await requireStaffSession(supabase);
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    console.error("Staff password update failed", error);
    return { error: t("passwordFailed") };
  }

  revalidatePath("/account");
  return { success: t("passwordSaved") };
}
