"use client";

import { useMemo, useState } from "react";
import { AnalysisModule } from "@/components/analysis/AnalysisModule";
import { ImpactRail } from "@/components/analysis/ImpactRail";
import { Icon } from "@/components/ui/Icon";
import { can } from "@/lib/auth/permissions";
import { analyzeProduct } from "@/lib/quote/mockAnalyze";
import type { AnalysisModuleKey, Quote } from "@/lib/quote/types";
import Link from "next/link";

const MODULE_ORDER: AnalysisModuleKey[] = [
  "product",
  "description",
  "ncm",
  "regulations",
  "costs",
  "timing",
  "report",
];

function usd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function CotizarClient({
  currentRole,
}: {
  currentRole: "user" | "operator" | "admin";
}) {
  const role = currentRole;
  const [input, setInput] = useState("");
  const [quantity, setQuantity] = useState("120");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [description, setDescription] = useState("");

  async function runAnalysis() {
    setLoading(true);
    setStep(0);
    setQuote(null);

    const progressive = window.setInterval(() => {
      setStep((prev) => (prev >= MODULE_ORDER.length ? MODULE_ORDER.length : prev + 1));
    }, 360);

    try {
      const result = await analyzeProduct({
        input,
        quantity: Number(quantity) || 120,
      });
      setQuote(result);
      setDescription(result.normalizedDescription);
      setStep(MODULE_ORDER.length);
      try {
        const key = "ecomex_quote_totals_history";
        const prev = JSON.parse(window.localStorage.getItem(key) ?? "[]") as number[];
        const next = [result.costs.totalUsd, ...prev].slice(0, 10);
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // ignore
      }
    } finally {
      window.clearInterval(progressive);
      setLoading(false);
    }
  }

  const finishedModule = useMemo(
    () => (key: AnalysisModuleKey) => MODULE_ORDER.indexOf(key) < step,
    [step]
  );

  const summary = useMemo(() => {
    if (!quote) return null;
    const taxRatio = (quote.costs.importDutyUsd + quote.costs.ivaUsd) / quote.costs.totalUsd;
    const confidence = quote.ncm.confidence;
    const highRisk = quote.timing.riskLevel === "high";
    const mediumRisk = quote.timing.riskLevel === "medium";
    const recommendation =
      highRisk || confidence < 0.72
        ? "Ajustar variables"
        : mediumRisk || taxRatio > 0.38
          ? "Esperar"
          : "Importar ahora";
    const reasons = [
      `Confianza NCM ${Math.round(confidence * 100)}%.`,
      `Carga tributaria estimada ${Math.round(taxRatio * 100)}% del total.`,
      `Ventana logística ${quote.timing.etaRangeDays[0]}-${quote.timing.etaRangeDays[1]} días.`,
      `${quote.regulations.length} requerimientos identificados.`,
    ];
    return { recommendation, reasons, risk: quote.timing.riskLevel };
  }, [quote]);

  const benchmark = useMemo(() => {
    if (!quote) return null;
    try {
      const raw = JSON.parse(window.localStorage.getItem("ecomex_quote_totals_history") ?? "[]") as number[];
      const values = raw.filter((x) => Number.isFinite(x) && x > 0);
      if (values.length < 3) return { enough: false as const };
      const avg = values.reduce((acc, x) => acc + x, 0) / values.length;
      const delta = quote.costs.totalUsd - avg;
      const deltaPct = avg ? (delta / avg) * 100 : 0;
      return { enough: true as const, avg, delta, deltaPct };
    } catch {
      return { enough: false as const };
    }
  }, [quote]);

  return (
    <div className="flex min-h-[100dvh] w-full overflow-hidden bg-background-dark text-slate-100">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-[rgba(16,29,52,0.55)] md:flex">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon name="shield_with_heart" size={18} className="text-current" />
            </div>
            <div className="text-lg font-extrabold tracking-tight text-white">E‑COMEX</div>
          </div>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto px-4 pb-6">
          <div className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-white/35">
            General
          </div>
          <Link
            href="/account"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Icon name="dashboard" size={18} className="text-white/55" />
            Dashboard
          </Link>
          <Link
            href="/cotizar"
            className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/15 px-3 py-2 text-sm font-semibold text-primary"
          >
            <Icon name="add_chart" size={18} className="text-current" />
            Nueva Cotización
          </Link>
          <Link
            href="/cotizaciones"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Icon name="description" size={18} className="text-white/55" />
            Operaciones
          </Link>
          <div className="pt-6">
            <div className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-white/35">
              Herramientas
            </div>
            <Link
              href="/tendencias"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Icon name="analytics" size={18} className="text-white/55" />
              Reportes
            </Link>
            <Link
              href="/ajustes"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Icon name="settings" size={18} className="text-white/55" />
              Configuración
            </Link>
          </div>
        </nav>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[rgba(16,29,52,0.35)] px-6 backdrop-blur-md">
          <div className="flex items-center gap-3 text-sm text-white/45">
            <span>Operaciones</span>
            <Icon name="chevron_right" size={16} className="text-white/30" />
            <span className="font-medium text-white">Import Analysis Flow</span>
          </div>
          <div className="header-status">
            <span className="badge-live">EN VIVO</span>
            <span className="badge-risk">RIESGO CONTROLADO</span>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto p-6 md:p-8">
            <div className="mx-auto w-full max-w-4xl space-y-8">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white">
                  Import Analysis Flow
                </h1>
                <p className="mt-2 text-white/45">
                  URL o descripción -&gt; módulos estructurados -&gt; decisión
                </p>
              </div>

              <div className="flex items-center gap-4 py-2">
                {[
                  { id: "product", label: "Producto", idx: 0 },
                  { id: "logistics", label: "Logística", idx: 1 },
                  { id: "taxes", label: "Impuestos", idx: 2 },
                ].map((s, i, arr) => {
                  const active = step >= (s.idx === 0 ? 1 : s.idx === 1 ? 4 : 6);
                  return (
                    <div key={s.id} className="flex min-w-0 flex-1 items-center gap-3">
                      <div
                        className={[
                          "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                          active ? "bg-primary text-white" : "border border-white/20 text-white/35",
                        ].join(" ")}
                      >
                        {i + 1}
                      </div>
                      <div className={active ? "text-sm font-semibold text-white" : "text-sm text-white/35"}>
                        {s.label}
                      </div>
                      {i < arr.length - 1 ? <div className="h-px flex-1 bg-white/10" /> : null}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-6">
                <AnalysisModule
                  title="A) Product Snapshot"
                  subtitle="Ingresá URL o descripción para iniciar el pipeline."
                  icon="open_in_new"
                  done={finishedModule("product")}
                  loading={loading && !finishedModule("product")}
                >
                  <div className="entry-grid">
                    <textarea
                      className="field field-textarea"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="https://supplier.com/product/sku-001 o descripción detallada del producto"
                    />
                    <div className="entry-side">
                      <label className="field-label">Cantidad estimada</label>
                      <input
                        className="field"
                        inputMode="numeric"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                      />
                      <button type="button" className="button button-primary h-11" onClick={() => void runAnalysis()}>
                        <Icon name="bolt" size={16} />
                        {loading ? "Analizando..." : "Construir análisis"}
                      </button>
                    </div>
                  </div>

                  {quote ? (
                    <div className="snapshot-row">
                      <img src={quote.scrape.images[0]} alt="" />
                      <div>
                        <p className="snapshot-title">{quote.scrape.title}</p>
                        <p className="snapshot-meta">
                          {quote.scrape.supplier} · {quote.scrape.originCountry} · {usd(quote.scrape.unitPrice)} c/u
                        </p>
                      </div>
                    </div>
                  ) : null}
                </AnalysisModule>

                {finishedModule("description") ? (
                  <AnalysisModule
                    title="B) Normalized Description"
                    subtitle="Editable y usada para clasificación NCM."
                    icon="summarize"
                    done
                  >
                    <textarea
                      className="field field-textarea min-h-[120px]"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </AnalysisModule>
                ) : null}

                {finishedModule("ncm") && quote ? (
                  <AnalysisModule title="C) NCM Classification" subtitle="Confianza + candidatos." icon="gavel" done>
                    <div className="ncm-headline">
                      <strong>{quote.ncm.ncm}</strong>
                      <span>{Math.round(quote.ncm.confidence * 100)}% confianza</span>
                    </div>
                    <div className="candidate-list">
                      {quote.ncm.candidates.map((candidate) => (
                        <div key={candidate.ncm} className="candidate-row">
                          <div>
                            <p>{candidate.ncm}</p>
                            <small>{candidate.label}</small>
                          </div>
                          <span>{Math.round(candidate.confidence * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </AnalysisModule>
                ) : null}

                {finishedModule("regulations") && quote ? (
                  <AnalysisModule
                    title="D) Regulations & Requirements"
                    subtitle="Checklist operativo para validar despacho."
                    icon="verified_user"
                    done
                  >
                    <div className="check-grid">
                      {quote.regulations.map((item) => (
                        <article key={item.id} className={`check-item is-${item.status}`}>
                          <p>{item.title}</p>
                          <span>{item.status}</span>
                        </article>
                      ))}
                    </div>
                  </AnalysisModule>
                ) : null}

                {finishedModule("costs") && quote ? (
                  <AnalysisModule title="E) Cost Breakdown" subtitle="Landed cost total y estructura." icon="calculate" done>
                    <div className="cost-grid">
                      {[
                        ["FOB", quote.costs.fobUsd],
                        ["Flete", quote.costs.freightUsd],
                        ["Seguro", quote.costs.insuranceUsd],
                        ["Tributos", quote.costs.importDutyUsd + quote.costs.estadisticaUsd],
                        ["IVA", quote.costs.ivaUsd],
                        ["Honorarios + gestión", quote.costs.dispatchFeesUsd + quote.costs.inlandLogisticsUsd],
                      ].map(([label, value]) => (
                        <div key={String(label)} className="cost-cell">
                          <p>{label}</p>
                          <strong>{usd(Number(value))}</strong>
                        </div>
                      ))}
                    </div>
                  </AnalysisModule>
                ) : null}

                {finishedModule("timing") && quote ? (
                  <AnalysisModule title="F) Timing & Logistics" subtitle="ETAs, riesgos y próxima salida." icon="sailing" done>
                    <div className="timing-block">
                      <p>
                        Ruta estimada: <strong>{quote.timing.route}</strong>
                      </p>
                      <p>
                        ETA: <strong>{quote.timing.etaRangeDays[0]}–{quote.timing.etaRangeDays[1]} días</strong>
                      </p>
                      <ul>
                        {quote.timing.riskNotes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  </AnalysisModule>
                ) : null}

                {finishedModule("report") && quote ? (
                  <AnalysisModule title="G) Report Preview + Export" subtitle="Resumen ejecutivo para cliente." icon="picture_as_pdf" done>
                    <p className="report-summary">{quote.reportSummary}</p>
                    <div className="report-actions">
                      <button type="button" className="button button-primary">
                        <Icon name="download" size={16} />
                        Exportar PDF
                      </button>
                      <button type="button" className="button button-ghost">
                        <Icon name="handshake" size={16} />
                        Pedir cotización formal
                      </button>
                    </div>
                  </AnalysisModule>
                ) : null}

                {summary ? (
                  <AnalysisModule
                    title="H) Decision Summary"
                    subtitle="Recomendación final según riesgo, regulación y costos."
                    icon="task_alt"
                    done
                  >
                    <div className="space-y-6">
                      <div className="overflow-hidden rounded-xl border border-[rgba(140,177,236,0.2)] bg-[rgba(33,23,54,0.7)] shadow-2xl md:flex">
                        <div className="relative h-40 md:w-1/3">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-[#5AA2FF]/40"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="material-symbols-outlined text-7xl text-white/50">verified</span>
                          </div>
                        </div>
                        <div className="flex-1 p-6">
                          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                            Import Intelligence Verdict
                          </p>
                          <h3 className="mb-4 text-xl font-bold text-white">RECOMENDACIÓN DE IMPORT INTELLIGENCE</h3>
                          <div className="inline-flex items-center rounded-lg border border-[#5AA2FF]/20 bg-[#5AA2FF]/10 px-6 py-3">
                            <span className="text-2xl font-black tracking-tighter text-[#5AA2FF]">{summary.recommendation}</span>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl border border-[rgba(140,177,236,0.2)] bg-[rgba(16,29,52,0.5)] p-6">
                        <h4 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
                          <span className="material-symbols-outlined text-primary">fact_check</span>
                          Key Success Factors
                        </h4>
                        <div className="grid gap-3 md:grid-cols-2">
                          {summary.reasons.map((reason) => (
                            <div
                              key={reason}
                              className="flex items-start gap-3 rounded-lg border border-[rgba(140,177,236,0.2)] bg-[rgba(3,8,20,0.45)] p-3"
                            >
                              <div className="rounded-full bg-emerald-500/20 p-2">
                                <span className="material-symbols-outlined text-emerald-400">check_circle</span>
                              </div>
                              <p className="text-sm text-slate-300">{reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="button button-primary">
                          <Icon name="download" size={16} />
                          Exportar
                        </button>
                        <button
                          type="button"
                          className="button button-ghost"
                          disabled={!can(role, "quote:validate")}
                          title={!can(role, "quote:validate") ? "Acción disponible para operador/admin." : undefined}
                        >
                          <Icon name="support_agent" size={16} />
                          Enviar a experto
                        </button>
                        <button type="button" className="button button-ghost">
                          <Icon name="save" size={16} />
                          Guardar draft
                        </button>
                      </div>
                    </div>
                  </AnalysisModule>
                ) : null}

                {benchmark ? (
                  <AnalysisModule
                    title="I) Cost Benchmark"
                    subtitle="Comparación contra histórico local reciente."
                    icon="signal_cellular_alt"
                    done
                  >
                    {"enough" in benchmark && benchmark.enough ? (
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="group rounded-xl border border-primary/20 bg-primary/5 p-6 transition-all hover:border-primary/40">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-sm font-medium uppercase tracking-wider text-slate-400">Cotización Actual</p>
                            <span className="material-symbols-outlined text-primary/50">receipt_long</span>
                          </div>
                          <p className="text-3xl font-bold text-primary">{usd(quote!.costs.totalUsd)}</p>
                        </div>
                        <div className="group rounded-xl border border-primary/20 bg-primary/5 p-6 transition-all hover:border-primary/40">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-sm font-medium uppercase tracking-wider text-slate-400">Promedio Histórico</p>
                            <span className="material-symbols-outlined text-primary/50">history</span>
                          </div>
                          <p className="text-3xl font-bold text-white">{usd(benchmark.avg)}</p>
                        </div>
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-sm font-medium uppercase tracking-wider text-emerald-300">Diferencia de Eficiencia</p>
                            <span className="material-symbols-outlined text-emerald-300/70">trending_up</span>
                          </div>
                          <p className="text-3xl font-bold text-emerald-300">
                            {benchmark.deltaPct > 0 ? "+" : ""}
                            {Math.abs(benchmark.deltaPct).toFixed(1)}%
                          </p>
                          <p className="text-xs font-semibold text-emerald-300/75">
                            {benchmark.delta <= 0 ? "Más eficiente que histórico" : "Por encima del histórico"} · {usd(benchmark.delta)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-white/15 bg-white/5 p-4 text-sm text-white/75">
                        Aún no hay historial suficiente para benchmark (mínimo 3 cotizaciones).
                      </div>
                    )}
                  </AnalysisModule>
                ) : null}
              </div>
            </div>
          </div>

          <aside className="hidden w-80 shrink-0 border-l border-white/10 bg-[rgba(16,29,52,0.55)] xl:block">
            <div className="p-6">
              <ImpactRail quote={quote} />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

