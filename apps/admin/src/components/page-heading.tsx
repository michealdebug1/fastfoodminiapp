export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 hidden items-end justify-between gap-4 lg:flex">
      <div>
        {eyebrow && (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-admin-orange">
            {eyebrow}
          </p>
        )}
        <h2 className="text-[25px] font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-admin-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
