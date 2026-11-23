"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  setPasswordAction,
  type SetPasswordFormState,
} from "@/app/actions/auth";

const initialState: SetPasswordFormState = {};

export function SetPasswordForm() {
  const [state, formAction, pending] = useActionState(
    setPasswordAction,
    initialState,
  );
  const t = useTranslations("SetPassword");

  return (
    <form action={formAction} className="mt-7 space-y-5">
      {state.error ? (
        <p
          className="rounded-lg border border-admin-red/20 bg-admin-red-soft px-3.5 py-3 text-sm text-admin-red"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-slate-700">
          {t("newPassword")}
        </span>
        <input
          autoComplete="new-password"
          className="h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none transition focus:border-admin-orange focus:ring-4 focus:ring-orange-100"
          minLength={12}
          maxLength={128}
          name="password"
          required
          type="password"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-slate-700">
          {t("confirmPassword")}
        </span>
        <input
          autoComplete="new-password"
          className="h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none transition focus:border-admin-orange focus:ring-4 focus:ring-orange-100"
          minLength={12}
          maxLength={128}
          name="confirmPassword"
          required
          type="password"
        />
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
          t("submit")
        )}
      </button>
    </form>
  );
}
