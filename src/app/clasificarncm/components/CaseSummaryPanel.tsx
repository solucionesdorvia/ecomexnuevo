"use client";

import { useState } from "react";
import { AMBIGUITY_REASON_LABELS } from "@/lib/clasificar-ncm/ncmAmbiguity";
import type { CaseState } from "@/lib/clasificar-ncm/types";
import { DiscardedCandidatesBlock } from "./DiscardedCandidatesBlock";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ChevronDown, Cpu, Package, PanelLeft, Target } from "lucide-react";
import { cn } from "@/components/ui/cn";

const STATUS_LABEL: Record<string, string> = {
  idle: "Listo",
  analyzing: "Analizando",
  needs_info: "Faltan datos",
  tentative: "Tentativo",
  resolved: "Resuelto",
  error: "Error",
};

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="border-b border-white/[0.04] py-2 last:border-0">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 break-words text-[12px] leading-snug text-slate-300">{value}</p>
    </div>
  );
}

export function CaseSummaryPanel({
  caseState,
  pending,
  className,
}: {
  caseState: CaseState;
  pending: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const s = caseState;
  const displayStatus = pending ? "analyzing" : s.status;
  const mat = s.materials?.length ? s.materials.join(", ") : undefined;

  const body = (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2">
          <PanelLeft className="h-4 w-4 text-[#18C3D6]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Resumen del caso
          </span>
        </div>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-[10px] font-semibold",
            displayStatus === "resolved" && "bg-emerald-500/15 text-emerald-400",
            displayStatus === "tentative" && "bg-amber-500/15 text-amber-400",
            displayStatus === "needs_info" && "bg-sky-500/15 text-sky-400",
            displayStatus === "analyzing" && "bg-[#18C3D6]/15 text-[#18C3D6]",
            displayStatus === "error" && "bg-rose-500/15 text-rose-400",
            displayStatus === "idle" && "bg-slate-700/40 text-slate-400"
          )}
        >
          {STATUS_LABEL[displayStatus] ?? displayStatus}
        </span>
      </div>

      <div className="mt-1 space-y-0">
        <Row label="Producto" value={s.productName} />
        <Row label="Función principal" value={s.mainFunction} />
        <Row label="Materiales" value={mat} />
        <Row label="Uso" value={s.use} />
        <div className="border-b border-white/[0.04] py-2 last:border-0">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Tipo</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-slate-300">
            <Package className="h-3.5 w-3.5 text-slate-500" />
            {s.productType ?? "—"}
          </p>
        </div>
        <Row label="Sector" value={s.industry} />
        {typeof s.confidence === "number" ? (
          <div className="flex items-center justify-between gap-2 py-2">
            <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
              <Target className="h-3.5 w-3.5" />
              Confianza motor
            </span>
            <ConfidenceBadge value={s.confidence} />
          </div>
        ) : null}
        {s.recommendedNcm ? (
          <div className="rounded-lg border border-white/[0.06] bg-black/25 px-2.5 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">NCM prioritaria</p>
            <p className="mt-0.5 break-all font-mono text-[15px] font-semibold leading-tight text-white">{s.recommendedNcm}</p>
          </div>
        ) : null}
        {s.discardedCandidates && s.discardedCandidates.length > 0 ? (
          <div className="pt-1">
            <DiscardedCandidatesBlock items={s.discardedCandidates} variant="compact" maxItems={6} />
          </div>
        ) : null}
        {s.missingCriticalData && s.missingCriticalData.length > 0 ? (
          <div className="pt-2">
            <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-amber-500/90">
              <Cpu className="h-3.5 w-3.5" />
              Datos críticos
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-slate-500">
              {s.missingCriticalData.slice(0, 5).map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {s.ambiguity ? (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-2.5 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-amber-500/90">Ambigüedad</p>
            <p className="mt-1 text-[11px] leading-snug text-slate-400">
              {AMBIGUITY_REASON_LABELS[s.ambiguity.reason]}
            </p>
            <p className="mt-1 text-[11px] text-slate-300">
              <span className="text-slate-500">Dato decisivo:</span> {s.ambiguity.decisiveField}
            </p>
            {s.ambiguity.competingCandidates?.length ? (
              <p className="mt-1 font-mono text-[10px] text-slate-500">
                {s.ambiguity.competingCandidates.slice(0, 4).join(" · ")}
              </p>
            ) : null}
            {s.ambiguity.answered ? (
              <p className="mt-1 text-[10px] text-slate-500">Respuesta del usuario recibida; puede seguir afinándose.</p>
            ) : (
              <p className="mt-1 text-[10px] text-amber-500/80">Pendiente de respuesta</p>
            )}
          </div>
        ) : null}
      </div>
    </>
  );

  return (
    <div className={cn("w-full shrink-0 lg:w-[300px]", className)}>
      <button
        type="button"
        className="mb-2 flex min-h-[48px] w-full items-center justify-between rounded-xl border border-white/[0.08] bg-[#0f172a]/90 px-3 py-3 text-left active:bg-[#0f172a] lg:hidden"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="text-[13px] font-medium text-slate-300">Resumen del caso</span>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-slate-500 transition", open && "rotate-180")} />
      </button>
      <aside
        className={cn(
          "rounded-2xl border border-white/[0.06] bg-[#0b1220]/95 p-4 shadow-xl shadow-black/40 backdrop-blur-sm max-lg:max-h-[min(70vh,520px)] max-lg:overflow-y-auto max-lg:overscroll-contain lg:sticky lg:top-4 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto",
          open ? "block" : "hidden lg:block"
        )}
      >
        {body}
      </aside>
    </div>
  );
}
