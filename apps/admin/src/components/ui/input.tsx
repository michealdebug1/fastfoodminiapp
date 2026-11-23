import type { InputHTMLAttributes } from "react";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-10 w-full rounded-lg border bg-white px-3 text-sm text-admin-ink placeholder:text-slate-400 focus:border-admin-orange focus:outline-none ${className}`}
      {...props}
    />
  );
}
