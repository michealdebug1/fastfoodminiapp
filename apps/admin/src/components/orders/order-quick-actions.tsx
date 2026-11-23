"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  getNextOrderStatuses,
  type FulfillmentType,
  type OrderStatus,
} from "@food-platform/shared";
import { transitionOrderAction } from "@/app/actions/orders";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { getOrderActionKey } from "@/lib/order-action-labels";

export function OrderQuickActions({
  orderId,
  status,
  fulfillment,
}: {
  orderId: string;
  status: OrderStatus;
  fulfillment: FulfillmentType;
}) {
  const router = useRouter();
  const t = useTranslations("OrderActions");
  const [isPending, startTransition] = useTransition();
  const [confirmReject, setConfirmReject] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const nextStatuses = getNextOrderStatuses(status, fulfillment);
  const primaryStatus = nextStatuses.find((next) => next !== "cancelled");
  const canReject = status === "pending";

  function performTransition(nextStatus: OrderStatus) {
    setError("");
    setSuccess("");
    startTransition(async () => {
      const result = await transitionOrderAction({
        orderId,
        expectedStatus: status,
        nextStatus,
      });
      if (result.error) {
        setError(result.error);
        setConfirmReject(false);
        router.refresh();
        return;
      }
      setConfirmReject(false);
      setSuccess(result.success ?? t("updated"));
      router.refresh();
    });
  }

  if (!primaryStatus && !canReject) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {primaryStatus && (
        <Button
          disabled={isPending}
          onClick={() => performTransition(primaryStatus)}
          size="sm"
          variant="primary"
        >
          {isPending
            ? t("updating")
            : t(getOrderActionKey(status, primaryStatus, fulfillment))}
        </Button>
      )}
      {canReject && (
        <Button
          disabled={isPending}
          onClick={() => setConfirmReject(true)}
          size="sm"
          variant="danger"
        >
          {t("reject")}
        </Button>
      )}
      {error && (
        <p
          aria-live="polite"
          className="w-full text-[10px] leading-4 text-admin-red"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          aria-live="polite"
          className="w-full text-[10px] leading-4 text-emerald-700"
        >
          {success}
        </p>
      )}
      <Dialog
        description={t("cancelDescription")}
        onClose={() => setConfirmReject(false)}
        open={confirmReject}
        title={t("rejectTitle")}
      >
        <div className="flex justify-end gap-2">
          <Button onClick={() => setConfirmReject(false)}>
            {t("keepOrder")}
          </Button>
          <Button
            disabled={isPending}
            onClick={() => performTransition("cancelled")}
            variant="danger"
          >
            {isPending ? t("updating") : t("confirmCancellation")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
