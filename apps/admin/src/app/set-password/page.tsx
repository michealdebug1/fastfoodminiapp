import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { getStaffAccess } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "./set-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SetPassword");
  return { title: t("pageTitle") };
}

export default async function SetPasswordPage() {
  const supabase = await createClient();
  const access = await getStaffAccess(supabase);

  if (access.kind === "unauthenticated") {
    redirect("/login");
  }
  if (access.kind === "unauthorized") {
    redirect("/unauthorized");
  }
  if (access.kind === "error") {
    throw new Error("Unable to verify staff access for password setup", {
      cause: access.error,
    });
  }

  const t = await getTranslations("SetPassword");

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-admin-canvas px-5 py-10 sm:px-8">
      <div className="absolute right-5 top-5 sm:right-8">
        <LocaleSwitcher />
      </div>
      <section className="w-full max-w-[390px] rounded-2xl border bg-white p-6 shadow-[0_12px_42px_rgba(16,24,40,0.06)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-admin-orange">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm leading-5 text-admin-muted">
          {t("description")}
        </p>
        <SetPasswordForm />
      </section>
    </main>
  );
}
