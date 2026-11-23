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

export function OrderActions({
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
  const [confirmation, setConfirmation] = useState<OrderStatus | null>(null);
  const [message, setMessage] = useState("");
  const nextStatuses = getNextOrderStatuses(status, fulfillment);

  function performTransition(nextStatus: OrderStatus) {
    setMessage("");
    startTransition(async () => {
      const result = await transitionOrderAction({
        orderId,
        expectedStatus: status,
        nextStatus,
      });
      if (result.error) {
        setMessage(result.error);
        setConfirmation(null);
        router.refresh();
        return;
      }
      setMessage(result.success ?? t("updated"));
      setConfirmation(null);
      router.refresh();
    });
  }

  if (nextStatuses.length === 0) {
    return <p className="text-xs text-admin-muted">{t("closed")}</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {nextStatuses.map((nextStatus) => (
          <Button
            disabled={isPending}
            key={nextStatus}
            onClick={() =>
              nextStatus === "cancelled"
                ? setConfirmation(nextStatus)
                : performTransition(nextStatus)
            }
            variant={nextStatus === "cancelled" ? "danger" : "primary"}
          >
            {t(getOrderActionKey(status, nextStatus, fulfillment))}
          </Button>
        ))}
      </div>
      <p aria-live="polite" className="mt-3 text-xs text-admin-muted">
        {isPending ? t("updating") : message}
      </p>
      <Dialog
        description={t("cancelDescription")}
        onClose={() => setConfirmation(null)}
        open={confirmation === "cancelled"}
        title={status === "pending" ? t("rejectTitle") : t("cancelTitle")}
      >
        <div className="flex justify-end gap-2">
          <Button onClick={() => setConfirmation(null)}>{t("keepOrder")}</Button>
          <Button
            disabled={isPending}
            onClick={() => performTransition("cancelled")}
            variant="danger"
          >
            {t("confirmCancellation")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
