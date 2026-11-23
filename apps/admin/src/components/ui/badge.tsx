import type { HTMLAttributes } from "react";

const tones = {
  neutral: "bg-slate-100 text-slate-600",
  success: "bg-admin-green-soft text-admin-green",
  danger: "bg-admin-red-soft text-admin-red",
  warning: "bg-admin-amber-soft text-admin-amber",
  accent: "bg-admin-orange-soft text-admin-orange",
};

export function Badge({
  className = "",
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: keyof typeof tones;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${tones[tone]} ${className}`}
      {...props}
    />
  );
}
