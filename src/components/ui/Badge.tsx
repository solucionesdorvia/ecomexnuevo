import { cn } from "./cn";
import { Icon } from "./Icon";

export function Badge({
  children,
  tone = "muted",
  className,
  icon,
}: {
  children: React.ReactNode;
  tone?: "muted" | "primary" | "success" | "gold" | "neutral";
  className?: string;
  icon?: string;
}) {
  const styles =
    tone === "primary"
      ? "border-[color:color-mix(in_oklab,var(--primary)_40%,transparent)] bg-[color:color-mix(in_oklab,var(--primary)_22%,transparent)] text-[color:color-mix(in_oklab,var(--primary)_82%,white_10%)]"
      : tone === "success"
        ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
        : tone === "gold"
          ? "border-[rgba(213,180,105,0.28)] bg-[rgba(213,180,105,0.12)] text-[#e6c98b]"
          : tone === "neutral"
            ? "border-subtle bg-[var(--surface)] text-strong"
            : "border-subtle bg-[color:color-mix(in_oklab,var(--surface2)_88%,transparent)] text-muted";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
        styles,
        className
      )}
    >
      {icon ? <Icon name={icon} size={14} className="text-current" /> : null}
      {children}
    </span>
  );
}

