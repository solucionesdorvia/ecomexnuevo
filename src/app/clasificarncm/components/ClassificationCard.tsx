"use client";

import { ConfidenceBadge } from "./ConfidenceBadge";
import { DiscardedCandidatesBlock, type DiscardedItem } from "./DiscardedCandidatesBlock";
import { ShieldAlert } from "lucide-react";

type Props = {
  ncm: string;
  description?: string;
  confidence: number;
  rationale?: string;
  discardedNotes?: string[];
  discardedCandidates?: DiscardedItem[];
  variant: "resolved" | "tentative";
};

export function ClassificationCard({
  ncm,
  description,
  confidence,
  rationale,
  discardedNotes,
  discardedCandidates,
  variant,
}: Props) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-xl ${
        variant === "resolved"
          ? "border-emerald-500/25 bg-emerald-500/[0.07]"
          : "border-amber-500/20 bg-amber-500/[0.06]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
            {variant === "resolved" ? "Clasificación sugerida" : "Clasificación tentativa"}
          </p>
          <p className="mt-1 font-mono text-[26px] font-bold tracking-tight text-white">{ncm}</p>
        </div>
        <ConfidenceBadge value={confidence} />
      </div>
      {description ? (
        <p className="mt-3 text-[13px] leading-relaxed text-slate-300">{description}</p>
      ) : null}
      {rationale ? (
        <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
          <span className="font-medium text-slate-500">Criterio: </span>
          {rationale}
        </p>
      ) : null}
      {discardedCandidates && discardedCandidates.length > 0 ? (
        <DiscardedCandidatesBlock items={discardedCandidates} variant="full" className="mt-3" maxItems={8} />
      ) : discardedNotes && discardedNotes.length > 0 ? (
        <div className="mt-3 rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Descartes / matices
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[11px] text-slate-500">
            {discardedNotes.slice(0, 6).map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-4 flex gap-2 rounded-xl border border-slate-600/30 bg-slate-900/50 px-3 py-2.5">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        <p className="text-[11px] leading-relaxed text-slate-500">
          Clasificación orientativa sujeta a validación profesional y documentación de importación.
        </p>
      </div>
    </div>
  );
}
