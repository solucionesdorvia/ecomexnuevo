"use client";

import { ConfidenceBadge } from "./ConfidenceBadge";

type Props = {
  ncm: string;
  description?: string;
  confidence: number;
  rationale?: string;
  discardedNotes?: string[];
  discardedCandidates?: unknown[];
  variant: "resolved" | "tentative";
};

export function ClassificationCard({
  ncm,
  description,
  confidence,
  rationale,
  variant,
}: Props) {
  const isResolved = variant === "resolved";

  return (
    <div
      className={`card-in rounded-2xl border p-4 sm:p-5 ${
        isResolved
          ? "border-emerald-500/20 bg-emerald-500/[0.05]"
          : "border-amber-500/15 bg-amber-500/[0.04]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${isResolved ? "text-emerald-400/60" : "text-amber-400/60"}`}>
            {isResolved ? "Clasificación NCM" : "Clasificación tentativa"}
          </p>
          <p className="mt-1.5 break-all font-mono text-[1.5rem] font-bold leading-tight tracking-tight text-white sm:text-[28px]">
            {ncm}
          </p>
          {description && (
            <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{description}</p>
          )}
        </div>
        <ConfidenceBadge value={confidence} className="shrink-0" />
      </div>

      {rationale && (
        <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
          {rationale}
        </p>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-slate-700">
        Clasificación orientativa — validar con despachante de aduana antes de operar.
      </p>
    </div>
  );
}
