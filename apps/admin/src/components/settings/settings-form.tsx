"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { saveRestaurantSettingsAction } from "@/app/actions/settings";
import type { SettingsActionState } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const days = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

type DayKey = (typeof days)[number][0];
type Schedule = Partial<Record<DayKey, { open: string; close: string }>>;

const emptyState: SettingsActionState = {};

export function SettingsForm({
  restaurant,
  settings,
}: {
  restaurant: {
    name: string;
    description: string;
    address: string;
    phone: string;
  };
  settings: {
    workingHours: Schedule;
    minimumOrderAmount: number;
    pickupEnabled: boolean;
  };
}) {
  const t = useTranslations("Settings");
  const router = useRouter();
  const [state, action, pending] = useActionState(
    saveRestaurantSettingsAction,
    emptyState,
  );
  const [schedule, setSchedule] = useState<Schedule>(settings.workingHours);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state]);

  function updateHours(
    day: DayKey,
    value: { open: string; close: string } | null,
  ) {
    setSchedule((current) => {
      const next = { ...current };
      if (value) next[day] = value;
      else delete next[day];
      return next;
    });
  }

  return (
    <form action={action} className="space-y-4">
      <input
        name="workingHours"
        type="hidden"
        value={JSON.stringify(schedule)}
      />
      <Card>
        <CardHeader>
          <div>
            <h2 className="text-sm font-semibold">{t("information")}</h2>
            <p className="mt-1 text-xs text-admin-muted">
              {t("schemaNote")}
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-medium sm:col-span-2">
            {t("name")}
            <Input defaultValue={restaurant.name} maxLength={160} name="name" required />
          </label>
          <label className="space-y-1.5 text-xs font-medium sm:col-span-2">
            {t("descriptionField")}
            <textarea
              className="min-h-24 w-full rounded-lg border bg-white px-3 py-2 text-sm focus:border-admin-orange focus:outline-none"
              defaultValue={restaurant.description}
              maxLength={2000}
              name="description"
              rows={4}
            />
          </label>
          <label className="space-y-1.5 text-xs font-medium">
            {t("address")}
            <Input defaultValue={restaurant.address} maxLength={500} name="address" />
          </label>
          <label className="space-y-1.5 text-xs font-medium">
            {t("phone")}
            <Input defaultValue={restaurant.phone} maxLength={64} name="phone" type="tel" />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <h2 className="text-sm font-semibold">{t("workingHours")}</h2>
            <p className="mt-1 text-xs text-admin-muted">
              {t("timezone")}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-4">
          {days.map((day) => {
            const hours = schedule[day];
            return (
              <div
                className="grid items-center gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(120px,1fr)_100px_minmax(130px,1fr)_minmax(130px,1fr)]"
                key={day}
              >
                <span className="text-xs font-medium">{t(day)}</span>
                <label className="inline-flex items-center gap-2 text-xs">
                  <input
                    checked={Boolean(hours)}
                    onChange={(event) =>
                      updateHours(
                        day,
                        event.target.checked
                          ? hours ?? { open: "10:00", close: "23:00" }
                          : null,
                      )
                    }
                    type="checkbox"
                  />
                  {t("open")}
                </label>
                {hours ? (
                  <>
                    <label className="space-y-1 text-[11px] font-medium">
                      {t("opens")}
                      <Input
                        onChange={(event) =>
                          updateHours(day, { ...hours, open: event.target.value })
                        }
                        type="time"
                        value={hours.open}
                      />
                    </label>
                    <label className="space-y-1 text-[11px] font-medium">
                      {t("closes")}
                      <Input
                        onChange={(event) =>
                          updateHours(day, { ...hours, close: event.target.value })
                        }
                        type="time"
                        value={hours.close}
                      />
                    </label>
                  </>
                ) : (
                  <span className="text-xs text-admin-muted sm:col-span-2">
                    {t("closed")}
                  </span>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <h2 className="text-sm font-semibold">{t("pickup")}</h2>
            <p className="mt-1 text-xs text-admin-muted">
              {t("pickupDescription")}
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-medium">
            {t("minimumOrder")}
            <Input
              defaultValue={settings.minimumOrderAmount}
              min="0"
              name="minimumOrderAmount"
              required
              step="1"
              type="number"
            />
          </label>
          <div className="flex flex-wrap gap-5 pt-6">
            <label className="inline-flex items-center gap-2 text-xs">
              <input
                defaultChecked={settings.pickupEnabled}
                name="pickupEnabled"
                type="checkbox"
                value="true"
              />
              {t("pickupEnabled")}
              <input name="pickupEnabled" type="hidden" value="false" />
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div aria-live="polite" className="text-xs">
          {state.error && <p className="text-admin-red">{state.error}</p>}
          {state.success && <p className="text-admin-green">{state.success}</p>}
        </div>
        <Button disabled={pending} type="submit" variant="primary">
          {pending ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}
