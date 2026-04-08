"use client";

import type { NcmCandidateItem } from "@/lib/clasificar-ncm/types";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { Layers } from "lucide-react";

export function SuggestedCandidatesList({ candidates }: { candidates: NcmCandidateItem[] }) {
  if (!candidates.length) return null;
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0b1220] p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        <Layers className="h-3.5 w-3.5" />
        Candidatos NCM
      </div>
      <ul className="mt-3 max-h-64 space-y-3 overflow-y-auto">
        {candidates.map((c, i) => (
          <li
            key={`${c.code}-${i}`}
            className="rounded-xl border border-white/[0.05] bg-[#0f172a]/80 px-3 py-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[14px] font-semibold text-white">{c.code}</span>
              <ConfidenceBadge value={c.confidence} />
            </div>
            <p className="mt-1 text-[12px] leading-snug text-slate-400">{c.description}</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{c.rationale}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
