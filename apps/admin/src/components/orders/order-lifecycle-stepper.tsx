import { useTranslations } from "next-intl";
import type { OrderStatus } from "@food-platform/shared";

const pickupStages: readonly OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "completed",
];

export function OrderLifecycleStepper({
  status,
  previousStatus,
}: {
  status: OrderStatus;
  previousStatus?: OrderStatus | null;
}) {
  const t = useTranslations("OrderDetail");
  const tStatus = useTranslations("OrderStatus");
  const isCancelled = status === "cancelled";
  const activeStatus = isCancelled ? previousStatus : status;
  const activeIndex = activeStatus ? pickupStages.indexOf(activeStatus) : -1;

  return (
    <ol
      aria-label={t("lifecycle")}
      className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-5"
    >
      {pickupStages.map((stage, index) => {
        const isCurrent = !isCancelled && index === activeIndex;
        const isDone = index < activeIndex || (isCancelled && index <= activeIndex);

        return (
          <li
            aria-current={isCurrent ? "step" : undefined}
            className="min-w-0"
            key={stage}
          >
            <span
              aria-hidden="true"
              className={`mb-1.5 block h-1 rounded-full ${
                isDone || isCurrent ? "bg-admin-orange" : "bg-slate-200"
              }`}
            />
            <span className="block text-[10px] font-medium leading-4 text-admin-muted">
              {tStatus(stage)}
            </span>
            <span className="sr-only">
              {isCurrent
                ? t("stepCurrent")
                : isDone
                  ? t("stepDone")
                  : t("stepUpcoming")}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
