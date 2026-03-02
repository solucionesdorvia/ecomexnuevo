import { Icon } from "@/components/ui/Icon";
import type { Quote } from "@/lib/quote/types";

function usd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function riskCopy(level: Quote["timing"]["riskLevel"]) {
  if (level === "high") return "Riesgo alto";
  if (level === "medium") return "Riesgo medio";
  return "Riesgo bajo";
}

function riskLabel(level: Quote["timing"]["riskLevel"]) {
  if (level === "high") return "ALTO";
  if (level === "medium") return "MEDIO";
  return "BAJO";
}

function riskBars(level: Quote["timing"]["riskLevel"]) {
  if (level === "high") return { on: 4, color: "bg-amber-500" };
  if (level === "medium") return { on: 3, color: "bg-emerald-500" };
  return { on: 2, color: "bg-emerald-500" };
}

export function ImpactRail({
  quote,
  onExportPdf,
  onFormalRequest,
}: {
  quote: Quote | null;
  onExportPdf?: () => void;
  onFormalRequest?: () => void;
}) {
  const total = quote ? usd(quote.costs.totalUsd) : "—";
  const timing = quote ? `${quote.timing.etaRangeDays[0]}–${quote.timing.etaRangeDays[1]} días` : "—";
  const nextShipment = quote
    ? new Date(quote.timing.nextShipmentDate).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })
    : "—";
  const occupancyPct = quote ? Number(quote.timing.containerOccupancy) : null;
  const risk = quote ? quote.timing.riskLevel : "low";
  const bars = riskBars(risk as any);

  return (
    <aside className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-[rgba(3,8,20,0.6)] p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-white">Resumen de Operación</h3>
        <div className="mt-4 flex flex-col items-center rounded-xl border border-[rgba(213,180,105,0.2)] bg-background-dark/80 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40">Costo total estimado</p>
          <p className="mt-1 text-4xl font-black tracking-tight text-[color:var(--color-gold)]">{total}</p>
          <p className="mt-2 text-[10px] uppercase text-white/35">USD · All‑in estimation</p>
        </div>
      </div>

      <div className="space-y-8 rounded-xl border border-white/10 bg-[rgba(3,8,20,0.45)] p-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-white/40">Nivel de riesgo</span>
            <span className={risk === "high" ? "text-xs font-bold text-amber-400" : risk === "medium" ? "text-xs font-bold text-emerald-400" : "text-xs font-bold text-emerald-400"}>
              {riskLabel(risk as any)}
            </span>
          </div>
          <div className="flex h-1.5 gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={[
                  "flex-1 rounded-full",
                  i < bars.on ? bars.color : "bg-white/10",
                ].join(" ")}
              />
            ))}
          </div>
          <p className="text-[10px] italic text-white/35">
            {quote ? `"${riskCopy(quote.timing.riskLevel)}"` : "—"}
          </p>
        </div>

        <div className="space-y-4">
          <span className="text-xs font-bold uppercase text-white/40">Línea de tiempo</span>
          <div className="relative space-y-4 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-white/10">
            <div className="relative flex gap-4">
              <div className="z-10 h-6 w-6 rounded-full border-4 border-[rgba(3,8,20,0.8)] bg-primary" />
              <div>
                <p className="text-xs font-bold leading-none text-white">Carga en origen</p>
                <p className="mt-1 text-[10px] text-white/35">Día 1–3 · Origen</p>
              </div>
            </div>
            <div className="relative flex gap-4 opacity-60">
              <div className="z-10 h-6 w-6 rounded-full border-4 border-[rgba(3,8,20,0.8)] bg-white/15" />
              <div>
                <p className="text-xs font-bold leading-none text-white/80">Tránsito marítimo</p>
                <p className="mt-1 text-[10px] text-white/35">~24 días · Ruta</p>
              </div>
            </div>
            <div className="relative flex gap-4 opacity-60">
              <div className="z-10 h-6 w-6 rounded-full border-4 border-[rgba(3,8,20,0.8)] bg-white/15" />
              <div>
                <p className="text-xs font-bold leading-none text-white/80">Despacho aduanal</p>
                <p className="mt-1 text-[10px] text-white/35">~2 días · AR</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2 border-t border-white/10 pt-4 text-xs">
          <div className="flex justify-between">
            <span className="text-white/35">Timeline</span>
            <span className="text-white/70">{timing}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/35">Próximo embarque</span>
            <span className="text-white/70">{nextShipment}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span className="text-white/35">Ocupación contenedor</span>
            <span className="text-[color:var(--color-gold)]">{occupancyPct == null ? "—" : `${occupancyPct}%`}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <button type="button" className="button button-primary" onClick={onExportPdf}>
          <Icon name="download" size={16} />
          Export PDF
        </button>
        <button type="button" className="button button-ghost" onClick={onFormalRequest}>
          <Icon name="handshake" size={16} />
          Pedir cotización formal
        </button>
      </div>
    </aside>
  );
}

