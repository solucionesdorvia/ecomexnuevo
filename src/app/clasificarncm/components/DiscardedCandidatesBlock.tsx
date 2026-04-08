"use client";

import { Ban } from "lucide-react";
import { cn } from "@/components/ui/cn";

export type DiscardedItem = { code: string; reason: string };

type Props = {
  items: DiscardedItem[];
  /** full: card under classification; compact: sidebar */
  variant?: "full" | "compact";
  className?: string;
  maxItems?: number;
};

export function DiscardedCandidatesBlock({
  items,
  variant = "full",
  className,
  maxItems = 8,
}: Props) {
  const slice = items.slice(0, maxItems);
  if (!slice.length) return null;

  const compact = variant === "compact";

  return (
    <div
      className={cn(
        "rounded-lg border border-white/[0.06] bg-black/25",
        compact ? "px-2.5 py-2" : "border-white/[0.05] bg-black/20 px-3 py-2.5",
        className
      )}
    >
      <p
        className={cn(
          "flex items-center gap-1.5 font-semibold uppercase tracking-wider text-slate-500",
          compact ? "text-[9px]" : "text-[10px]"
        )}
      >
        <Ban className={cn("shrink-0 text-slate-600", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
        Posiciones descartadas
      </p>
      <ul
        className={cn(
          "mt-2 space-y-2.5",
          compact && "max-h-[200px] overflow-y-auto pr-1 [scrollbar-width:thin]"
        )}
      >
        {slice.map((d, i) => (
          <li
            key={`${d.code}-${i}`}
            className="min-w-0 border-l-2 border-rose-500/25 pl-2.5"
          >
            <p className="break-all font-mono text-[11px] font-semibold tracking-tight text-slate-300">{d.code}</p>
            <p
              className={cn(
                "mt-0.5 hyphens-auto break-words leading-snug text-slate-500 [overflow-wrap:anywhere]",
                compact ? "text-[10px]" : "text-[11px]"
              )}
            >
              {d.reason}
            </p>
          </li>
        ))}
      </ul>
      {items.length > maxItems ? (
        <p className="mt-2 text-[10px] text-slate-600">+{items.length - maxItems} más…</p>
      ) : null}
    </div>
  );
}
