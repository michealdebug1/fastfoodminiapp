import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Utensils } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "./login-form";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { getStaffAccess } from "@/lib/auth/access";
import { getStaffHomePath } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Login");
  return { title: t("pageTitle") };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const supabase = await createClient();
  const access = await getStaffAccess(supabase);

  if (access.kind === "authorized") {
    redirect(getStaffHomePath(access.staff.role));
  }
  if (access.kind === "error") {
    throw new Error("Unable to verify an existing staff session", {
      cause: access.error,
    });
  }
  if (access.kind === "unauthorized") {
    redirect("/unauthorized");
  }

  const { reason } = await searchParams;
  const t = await getTranslations("Login");
  const tCommon = await getTranslations("Common");

  return (
    <main className="grid min-h-screen bg-admin-canvas lg:grid-cols-[minmax(0,1fr)_480px]">
      <section className="relative hidden overflow-hidden bg-slate-950 px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div className="absolute -right-36 -top-32 size-[520px] rounded-full border border-white/10" />
        <div className="absolute -right-12 -top-8 size-[360px] rounded-full border border-white/10" />
        <div className="relative flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-admin-orange">
            <Utensils aria-hidden="true" size={19} />
          </span>
          <span className="text-sm font-bold tracking-tight">
            {tCommon("brand")}
          </span>
        </div>
        <div className="relative max-w-lg pb-8">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-orange-300">
            {t("eyebrow")}
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-slate-300">
            {t("heroDescription")}
          </p>
        </div>
        <p className="relative text-[11px] text-slate-400">
          {t("secureWorkspace")}
        </p>
      </section>

      <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="absolute right-5 top-5 sm:right-8">
          <LocaleSwitcher />
        </div>
        <div className="w-full max-w-[390px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-admin-orange text-white">
              <Utensils aria-hidden="true" size={19} />
            </span>
            <span className="text-sm font-bold tracking-tight">
              {tCommon("brand")}
            </span>
          </div>
          <div className="rounded-2xl border bg-white p-6 shadow-[0_12px_42px_rgba(16,24,40,0.06)] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-admin-orange">
              {t("accessEyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              {t("welcome")}
            </h2>
            <p className="mt-2 text-sm leading-5 text-admin-muted">
              {t("description")}
            </p>
            <LoginForm
              expired={
                reason === "session-expired" ||
                (access.kind === "unauthenticated" &&
                  access.reason === "session-expired")
              }
              inviteFailed={reason === "invite-failed"}
            />
          </div>
          <p className="mt-5 text-center text-[11px] text-admin-muted">
            {t("needAccess")}
          </p>
        </div>
      </section>
    </main>
  );
}
