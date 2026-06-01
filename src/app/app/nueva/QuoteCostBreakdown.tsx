"use client";

import { useEffect, useRef } from "react";
import { ChevronRight, Info } from "lucide-react";
import { ncmToPartida } from "@/lib/ncmDisplay";

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type TaxLine = {
  label: string;
  ratePct: number | null;
  amountUsd: number;
};

export type QuoteBreakdown = {
  qty: number;
  fobTotalUsd: number;
  fobTotalMinUsd?: number;
  fobTotalMaxUsd?: number;
  fleteMinUsd: number;
  fleteMode?: string;
  seguroMinUsd: number;
  impuestosTotalMinUsd: number;
  honorariosMinUsd: number;
  arancelSimUsd?: number;
  depositoPortuarioMinUsd: number;
  transporteNacionalMinUsd: number;
  transferenciaIntlMinUsd: number;
  totalMinUsd: number;
  totalMaxUsd: number;
  derechosRatePct?: number;
  teRatePct?: number;
  ivaRatePct?: number;
  ivaAdicRatePct?: number;
  taxLines?: TaxLine[];
};

export type QuoteCostPayload = {
  quoteId: string;
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
  breakdown?: QuoteBreakdown;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtUsd(n: number | undefined | null): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return (
    "USD " +
    new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n)
  );
}

function fmtRange(min: number | undefined, max: number | undefined): string {
  if (typeof min !== "number" || typeof max !== "number") return "—";
  const f = (n: number) =>
    new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  if (Math.abs(max - min) < 1) return `USD ${f(min)}`;
  return `USD ${f(min)} – ${f(max)}`;
}

function toneBorder(tone?: string) {
  switch (tone) {
    case "gold": return "border-amber-500/25 bg-amber-500/[0.07]";
    case "success": return "border-emerald-500/25 bg-emerald-500/[0.06]";
    case "primary": return "border-blue-500/25 bg-blue-500/[0.06]";
    default: return "border-white/[0.08] bg-[#0f172a]/80";
  }
}

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
              if (m) return <strong key={j} className="font-semibold text-slate-200">{m[1]}</strong>;
              return <span key={j}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}

// ─── Vista principal estilo plantilla E-COMEX ────────────────────────────────

function CostRow({
  label,
  value,
  isBlue = false,
  isSub = false,
  isIva = false,
  isTotal = false,
  isGrandTotal = false,
}: {
  label: string;
  value: string;
  isBlue?: boolean;
  isSub?: boolean;
  isIva?: boolean;
  isTotal?: boolean;
  isGrandTotal?: boolean;
}) {
  if (isTotal) {
    return (
      <div className="mt-3 flex items-baseline justify-between border-t border-[#1b3464]/40 pt-3">
        <span className="text-[13px] font-bold text-white">{label}</span>
        <span className="text-[14px] font-bold tabular-nums text-white">{value}</span>
      </div>
    );
  }
  if (isIva) {
    return (
      <div className="flex items-baseline justify-between py-[3px]">
        <span className={`text-[12px] font-medium ${isSub ? "pl-4" : ""} text-red-400`}>{isSub && "· "}{label}</span>
        <span className="text-[12px] tabular-nums text-red-400">{value}</span>
      </div>
    );
  }
  if (isGrandTotal) {
    return (
      <div className="flex items-baseline justify-between py-[3px]">
        <span className="text-[13px] font-bold text-white">{label}</span>
        <span className="text-[14px] font-bold tabular-nums text-white">{value}</span>
      </div>
    );
  }
  return (
    <div className={`flex items-baseline justify-between py-[3px] ${isSub ? "pl-4" : ""}`}>
      <span className={`text-[12px] ${isSub ? "text-slate-400" : "text-slate-300"} ${isBlue ? "text-blue-300" : ""}`}>
        {isSub && "· "}
        {label}
      </span>
      <span className={`text-[12px] tabular-nums ${isBlue ? "text-blue-300" : "text-slate-200"}`}>{value}</span>
    </div>
  );
}

