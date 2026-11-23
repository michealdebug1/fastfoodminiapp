import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center px-5 py-10 text-center">
      <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        {icon ?? <Inbox aria-hidden="true" size={20} />}
      </span>
      <h3 className="text-sm font-semibold text-admin-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs leading-5 text-admin-muted">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
