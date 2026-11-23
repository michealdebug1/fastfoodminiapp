import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

const variants = {
  primary:
    "border-transparent bg-admin-orange text-white shadow-sm hover:bg-orange-700",
  secondary:
    "border-admin-line bg-white text-slate-700 shadow-sm hover:bg-slate-50",
  ghost: "border-transparent bg-transparent text-slate-600 hover:bg-slate-100",
  danger:
    "border-transparent bg-admin-red-soft text-admin-red hover:bg-red-100",
};

export function Button({
  className = "",
  variant = "secondary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${
        size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm"
      } ${variants[variant]} ${className}`}
      type={type}
      {...props}
    />
  );
}
