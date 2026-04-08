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
  const tone =
    pct >= 70 ? "text-emerald-400/95 bg-emerald-500/10 border-emerald-500/20" : pct >= 45 ? "text-amber-400/95 bg-amber-500/10 border-amber-500/20" : "text-rose-300/90 bg-rose-500/10 border-rose-500/20";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-semibold tabular-nums tracking-tight",
        tone,
        className
      )}
    >
      {pct}%
    </span>
  );
}
