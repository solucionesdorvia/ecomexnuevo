"use client";

import { cn } from "@/components/ui/cn";

export function ConfidenceBadge({
  value,
  className,
}: {
  /** 0–1 */
  value: number;
  className?: string;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const { label, tone } =
    pct >= 70
      ? { label: "Alta confianza", tone: "text-emerald-400/95 bg-emerald-500/10 border-emerald-500/20" }
      : pct >= 45
        ? { label: "Confianza media", tone: "text-amber-400/95 bg-amber-500/10 border-amber-500/20" }
        : { label: "Verificar", tone: "text-rose-300/90 bg-rose-500/10 border-rose-500/20" };

  return (
    <span
      className={cn(
        "inline-flex flex-col items-end rounded-lg border px-2.5 py-1.5 text-right",
        tone,
        className
      )}
    >
      <span className="text-[11px] font-semibold leading-none">{label}</span>
      <span className="mt-0.5 text-[9px] font-medium opacity-60 tabular-nums">{pct}%</span>
    </span>
  );
}
