"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { signInAction, type LoginFormState } from "@/app/actions/auth";

const initialState: LoginFormState = {};

export function LoginForm({
  expired,
  inviteFailed,
}: {
  expired: boolean;
  inviteFailed: boolean;
}) {
  const [state, formAction, pending] = useActionState(signInAction, initialState);
  const t = useTranslations("Login");

  return (
    <form action={formAction} className="mt-7 space-y-5">
      {expired && (
        <div
          className="rounded-lg border border-admin-amber/20 bg-admin-amber-soft px-3.5 py-3 text-sm text-admin-amber"
          role="status"
        >
          {t("expired")}
        </div>
      )}
      {inviteFailed ? (
        <div
          className="rounded-lg border border-admin-red/20 bg-admin-red-soft px-3.5 py-3 text-sm text-admin-red"
          role="alert"
        >
          {t("inviteFailed")}
        </div>
      ) : null}
      {state.error && (
        <div
          className="rounded-lg border border-admin-red/20 bg-admin-red-soft px-3.5 py-3 text-sm text-admin-red"
          role="alert"
        >
          {state.error}
        </div>
      )}

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-slate-700">
          {t("email")}
        </span>
        <span className="relative block">
          <Mail
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            autoComplete="username"
            className="h-11 w-full rounded-lg border bg-white pl-10 pr-3 text-sm outline-none transition focus:border-admin-orange focus:ring-4 focus:ring-orange-100"
            name="email"
            placeholder={t("emailPlaceholder")}
            required
            type="email"
          />
        </span>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-slate-700">
          {t("password")}
        </span>
        <span className="relative block">
          <LockKeyhole
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            autoComplete="current-password"
            className="h-11 w-full rounded-lg border bg-white pl-10 pr-3 text-sm outline-none transition focus:border-admin-orange focus:ring-4 focus:ring-orange-100"
            name="password"
            placeholder={t("passwordPlaceholder")}
            required
            type="password"
          />
        </span>
      </label>

      <button
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-admin-orange px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:pointer-events-none disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? (
          <>
            <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />
            {t("submitting")}
          </>
        ) : (
          <>
            {t("submit")}
            <ArrowRight aria-hidden="true" size={16} />
          </>
        )}
      </button>
      <p className="text-center text-xs leading-5 text-admin-muted">
        {t("accountsNote")}
      </p>
      <p className="text-center text-xs">
        <Link
          className="font-semibold text-admin-orange hover:underline"
          href="/forgot-password"
        >
          {t("forgot")}
        </Link>
      </p>
    </form>
  );
}
