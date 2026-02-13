import { cn } from "./cn";

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  icon,
  right,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {eyebrow ? (
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
          {eyebrow}
        </div>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {icon ? (
              <span className="material-symbols-outlined text-primary">{icon}</span>
            ) : null}
            <h1 className="truncate text-3xl font-black tracking-tight md:text-4xl">
              {title}
            </h1>
          </div>
          {subtitle ? (
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted md:text-base">
              {subtitle}
            </p>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </div>
  );
}

