import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PasswordRecoveryForm } from "@/components/account/password-recovery-form";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ForgotPassword");
  return { title: t("pageTitle") };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("ForgotPassword");

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
        <PasswordRecoveryForm />
      </section>
    </main>
  );
}
