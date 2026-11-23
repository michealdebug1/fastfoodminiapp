"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getStaffAccess } from "@/lib/auth/access";
import { getStaffHomePath } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export type LoginFormState = {
  error?: string;
};

export type SetPasswordFormState = {
  error?: string;
};

export type PasswordResetFormState = {
  error?: string;
  success?: string;
};

const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
});

const setPasswordSchema = z
  .object({
    password: z.string().min(12).max(128),
    confirmPassword: z.string().min(12).max(128),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
  });

export async function signInAction(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const t = await getTranslations("AuthErrors");
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: t("invalidCredentials") };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email.trim().toLowerCase(),
    password: parsed.data.password,
  });

  if (signInError) {
    return { error: t("signInFailed") };
  }

  const access = await getStaffAccess(supabase);

  if (access.kind !== "authorized") {
    const { error: signOutError } = await supabase.auth.signOut({
      scope: "local",
    });

    if (signOutError) {
      throw new Error("Unable to clear an unauthorized session", {
        cause: signOutError,
      });
    }

    if (access.kind === "error") {
      return { error: t("accessVerificationFailed") };
    }

    return { error: t("noStaffAccess") };
  }

  redirect(getStaffHomePath(access.staff.role));
}

export async function setPasswordAction(
  _previousState: SetPasswordFormState,
  formData: FormData,
): Promise<SetPasswordFormState> {
  const t = await getTranslations("AuthErrors");
  const parsed = setPasswordSchema.safeParse({
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
  const access = await getStaffAccess(supabase);

  if (access.kind !== "authorized") {
    if (access.kind === "error") {
      throw new Error("Unable to verify staff access before setting a password", {
        cause: access.error,
      });
    }

    return { error: t("passwordLinkInvalid") };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: t("passwordSetFailed") };
  }

  redirect(getStaffHomePath(access.staff.role));
}

export async function requestPasswordResetAction(
  _previousState: PasswordResetFormState,
  formData: FormData,
): Promise<PasswordResetFormState> {
  const t = await getTranslations("AuthErrors");
  const parsed = z
    .object({ email: z.email().max(254) })
    .safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { error: t("emailInvalid") };
  }

  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL;
  if (!adminUrl) {
    return {
      error: t("recoveryNotConfigured"),
    };
  }

  let redirectTo: string;
  try {
    const url = new URL(adminUrl);
    if (
      url.protocol !== "https:" &&
      url.hostname !== "localhost" &&
      url.hostname !== "127.0.0.1"
    ) {
      return { error: t("recoveryUrlInvalid") };
    }
    redirectTo = new URL("/auth/callback", url).toString();
  } catch {
    return { error: t("recoveryUrlInvalid") };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email.trim().toLowerCase(),
    { redirectTo },
  );

  if (error) {
    console.error("Password recovery request failed", error);
    return {
      error: t("resetRequestFailed"),
    };
  }

  return {
    success: t("resetSent"),
  };
}

export async function signOutAction() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (error) {
    throw new Error("Unable to sign out", { cause: error });
  }

  revalidatePath("/", "layout");
  redirect("/login?reason=signed-out");
}
