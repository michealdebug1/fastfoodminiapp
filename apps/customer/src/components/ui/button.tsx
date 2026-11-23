import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "dark"
  | "ghost"
  | "outline";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

const baseStyles =
  "inline-flex items-center justify-center gap-2 rounded-pill font-bold transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-tomato-500 text-white shadow-soft hover:bg-tomato-600 active:bg-tomato-700",
  secondary:
    "bg-yellow-400 text-ink-900 shadow-soft hover:bg-yellow-300 active:bg-yellow-500",
  dark: "bg-ink-900 text-cream-50 shadow-soft hover:bg-ink-800 active:bg-ink-700",
  ghost: "bg-transparent text-ink-700 hover:bg-cream-200",
  outline:
    "border border-line-strong bg-surface text-ink-800 shadow-soft hover:border-ink-300 hover:bg-cream-50",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-xs",
  md: "h-11 px-4 text-sm",
  lg: "h-13 px-6 text-base",
  icon: "size-10",
};

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

/** Shared styles so links and buttons can look identical without a wrapper. */
export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: ButtonStyleOptions = {}): string {
  return cn(baseStyles, variantStyles[variant], sizeStyles[size], className);
}

export interface ButtonProps
  extends ComponentProps<"button">,
    Omit<ButtonStyleOptions, "className"> {}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, className })}
      {...props}
    />
  );
}
