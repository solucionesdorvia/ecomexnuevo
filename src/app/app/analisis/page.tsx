import Link from "next/link";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STAGE_LABELS: Record<string, string> = {
  quoted: "Cotizado",
  refined: "Refinado",
  decision_requested: "Decisión",
  lead_captured: "Lead",
  awaiting_product: "En curso",
  awaiting_price: "En curso",
  awaiting_quantity: "En curso",
};

function routeTimingLabel(route?: string) {
  const r = (route ?? "maritime").toLowerCase();
  if (r === "air" || r === "aereo") return "Aéreo (rango típico)";
  if (r === "maritime" || r === "maritimo") return "Marítimo (rango típico)";
  return "Logística (rango típico)";
}

/** Rows aligned with cotizaciones/reporte — only pairs with numeric min/max are shown. */
function breakdownTableRows(breakdown: Record<string, unknown>) {
  const b = breakdown as {
    fobTotalUsd?: number;
    fobTotalMinUsd?: number;
    fobTotalMaxUsd?: number;
    fleteMinUsd?: number;
    fleteMaxUsd?: number;
    seguroMinUsd?: number;
    seguroMaxUsd?: number;
    cifPlusInsuranceMinUsd?: number;
    cifPlusInsuranceMaxUsd?: number;
    derechosImportacionMinUsd?: number;
    derechosImportacionMaxUsd?: number;
    tasaEstadisticaMinUsd?: number;
    tasaEstadisticaMaxUsd?: number;
    ivaMinUsd?: number;
    ivaMaxUsd?: number;
    ivaAdicionalMinUsd?: number;
    ivaAdicionalMaxUsd?: number;
    impuestosInternosMinUsd?: number;
    impuestosInternosMaxUsd?: number;
    impuestosTotalMinUsd?: number;
    impuestosTotalMaxUsd?: number;
    gestionMinUsd?: number;
    gestionMaxUsd?: number;
    totalMinUsd?: number;
    totalMaxUsd?: number;
  };

  const raw: [string, number | undefined, number | undefined][] = [
    [
      "FOB (producto)",
      typeof b.fobTotalMinUsd === "number" ? b.fobTotalMinUsd : b.fobTotalUsd,
      typeof b.fobTotalMaxUsd === "number" ? b.fobTotalMaxUsd : b.fobTotalUsd,
    ],
    ["Flete marítimo", b.fleteMinUsd, b.fleteMaxUsd],
    ["Seguro", b.seguroMinUsd, b.seguroMaxUsd],
    ["CIF (+seguro)", b.cifPlusInsuranceMinUsd, b.cifPlusInsuranceMaxUsd],
    ["Derechos importación", b.derechosImportacionMinUsd, b.derechosImportacionMaxUsd],
    ["Tasa estadística", b.tasaEstadisticaMinUsd, b.tasaEstadisticaMaxUsd],
    ["IVA", b.ivaMinUsd, b.ivaMaxUsd],
    ["IVA adicional", b.ivaAdicionalMinUsd, b.ivaAdicionalMaxUsd],
    ["Impuestos internos", b.impuestosInternosMinUsd, b.impuestosInternosMaxUsd],
    ["Impuestos (total)", b.impuestosTotalMinUsd, b.impuestosTotalMaxUsd],
    ["Gestión / operativos", b.gestionMinUsd, b.gestionMaxUsd],
    ["TOTAL", b.totalMinUsd, b.totalMaxUsd],
  ];

  return raw.filter(([, a, c]) => typeof a === "number" && typeof c === "number") as [string, number, number][];
}

