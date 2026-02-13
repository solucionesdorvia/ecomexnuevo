import { cn } from "./cn";

export function TimelineStep({
  title,
  subtitle,
  eta,
  status = "pending",
  className,
}: {
  title: string;
  subtitle?: string;
  eta?: string;
  status?: "pending" | "active" | "done";
  className?: string;
}) {
  const dot =
    status === "done"
      ? "bg-emerald-500"
      : status === "active"
        ? "bg-primary shadow-[0_0_10px_rgba(15,73,189,0.55)]"
        : "bg-white/20";
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <div className="mt-1 flex flex-col items-center">
        <div className={cn("h-2.5 w-2.5 rounded-full", dot)} />
        <div className="mt-2 h-full w-px bg-white/10" />
      </div>
      <div className="min-w-0 pb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="text-sm font-bold text-white">{title}</div>
          {eta ? (
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
              {eta}
            </div>
          ) : null}
        </div>
        {subtitle ? (
          <div className="mt-1 text-xs leading-relaxed text-muted">{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}

