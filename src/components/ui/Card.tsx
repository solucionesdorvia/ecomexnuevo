import { cn } from "./cn";

export function Card({
  children,
  className,
  variant = "glass",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "glass" | "solid";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border shadow-xl",
        variant === "glass"
          ? "glass-panel border-white/10"
          : "border-border-dark bg-card-dark",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  eyebrow,
  title,
  icon,
  right,
  className,
}: {
  eyebrow?: string;
  title?: string;
  icon?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 p-5", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
            {eyebrow}
          </div>
        ) : null}
        {title ? (
          <div className="mt-1 flex items-center gap-2">
            {icon ? (
              <span className="material-symbols-outlined text-primary">{icon}</span>
            ) : null}
            <div className="truncate text-sm font-extrabold tracking-tight text-white">
              {title}
            </div>
          </div>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export function CardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-5 pb-5", className)}>{children}</div>;
}

