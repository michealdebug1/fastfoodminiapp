import { useTranslations } from "next-intl";
import { Badge } from "./badge";

const statusTones = {
  pending: "warning",
  confirmed: "accent",
  preparing: "accent",
  ready: "success",
  ready_for_pickup: "success",
  out_for_delivery: "success",
  delivered: "success",
  completed: "success",
  cancelled: "danger",
} as const;

export function StatusBadge({ status }: { status: keyof typeof statusTones }) {
  const t = useTranslations("OrderStatus");

  return (
    <Badge tone={statusTones[status]}>
      {t(status)}
    </Badge>
  );
}
