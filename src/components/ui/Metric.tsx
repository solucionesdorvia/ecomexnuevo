import { cn } from "./cn";
import { Icon } from "./Icon";

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
    tone === "gold" ? "text-white" : tone === "primary" ? "text-white" : "text-white/70";
  return (
    <div className={cn("glass-panel rounded-2xl p-4", className)}>
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
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <Icon name={icon} size={18} className={cn("text-white/80")} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

