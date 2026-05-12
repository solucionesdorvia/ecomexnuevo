"use client";

import { useEffect, useRef } from "react";
import { ChevronRight, Info } from "lucide-react";

export type QuoteCostPayload = {
  quoteId: string;
  /** NCM final ya enriquecido por PCRAM/motor (puede estar ausente si la
   * cotización se creó sólo con datos comerciales sin clasificación firme). */
  ncm?: string;
  cards: Array<{ label: string; value: string; detail?: string; highlight?: boolean }>;
  totalMinUsd?: number;
  totalMaxUsd?: number;
  explanation?: string;
  assumptions?: Array<{
    id: string;
    label: string;
    value: string;
    source?: string;
    tone?: "muted" | "primary" | "gold" | "success";
  }>;
  quality?: number;
  quantity?: number;
};

function toneBorder(tone?: string) {
  switch (tone) {
    case "gold":
      return "border-amber-500/25 bg-amber-500/[0.07]";
    case "success":
      return "border-emerald-500/25 bg-emerald-500/[0.06]";
    case "primary":
      return "border-blue-500/25 bg-blue-500/[0.06]";
    default:
      return "border-white/[0.08] bg-[#0f172a]/80";
  }
}

/** Renderiza **negritas** simples del texto del motor. */
function ExplanationLines({ text }: { text: string }) {
  const lines = text.trim().split("\n");
  return (
    <div className="space-y-2 text-[13px] leading-relaxed text-slate-400">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className="text-balance">
            {parts.map((part, j) => {
              const m = part.match(/^\*\*(.+)\*\*$/);
              if (m) {
                return (
                  <strong key={j} className="font-semibold text-slate-200">
                    {m[1]}
                  </strong>
                );
              }
              return <span key={j}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}

export function QuoteCostBreakdown({
  quote,
  scrollIntoViewOnMount,
}: {
  quote: QuoteCostPayload;
  scrollIntoViewOnMount?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollIntoViewOnMount || !rootRef.current) return;
    rootRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [scrollIntoViewOnMount]);

  const q = typeof quote.quality === "number" ? Math.round(quote.quality) : null;
  const qualityLabel =
    q == null ? null : q >= 80 ? { text: "Datos completos", cls: "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-300" } : q >= 60 ? { text: "Estimación estándar", cls: "border-blue-500/25 bg-blue-500/[0.07] text-blue-300" } : { text: "Estimación preliminar", cls: "border-amber-500/25 bg-amber-500/[0.08] text-amber-300" };

  const unitMin =
    quote.quantity && quote.quantity > 1 && quote.totalMinUsd
      ? (quote.totalMinUsd / quote.quantity).toFixed(0)
      : null;
  const unitMax =
    quote.quantity && quote.quantity > 1 && quote.totalMaxUsd
      ? (quote.totalMaxUsd / quote.quantity).toFixed(0)
      : null;

  return (
    <div
      ref={rootRef}
      className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0f172a]/90 to-[#0a0f1a] p-4 shadow-xl shadow-black/30 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div>
          <h3
            className="text-[15px] font-semibold tracking-tight text-white sm:text-[16px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Costos estimados de importación
          </h3>
          <p className="mt-1.5 max-w-xl text-[12px] leading-relaxed text-slate-500">
            Rangos en USD para evitar falsa precisión. Flete, despacho y percepciones se afinan con peso, volumen, origen
            y tu situación fiscal.
          </p>
        </div>
        {qualityLabel ? (
          <div
            className={`flex shrink-0 items-center rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${qualityLabel.cls}`}
            title="Nivel de completitud de los datos usados para la estimación"
          >
            {qualityLabel.text}
          </div>
        ) : null}
      </div>

      <div className="mt-4 space-y-0">
        {quote.cards.map((card) => {
          const isTotal = card.highlight || card.label === "Total puesto en Argentina";
          return (
            <div
              key={card.label}
              className={`border-b border-white/[0.05] py-3 last:border-0 ${
                isTotal ? "-mx-1 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-3.5" : ""
              }`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${
                    isTotal ? "text-amber-200/90" : "text-slate-500"
                  }`}
                >
                  {card.label}
                </span>
                <span
                  className={`shrink-0 text-right text-[14px] font-semibold tabular-nums tracking-tight sm:text-[15px] ${
                    isTotal ? "text-amber-100" : "text-slate-100"
                  }`}
                >
                  {card.value}
                </span>
              </div>
              {card.detail ? (
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 sm:text-[12px]">{card.detail}</p>
              ) : null}
              {isTotal && unitMin && unitMax ? (
                <p className="mt-1.5 text-[11px] leading-snug text-amber-300/60">
                  ≈ USD {unitMin}–{unitMax} por unidad puesto en Argentina
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {quote.assumptions && quote.assumptions.length > 0 ? (
        <details className="group mt-5 border-t border-white/[0.06] pt-4">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-[12px] font-medium text-slate-400 transition hover:text-slate-200 [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-4 w-4 shrink-0 transition group-open:rotate-90" aria-hidden />
            <Info className="h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden />
            Supuestos del cálculo
          </summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {quote.assumptions.map((a) => (
              <div
                key={a.id}
                className={`rounded-xl border px-3 py-2.5 ${toneBorder(a.tone)}`}
              >
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">{a.label}</p>
                <p className="mt-1 text-[12px] leading-snug text-slate-300">{a.value}</p>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {quote.explanation ? (
        <details className="group mt-5 border-t border-white/[0.06] pt-4">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-[12px] font-medium text-slate-400 transition hover:text-slate-200 [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-4 w-4 shrink-0 transition group-open:rotate-90" aria-hidden />
            Detalle del analista (cómo se armó la estimación)
          </summary>
          <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/25 p-4">
            <ExplanationLines text={quote.explanation} />
            <p className="mt-4 border-t border-white/[0.06] pt-3 text-[10px] leading-relaxed text-slate-600">
              ID: <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[10px] text-slate-500">{quote.quoteId}</code>
            </p>
          </div>
        </details>
      ) : (
        <p className="mt-4 text-[10px] leading-relaxed text-slate-700">
          ID: <code className="font-mono text-slate-600">{quote.quoteId}</code>
        </p>
      )}
    </div>
  );
}
