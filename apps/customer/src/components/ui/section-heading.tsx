import { cn } from "@/lib/cn";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  id?: string;
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  id,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("max-w-2xl", className)}>
      {eyebrow ? (
        <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-tomato-600">
          {eyebrow}
        </p>
      ) : null}
      <h2
        id={id}
        className="mt-1.5 text-2xl font-black leading-tight sm:text-3xl"
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-ink-500 sm:text-[15px]">
          {description}
        </p>
      ) : null}
    </div>
  );
}
