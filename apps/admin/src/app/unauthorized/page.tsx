import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SignOutButton } from "@/components/sign-out-button";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Unauthorized");
  return { title: t("pageTitle") };
}

export default async function UnauthorizedPage() {
  const t = await getTranslations("Unauthorized");

  return (
    <main className="relative grid min-h-screen place-items-center bg-admin-canvas px-5 py-10">
      <div className="absolute right-5 top-5 sm:right-8">
        <LocaleSwitcher />
      </div>
      <section className="w-full max-w-md rounded-2xl border bg-white p-7 text-center shadow-[0_12px_42px_rgba(16,24,40,0.06)] sm:p-9">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-admin-red-soft text-admin-red">
          <ShieldAlert aria-hidden="true" size={22} />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-admin-muted">
          {t("description")}
        </p>
        <div className="mt-6 flex justify-center">
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
