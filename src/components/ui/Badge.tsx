import { cn } from "./cn";

export function Badge({
  children,
  tone = "muted",
  className,
  icon,
}: {
  children: React.ReactNode;
  tone?: "muted" | "primary" | "gold" | "success";
  className?: string;
  icon?: string;
}) {
  const styles =
    tone === "primary"
      ? "border-primary/20 bg-primary/10 text-primary"
      : tone === "gold"
        ? "border-gold/30 bg-gold/15 text-gold"
        : tone === "success"
          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-400"
          : "border-white/10 bg-white/5 text-muted";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]",
        styles,
        className
      )}
    >
      {icon ? (
        <span className="material-symbols-outlined text-[14px]">{icon}</span>
      ) : null}
      {children}
    </span>
  );
}

