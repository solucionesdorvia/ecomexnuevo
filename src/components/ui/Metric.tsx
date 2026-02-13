import { cn } from "./cn";

export function Metric({
  label,
  value,
  icon,
  tone = "primary",
  className,
}: {
  label: string;
  value: string;
  icon?: string;
  tone?: "primary" | "gold" | "muted";
  className?: string;
}) {
  const color =
    tone === "gold" ? "text-gold" : tone === "primary" ? "text-primary" : "text-muted";
  return (
    <div className={cn("rounded-xl border border-white/10 bg-white/5 p-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
            {label}
          </div>
          <div className={cn("mt-2 truncate text-lg font-black tracking-tight", color)}>
            {value}
          </div>
        </div>
        {icon ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/20">
            <span className={cn("material-symbols-outlined", color)}>{icon}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