function TemplateBreakdown({
  quote,
  b,
}: {
  quote: QuoteCostPayload;
  b: QuoteBreakdown;
}) {
  const isAir = (b.fleteMode ?? "").startsWith("air");
  const fleteLabel = isAir ? "Flete aéreo internacional" : "Flete marítimo internacional";
  const taxLines = b.taxLines ?? [];

  const ivaTotal = taxLines
    .filter((t) => t.label === "IVA" || t.label === "IVA Adicional")
    .reduce((sum, t) => sum + t.amountUsd, 0);

  const hasRange =
    typeof b.totalMinUsd === "number" &&
    typeof b.totalMaxUsd === "number" &&
    Math.abs(b.totalMaxUsd - b.totalMinUsd) > 0.5;

  const q = typeof quote.quality === "number" ? Math.round(quote.quality) : null;
  const qualityLabel =
    q == null
      ? null
      : q >= 80
      ? { text: "Datos completos", cls: "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-300" }
      : q >= 60
      ? { text: "Estimación estándar", cls: "border-blue-500/25 bg-blue-500/[0.07] text-blue-300" }
      : { text: "Estimación preliminar", cls: "border-amber-500/25 bg-amber-500/[0.08] text-amber-300" };

  return (
    <div className="rounded-2xl border border-white/[0.09] bg-gradient-to-b from-[#0a1422]/95 to-[#060d18] shadow-xl shadow-black/40">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
        <div>
          <h3
            className="text-[14px] font-semibold tracking-tight text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Cotización de importación
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">
            Estimación mínima en USD · Se confirma con datos técnicos y situación fiscal
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {qualityLabel && (
            <div className={`rounded-lg border px-2 py-1 text-[10px] font-semibold ${qualityLabel.cls}`}>
              {qualityLabel.text}
            </div>
          )}
          {quote.ncm && (
            <div className="rounded-md border border-amber-500/25 bg-amber-500/[0.08] px-2 py-1 font-mono text-[10px] font-semibold text-amber-300">
              Pos. {ncmToPartida(quote.ncm) || quote.ncm}
            </div>
          )}
        </div>
      </div>

      {/* Cost breakdown — estilo plantilla */}
      <div className="px-5 py-4 text-[12px]">
        {/* FOB */}
        <CostRow label={`FOB (${b.qty} ${b.qty === 1 ? "un." : "uns."}) *`} value={fmtUsd(b.fobTotalUsd)} isBlue />

        {/* Flete */}
        <CostRow label={fleteLabel} value={fmtUsd(b.fleteMinUsd)} />

        {/* Seguro */}
        <CostRow label="Seguro internacional" value={fmtUsd(b.seguroMinUsd)} />

        {/* Tributos */}
        <div className="mt-2">
          <CostRow label="Tributos aduaneros a pagar" value={fmtUsd(b.impuestosTotalMinUsd)} />
          {taxLines.length > 0 ? (
            taxLines.map((tl) => (
              <CostRow
                key={tl.label}
                isSub
                isIva={tl.label === "IVA" || tl.label === "IVA Adicional"}
                label={tl.ratePct != null ? `${tl.label} (${tl.ratePct}%)` : tl.label}
                value={fmtUsd(tl.amountUsd)}
              />
            ))
          ) : (
            <CostRow isSub label="Estimación (pendiente clasificación arancelaria)" value={fmtUsd(b.impuestosTotalMinUsd)} />
          )}
        </div>

        {/* Gestión */}
        <div className="mt-2">
          <CostRow label="Arancel SIM" value={fmtUsd(b.arancelSimUsd ?? 10)} />
          <CostRow label="Honorarios (1% FOB, mín. USD 300)" value={fmtUsd(b.honorariosMinUsd)} />
          <CostRow label="Gastos operativos" value={fmtUsd(b.depositoPortuarioMinUsd)} />
          <CostRow
            label="Gastos transporte nacional"
            value={b.transporteNacionalMinUsd > 0 ? fmtUsd(b.transporteNacionalMinUsd) : "—"}
          />
          <CostRow
            isBlue
            label="Gastos transferencia intl *"
            value={b.transferenciaIntlMinUsd > 0 ? fmtUsd(b.transferenciaIntlMinUsd) : "—"}
          />
        </div>

        {/* Totals */}
        <CostRow isTotal label="TOTAL" value={hasRange ? fmtRange(b.totalMinUsd, b.totalMaxUsd) : fmtUsd(b.totalMinUsd)} />
        {ivaTotal > 0 && (
          <CostRow isIva label="IVA (incluido en total)" value={fmtUsd(ivaTotal)} />
        )}
        <CostRow isGrandTotal label="TOTAL A PAGAR" value={hasRange ? fmtRange(b.totalMinUsd, b.totalMaxUsd) : fmtUsd(b.totalMinUsd)} />

        {/* Per-unit if qty > 1 */}
        {b.qty > 1 && typeof b.totalMinUsd === "number" && (
          <p className="mt-2 text-[10px] text-slate-600">
            ≈ {fmtUsd(b.totalMinUsd / b.qty)} por unidad puesto en Argentina (estimación mínima)
          </p>
        )}

        {/* Blue footnote */}
        <p className="mt-3 text-[10px] italic text-slate-600">
          * Ítems a tipo de cambio informal (blue). Resto al tipo de cambio oficial Banco Nación.
        </p>
      </div>
    </div>
  );
}

