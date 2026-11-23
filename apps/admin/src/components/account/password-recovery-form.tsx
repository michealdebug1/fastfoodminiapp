"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import {
  requestPasswordResetAction,
  type PasswordResetFormState,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: PasswordResetFormState = {};

export function PasswordRecoveryForm() {
  const [state, action, pending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );
  const t = useTranslations("ForgotPassword");

  return (
    <>
      <form action={action} className="mt-6 space-y-4">
        <label className="block space-y-1.5 text-xs font-medium">
          {t("email")}
          <Input
            autoComplete="email"
            maxLength={254}
            name="email"
            required
            type="email"
          />
        </label>
        {state.error && (
          <p aria-live="polite" className="text-xs text-admin-red" role="alert">
            {state.error}
          </p>
        )}
        {state.success && (
          <p aria-live="polite" className="text-xs text-admin-green" role="status">
            {state.success}
          </p>
        )}
        <Button className="w-full" disabled={pending} type="submit">
          {pending ? t("submitting") : t("submit")}
        </Button>
      </form>
      <Link
        className="mt-5 inline-flex text-xs font-semibold text-admin-orange hover:underline"
        href="/login"
      >
        {t("back")}
      </Link>
    </>
  );
}
