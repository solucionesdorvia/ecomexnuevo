import { cn } from "./cn";
import { Icon } from "./Icon";

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
        "rounded-[20px] border shadow-2xl",
        variant === "glass"
          ? "panel"
          : "border-subtle bg-[var(--surface2)]",
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
    <div className={cn("flex items-start justify-between gap-4 p-6", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
            {eyebrow}
          </div>
        ) : null}
        {title ? (
          <div className="mt-1 flex items-center gap-2">
            {icon ? (
              <Icon name={icon} size={18} className="text-primary" />
            ) : null}
            <div className="truncate text-sm font-bold tracking-tight text-strong">
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
  return <div className={cn("px-6 pb-6", className)}>{children}</div>;
}

