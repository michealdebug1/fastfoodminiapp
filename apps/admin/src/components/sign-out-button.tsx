"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { signOutAction } from "@/app/actions/auth";

export function SignOutButton() {
  const t = useTranslations("Shell");

  return (
    <form action={signOutAction}>
      <button
        className="inline-flex h-9 items-center gap-2 rounded-lg border bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-admin-red"
        type="submit"
      >
        <LogOut aria-hidden="true" size={15} />
        <span>{t("signOut")}</span>
      </button>
    </form>
  );
}
