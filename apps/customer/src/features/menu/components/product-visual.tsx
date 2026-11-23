import Image from "next/image";
import { cn } from "@/lib/cn";
import type { ProductAccent } from "../types";

const accentStyles: Record<ProductAccent, string> = {
  yellow: "from-yellow-200 via-yellow-100 to-cream-50",
  tomato: "from-tomato-200 via-tomato-100 to-cream-50",
  cream: "from-cream-300 via-cream-100 to-cream-50",
  basil: "from-basil-200 via-basil-100 to-cream-50",
};

interface ProductVisualProps {
  emoji: string;
  accent: ProductAccent;
  imageUrl?: string | null;
  imageAlt?: string;
  className?: string;
}

/**
 * Deliberate illustrated placeholder: a warm gradient tile with the product
 * glyph. Swap for `next/image` once food photography exists.
 */
export function ProductVisual({
  emoji,
  accent,
  imageUrl,
  imageAlt = "",
  className,
}: ProductVisualProps) {
  return (
    <div
      className={cn(
        "relative grid aspect-[4/3] place-items-center overflow-hidden bg-gradient-to-br",
        accentStyles[accent],
        className,
      )}
    >
      <span className="absolute -left-5 -top-6 size-20 rounded-full bg-white/40 blur-xl" />
      <span className="absolute -bottom-8 -right-5 size-24 rounded-full bg-white/50 blur-2xl" />
      <span className="absolute inset-4 rounded-full border border-dashed border-ink-900/10" />
      {imageUrl ? (
        <Image
          alt={imageAlt}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none"
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          src={imageUrl}
          unoptimized
        />
      ) : (
        <span
          aria-hidden="true"
          className="relative text-6xl drop-shadow-[0_12px_12px_rgba(36,26,18,0.18)] transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105 motion-reduce:transition-none sm:text-7xl"
        >
          {emoji}
        </span>
      )}
    </div>
  );
}