// ─── Vista fallback (cards genéricas) ────────────────────────────────────────

function CardsBreakdown({ quote }: { quote: QuoteCostPayload }) {
  const q = typeof quote.quality === "number" ? Math.round(quote.quality) : null;
  const qualityLabel =
    q == null
      ? null
      : q >= 80
      ? { text: "Datos completos", cls: "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-300" }
      : q >= 60
      ? { text: "Estimación estándar", cls: "border-blue-500/25 bg-blue-500/[0.07] text-blue-300" }
      : { text: "Estimación preliminar", cls: "border-amber-500/25 bg-amber-500/[0.08] text-amber-300" };

  const unitMin =
    quote.quantity && quote.quantity > 1 && quote.totalMinUsd
      ? (quote.totalMinUsd / quote.quantity).toFixed(0)
      : null;
  const unitMax =
    quote.quantity && quote.quantity > 1 && quote.totalMaxUsd
      ? (quote.totalMaxUsd / quote.quantity).toFixed(0)
      : null;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0f172a]/90 to-[#0a0f1a] p-4 shadow-xl shadow-black/30 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight text-white sm:text-[16px]" style={{ fontFamily: "var(--font-display)" }}>
            Costos estimados de importación
          </h3>
          <p className="mt-1.5 max-w-xl text-[12px] leading-relaxed text-slate-500">
            Rangos en USD. Se afinan con peso, volumen, origen y tu situación fiscal.
          </p>
        </div>
        {qualityLabel && (
          <div className={`flex shrink-0 items-center rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${qualityLabel.cls}`}>
            {qualityLabel.text}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-0">
        {quote.cards.map((card, i) => {
          const isTotal = card.highlight || card.label === "Total puesto en Argentina";
          return (
            <div
              key={card.label}
              className={`card-in border-b border-white/[0.05] py-3 last:border-0 ${isTotal ? "-mx-1 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-3.5" : ""}`}
              style={{ animationDelay: `${i * 55}ms` }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${isTotal ? "text-amber-200/90" : "text-slate-500"}`}>
                  {card.label}
                </span>
                <span className={`shrink-0 text-right text-[14px] font-semibold tabular-nums tracking-tight sm:text-[15px] ${isTotal ? "text-amber-100" : "text-slate-100"}`}>
                  {card.value}
                </span>
              </div>
              {card.detail && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 sm:text-[12px]">{card.detail}</p>
              )}
              {isTotal && unitMin && unitMax && (
                <p className="mt-1.5 text-[11px] leading-snug text-amber-300/60">
                  ≈ USD {unitMin}–{unitMax} por unidad puesto en Argentina
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

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

  const b = quote.breakdown;
  const hasBreakdown = b && typeof b.fobTotalUsd === "number" && Number.isFinite(b.fobTotalUsd);

  return (
    <div ref={rootRef}>
      {hasBreakdown ? (
        <TemplateBreakdown quote={quote} b={b!} />
      ) : (
        <CardsBreakdown quote={quote} />
      )}

      {/* Supuestos */}
      {quote.assumptions && quote.assumptions.length > 0 && (
        <details className="group mt-3 rounded-xl border border-white/[0.06] bg-[#0a0f1a] px-4 pb-0">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 py-3 text-[12px] font-medium text-slate-400 transition hover:text-slate-200 [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-4 w-4 shrink-0 transition group-open:rotate-90" aria-hidden />
            <Info className="h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden />
            Supuestos del cálculo
          </summary>
          <div className="grid gap-2 pb-4 sm:grid-cols-2">
            {quote.assumptions.map((a) => (
              <div key={a.id} className={`rounded-xl border px-3 py-2.5 ${toneBorder(a.tone)}`}>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">{a.label}</p>
                <p className="mt-1 text-[12px] leading-snug text-slate-300">{a.value}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Detalle analista */}
      {quote.explanation && (
        <details className="group mt-2 rounded-xl border border-white/[0.06] bg-[#0a0f1a] px-4 pb-0">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 py-3 text-[12px] font-medium text-slate-400 transition hover:text-slate-200 [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-4 w-4 shrink-0 transition group-open:rotate-90" aria-hidden />
            Detalle del analista
          </summary>
          <div className="rounded-xl border border-white/[0.06] bg-black/25 p-4 pb-4">
            <ExplanationLines text={quote.explanation} />
            <p className="mt-4 border-t border-white/[0.06] pt-3 text-[10px] leading-relaxed text-slate-600">
              ID: <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[10px] text-slate-500">{quote.quoteId}</code>
            </p>
          </div>
        </details>
      )}
    </div>
  );
}
