"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { markCashPaymentPaidAction } from "@/app/actions/orders";
import { Button } from "@/components/ui/button";

export function PaymentAction({
  orderId,
  paymentId,
  provider,
  status,
  fulfillment,
}: {
  orderId: string;
  paymentId: string;
  provider: string;
  status: string;
  fulfillment: string;
}) {
  const router = useRouter();
  const t = useTranslations("OrderActions");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  if (
    status === "verified" ||
    provider !== "cash" ||
    status !== "pending" ||
    fulfillment !== "pickup"
  ) {
    return null;
  }

  function confirmCashReceived() {
    setMessage("");
    startTransition(async () => {
      const result = await markCashPaymentPaidAction({ orderId, paymentId });
      setMessage(result.error ?? result.success ?? "");
      if (result.success) router.refresh();
    });
  }

  return (
    <div className="mt-3">
      <Button
        disabled={isPending}
        onClick={confirmCashReceived}
        size="sm"
        variant="secondary"
      >
        {isPending ? t("recording") : t("markCashReceived")}
      </Button>
      <p aria-live="polite" className="mt-2 text-[11px] text-admin-muted">
        {message}
      </p>
    </div>
  );
}