export default async function AnalisisPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id: selectedId } = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get("ecomex_auth")?.value;
  const anonId = cookieStore.get("ecomex_anon")?.value;
  const payload = token ? await verifyAuthToken(token) : null;

  const baseWhere = payload?.sub
    ? { userId: payload.sub, totalMinUsd: { not: null } as const }
    : anonId
      ? { anonId, totalMinUsd: { not: null } as const }
      : null;

  const recent = baseWhere
    ? await prisma.quote
        .findMany({
          where: baseWhere as any,
          orderBy: { createdAt: "desc" },
          take: 25,
          select: {
            id: true,
            createdAt: true,
            mode: true,
            stage: true,
            userText: true,
            productJson: true,
            quoteJson: true,
            totalMinUsd: true,
            totalMaxUsd: true,
          },
        })
        .catch(() => [])
    : [];

  let quote = recent[0] ?? null;
  if (selectedId && recent.some((q) => q.id === selectedId)) {
    quote = recent.find((q) => q.id === selectedId) ?? quote;
  }

  if (!quote) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#0B1622]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4a5568" strokeWidth="1.5" aria-hidden>
              <path d="M9 17v-6h6v6M12 3v2M5 9h14M5 9a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V9z" />
            </svg>
          </div>
          <h2 className="text-[18px] font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
            Sin análisis disponible
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#555c6b]">
            Cuando completés una cotización con totales, el resumen ejecutivo, NCM y costos aparecen acá. También podés
            iniciar sesión para conservar el historial entre dispositivos.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/app/nueva"
              className="inline-flex rounded-lg bg-[#2b59ff] px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#2348d4]"
            >
              Nueva operación
            </Link>
            <Link href="/login" className="text-[13px] font-medium text-[#94a3b8] underline-offset-4 hover:text-white hover:underline">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const pj: any = quote.productJson ?? {};
  const qj: any = quote.quoteJson ?? {};
  const title = pj?.title ?? quote.userText ?? "Análisis";
  const ncm = typeof pj?.ncm === "string" && pj.ncm !== "9999.99.99" ? pj.ncm : null;
  const origin = typeof pj?.origin === "string" ? pj.origin : null;
  const cards: any[] = Array.isArray(qj?.cards) ? qj.cards : [];
  const breakdown: any = qj?.breakdown ?? null;
  const assumptions: any[] = Array.isArray(qj?.assumptions) ? qj.assumptions : [];
  const quality = typeof qj?.quality === "number" ? qj.quality : null;
  const pcram: any = pj?.raw?.pcram ?? null;
  const interventions: string[] = Array.isArray(pcram?.interventions) ? pcram.interventions : [];
  const ncmMeta: any = pj?.raw?.ncmMeta ?? null;
  const ncmConfidence =
    typeof ncmMeta?.confidence === "number" && Number.isFinite(ncmMeta.confidence) ? ncmMeta.confidence : null;

  const timing = qj?.timing as { route?: string; minDays?: number; maxDays?: number } | undefined;
  const minD = typeof timing?.minDays === "number" ? timing.minDays : 35;
  const maxD = typeof timing?.maxDays === "number" ? timing.maxDays : 55;
  const timingRoute = timing?.route;

  const total =
    quote.totalMinUsd != null && quote.totalMaxUsd != null
      ? `${fmtUsd(quote.totalMinUsd)} – ${fmtUsd(quote.totalMaxUsd)}`
      : "—";

  const pdfHref = `/api/quote/pdf?mode=${encodeURIComponent(quote.mode)}&id=${encodeURIComponent(quote.id)}`;
  const bdRows = breakdown && typeof breakdown.totalMinUsd === "number" ? breakdownTableRows(breakdown) : [];
  const stageLabel = quote.stage ? STAGE_LABELS[String(quote.stage)] ?? String(quote.stage) : null;
  const explanationLines = qj?.explanation ? String(qj.explanation).split("\n").filter(Boolean) : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1100px]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#7c3aed]">Análisis</p>
            <h1 className="mt-2 text-[20px] font-extrabold tracking-tight text-white sm:text-[22px]" style={{ fontFamily: "var(--font-display)" }}>
              {String(title).slice(0, 90)}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {stageLabel && (
                <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-[#b0b8c9]">{stageLabel}</span>
              )}
              <span className="text-[11px] text-[#4a5568]">{fmtDate(quote.createdAt)}</span>
              {quote.mode === "budget" && (
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200/90">Presupuesto</span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {ncm && <span className="rounded bg-[#2b59ff]/10 px-2 py-0.5 text-[10px] font-bold text-[#2b59ff]">NCM {ncm}</span>}
              {origin && <span className="rounded bg-white/[0.04] px-2 py-0.5 text-[10px] text-[#555c6b]">Origen: {origin}</span>}
              {quality != null && (
                <span className="rounded bg-white/[0.04] px-2 py-0.5 text-[10px] text-[#555c6b]">Calidad del análisis: {quality}%</span>
              )}
              {ncmConfidence != null && (
                <span className="rounded bg-white/[0.04] px-2 py-0.5 text-[10px] text-[#555c6b]">Confianza NCM: {Math.round(ncmConfidence * 100)}%</span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col lg:items-stretch">
            <a
              href={pdfHref}
              className="inline-flex items-center justify-center rounded-lg bg-[#2b59ff] px-4 py-2.5 text-[12px] font-medium text-white transition-colors hover:bg-[#2348d4]"
            >
              Descargar PDF
            </a>
            {payload?.sub && (
              <Link
                href={`/app/operaciones/${quote.id}`}
                className="inline-flex items-center justify-center rounded-lg border border-white/[0.08] bg-[#0B1622] px-4 py-2.5 text-[12px] font-medium text-[#b0b8c9] transition-colors hover:border-white/[0.14] hover:text-white"
              >
                Ver operación
              </Link>
            )}
          </div>
        </div>

        {/* Recent analyses — switch context */}
        {recent.length > 1 && (
          <div className="mt-8 rounded-xl border border-white/[0.06] bg-[#070e17]/80 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4a5568]">Análisis recientes</p>
            <ul className="mt-3 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
              {recent.map((q) => {
                const t = (q.productJson as any)?.title ?? q.userText ?? "Sin título";
                const active = q.id === quote.id;
                const line =
                  q.totalMinUsd != null && q.totalMaxUsd != null
                    ? `${fmtUsd(q.totalMinUsd)} – ${fmtUsd(q.totalMaxUsd)}`
                    : "—";
                return (
                  <li key={q.id}>
                    <Link
                      href={active ? "/app/analisis" : `/app/analisis?id=${encodeURIComponent(q.id)}`}
                      className={`block rounded-lg border px-3 py-2 transition-colors sm:min-w-[200px] sm:max-w-[280px] ${
                        active
                          ? "border-[#2b59ff]/40 bg-[#2b59ff]/10 text-white"
                          : "border-white/[0.06] bg-[#0B1622] text-[#b0b8c9] hover:border-white/[0.12] hover:text-white"
                      }`}
                    >
                      <span className="block truncate text-[12px] font-medium">{String(t).slice(0, 48)}</span>
                      <span className="mt-0.5 block text-[10px] text-[#4a5568]">{line}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
          <div className="space-y-8">
            {explanationLines.length > 0 && (
              <section>
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Resumen ejecutivo</p>
                <div className="mt-3 max-h-[min(70vh,32rem)] overflow-y-auto rounded-xl border border-white/[0.04] bg-[#0B1622] p-5 text-[14px] leading-[1.75] text-[#b0b8c9]">
                  {explanationLines.map((line: string, i: number) => (
                    <p key={i} className={i > 0 ? "mt-2" : ""}>
                      {line}
                    </p>
                  ))}
                </div>
              </section>
            )}

            {ncm && (
              <section>
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Clasificación</p>
                <div className="mt-3 flex flex-col gap-3 rounded-xl border border-white/[0.04] bg-[#0B1622] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[12px] text-[#555c6b]">Posición NCM</p>
                    <p className="mt-1 font-mono text-[18px] font-bold text-white">{ncm}</p>
                  </div>
                  {pcram?.title && <p className="max-w-[420px] text-[12px] leading-relaxed text-[#8b95a8]">{pcram.title}</p>}
                </div>
              </section>
            )}

            {interventions.length > 0 && (
              <section>
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Regulaciones e intervenciones</p>
                <div className="mt-3 space-y-1.5">
                  {interventions.map((int, i) => (
                    <div key={i} className="rounded-lg border border-white/[0.04] bg-[#0B1622] px-4 py-2.5 text-[13px] leading-snug text-[#b0b8c9]">
                      {int}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {bdRows.length > 0 && (
              <section>
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Desglose numérico (USD)</p>
                <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.06]">
                  <table className="w-full text-[13px]">
                    <thead className="bg-white/[0.03] text-[10px] font-semibold uppercase tracking-wider text-[#4a5568]">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Concepto</th>
                        <th className="px-4 py-2.5 text-right">Mín.</th>
                        <th className="px-4 py-2.5 text-right">Máx.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {bdRows.map(([label, a, b]) => (
                        <tr key={label} className={label === "TOTAL" ? "bg-[#d4a843]/[0.06]" : "bg-[#0B1622]"}>
                          <td className={`px-4 py-2.5 ${label === "TOTAL" ? "font-bold text-[#d4a843]" : "text-[#b0b8c9]"}`}>{label}</td>
                          <td className={`px-4 py-2.5 text-right tabular-nums ${label === "TOTAL" ? "font-bold text-white" : "text-white"}`}>
                            {fmtUsd(a)}
                          </td>
                          <td className={`px-4 py-2.5 text-right tabular-nums ${label === "TOTAL" ? "font-bold text-white" : "text-white"}`}>
                            {fmtUsd(b)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-[#4a5568]">
                  Cifras alineadas con el motor de cotización; el total del margen superior debe coincidir con la fila TOTAL salvo redondeos.
                </p>
              </section>
            )}

            {cards.length > 0 && (
              <section>
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Vista resumida (tarjetas)</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {cards.map((c: any) => (
                    <div
                      key={c.label}
                      className={`rounded-xl border p-4 ${c.highlight ? "border-[#d4a843]/20 bg-[#d4a843]/[0.04]" : "border-white/[0.04] bg-[#0B1622]"}`}
                    >
                      <p className="text-[10px] font-medium uppercase tracking-wider text-[#555c6b]">{c.label}</p>
                      <p className={`mt-1 text-[15px] font-bold ${c.highlight ? "text-[#d4a843]" : "text-white"}`}>{c.value}</p>
                      {c.detail && <p className="mt-1 text-[11px] text-[#555c6b]">{c.detail}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {assumptions.length > 0 && (
              <section>
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Supuestos del análisis</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {assumptions.map((a: any) => (
                    <span key={a.id} className="rounded border border-white/[0.04] bg-[#0B1622] px-3 py-1.5 text-[11px] text-[#b0b8c9]">
                      {a.label}: <span className="font-medium text-white">{a.value}</span>
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-xl border border-[#d4a843]/20 bg-[#d4a843]/[0.04] p-5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#555c6b]">Total estimado</p>
              <p className="mt-1 text-[22px] font-extrabold text-[#d4a843]" style={{ fontFamily: "var(--font-display)" }}>
                {total}
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.04] bg-[#0B1622] p-5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#555c6b]">Timing estimado</p>
              <p className="mt-1 text-[15px] font-bold text-white">
                {minD}–{maxD} días
              </p>
              <p className="mt-1 text-[11px] text-[#555c6b]">{routeTimingLabel(timingRoute)}</p>
            </div>

            <div className="space-y-2 rounded-xl border border-white/[0.04] bg-[#0B1622] p-5">
              <a
                href={pdfHref}
                className="flex w-full items-center justify-center rounded-lg bg-[#2b59ff] py-2.5 text-[12px] font-medium text-white transition-colors hover:bg-[#2348d4]"
              >
                Descargar PDF
              </a>
              <Link
                href="/app/nueva"
                className="flex w-full items-center justify-center rounded-lg border border-white/[0.04] py-2.5 text-[12px] text-[#555c6b] transition-colors hover:text-white"
              >
                Nuevo análisis
              </Link>
              {payload?.sub ? (
                <Link
                  href="/app/operaciones"
                  className="flex w-full items-center justify-center rounded-lg border border-white/[0.04] py-2.5 text-[12px] text-[#555c6b] transition-colors hover:text-white"
                >
                  Ver operaciones
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="flex w-full items-center justify-center rounded-lg border border-white/[0.04] py-2.5 text-[12px] text-[#555c6b] transition-colors hover:text-white"
                >
                  Iniciar sesión (historial)
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
