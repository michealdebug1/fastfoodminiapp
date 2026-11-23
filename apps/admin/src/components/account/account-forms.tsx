"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  changeAccountPasswordAction,
  saveAccountProfileAction,
  type AccountActionState,
} from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const initialState: AccountActionState = {};

export function AccountForms({
  email,
  fullName,
  locale,
  phone,
  restaurantName,
  role,
}: {
  email: string | null;
  fullName: string;
  locale: "uz" | "ru";
  phone: string;
  restaurantName: string;
  role: string;
}) {
  const t = useTranslations("Account");
  const router = useRouter();
  const [profileState, saveProfile, profilePending] = useActionState(
    saveAccountProfileAction,
    initialState,
  );
  const [passwordState, changePassword, passwordPending] = useActionState(
    changeAccountPasswordAction,
    initialState,
  );

  useEffect(() => {
    if (profileState.success || passwordState.success) router.refresh();
  }, [profileState.success, passwordState.success, router]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <h2 className="text-sm font-semibold">{t("staffAccess")}</h2>
            <p className="mt-1 text-xs text-admin-muted">
              {t("accessDescription")}
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-3">
          <ReadOnlyField label={t("email")} value={email ?? t("unavailable")} />
          <ReadOnlyField label={t("role")} value={role} />
          <ReadOnlyField label={t("restaurant")} value={restaurantName} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <h2 className="text-sm font-semibold">{t("profile")}</h2>
            <p className="mt-1 text-xs text-admin-muted">
              {t("profileDescription")}
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <form action={saveProfile} className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs font-medium">
              {t("fullName")}
              <Input
                autoComplete="name"
                maxLength={160}
                name="fullName"
                defaultValue={fullName}
              />
            </label>
            <label className="space-y-1.5 text-xs font-medium">
              {t("phone")}
              <Input
                autoComplete="tel"
                maxLength={64}
                name="phone"
                type="tel"
                defaultValue={phone}
              />
            </label>
            <label className="space-y-1.5 text-xs font-medium sm:col-span-2">
              {t("preferredLanguage")}
              <select
                className="h-10 w-full rounded-lg border bg-white px-3 text-sm"
                defaultValue={locale}
                name="locale"
              >
                <option value="uz">{t("uzbek")}</option>
                <option value="ru">{t("russian")}</option>
              </select>
            </label>
            <ActionFeedback state={profileState} />
            <div className="sm:col-span-2 sm:justify-self-end">
              <Button disabled={profilePending} type="submit" variant="primary">
                {profilePending ? t("saving") : t("saveProfile")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <h2 className="text-sm font-semibold">{t("changePassword")}</h2>
            <p className="mt-1 text-xs text-admin-muted">
              {t("passwordDescription")}
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <form action={changePassword} className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs font-medium">
              {t("newPassword")}
              <Input
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                name="password"
                required
                type="password"
              />
            </label>
            <label className="space-y-1.5 text-xs font-medium">
              {t("confirmPassword")}
              <Input
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                name="confirmPassword"
                required
                type="password"
              />
            </label>
            <ActionFeedback state={passwordState} />
            <div className="sm:col-span-2 sm:justify-self-end">
              <Button disabled={passwordPending} type="submit" variant="primary">
                {passwordPending ? t("updating") : t("updatePassword")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-3">
      <p className="text-[11px] font-medium text-admin-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function ActionFeedback({ state }: { state: AccountActionState }) {
  return (
    <div aria-live="polite" className="sm:col-span-2">
      {state.error && <p className="text-xs text-admin-red">{state.error}</p>}
      {state.success && (
        <p className="text-xs text-admin-green">{state.success}</p>
      )}
    </div>
  );
}
