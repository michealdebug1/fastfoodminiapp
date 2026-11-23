"use client";

import { DashboardError } from "@/components/dashboard/dashboard-error";

export default function ProtectedError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-8">
      <DashboardError reset={reset} />
    </div>
  );
}
