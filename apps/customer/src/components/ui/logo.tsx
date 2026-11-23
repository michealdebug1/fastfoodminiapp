import { Sandwich } from "lucide-react";
import { restaurant } from "@/config/restaurant";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

interface LogoProps {
  tone?: "light" | "dark";
  className?: string;
}

/**
 * Brand lockup. The mark is decorative; the wordmark supplies the accessible
 * name for the home link.
 */
export function Logo({ tone = "light", className }: LogoProps) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2.5 rounded-xl transition-opacity hover:opacity-80",
        className,
      )}
    >
      <span className="grid size-10 place-items-center rounded-2xl bg-yellow-400 text-ink-900 shadow-soft ring-1 ring-ink-900/10">
        <Sandwich className="size-5" strokeWidth={2.5} aria-hidden="true" />
      </span>
      <span
        className={cn(
          "font-display text-xl leading-none font-black tracking-tight",
          tone === "dark" ? "text-cream-50" : "text-ink-900",
        )}
      >
        {restaurant.name}
      </span>
    </Link>
  );
}
