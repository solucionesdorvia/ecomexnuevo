import Link from "next/link";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function AnalisisPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ecomex_auth")?.value;
  const anonId = cookieStore.get("ecomex_anon")?.value;
  const payload = token ? await verifyAuthToken(token) : null;

  const where = payload?.sub
    ? { userId: payload.sub, totalMinUsd: { not: null } }
    : anonId
      ? { anonId, totalMinUsd: { not: null } }
      : null;

  const quote = where
    ? await prisma.quote.findFirst({
        where: where as any,
        orderBy: { createdAt: "desc" },
      }).catch(() => null)
    : null;

  if (!quote) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-[18px] font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Sin análisis disponible</h2>
          <p className="mt-2 text-[14px] text-[#555c6b]">Iniciá una nueva operación para generar un análisis.</p>
          <Link href="/app/nueva" className="mt-4 inline-flex rounded-lg bg-[#2b59ff] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#2348d4]">
            Nueva operación
          </Link>
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
  const total = quote.totalMinUsd != null && quote.totalMaxUsd != null
    ? `${fmtUsd(quote.totalMinUsd)} – ${fmtUsd(quote.totalMaxUsd)}`
    : "—";
  const pdfHref = `/api/quote/pdf?mode=${encodeURIComponent(quote.mode)}&id=${encodeURIComponent(quote.id)}`;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1000px]">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#7c3aed]">Análisis</p>
            <h1 className="mt-2 text-[20px] font-extrabold tracking-tight text-white" style={{ fontFamily: "var(--font-display)" }}>
              {String(title).slice(0, 80)}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {ncm && <span className="rounded bg-[#2b59ff]/10 px-2 py-0.5 text-[10px] font-bold text-[#2b59ff]">NCM {ncm}</span>}
              {origin && <span className="rounded bg-white/[0.04] px-2 py-0.5 text-[10px] text-[#555c6b]">Origen: {origin}</span>}
              {quality != null && <span className="rounded bg-white/[0.04] px-2 py-0.5 text-[10px] text-[#555c6b]">Calidad: {quality}%</span>}
            </div>
          </div>
          <a href={pdfHref} className="shrink-0 rounded-lg bg-[#2b59ff] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#2348d4]">
            Descargar PDF
          </a>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_260px]">
          <div className="space-y-8">
            {/* Resumen ejecutivo */}
            {qj?.explanation && (
              <section>
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Resumen</p>
                <div className="mt-3 rounded-xl border border-white/[0.04] bg-[#0B1622] p-5 text-[14px] leading-[1.75] text-[#b0b8c9]">
                  {String(qj.explanation).split("\n").filter(Boolean).slice(0, 8).map((line: string, i: number) => (
                    <p key={i} className={i > 0 ? "mt-2" : ""}>{line}</p>
                  ))}
                </div>
              </section>
            )}

            {/* Clasificación */}
            {ncm && (
              <section>
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Clasificación</p>
                <div className="mt-3 flex items-center justify-between rounded-xl border border-white/[0.04] bg-[#0B1622] px-5 py-4">
                  <div>
                    <p className="text-[12px] text-[#555c6b]">Posición NCM</p>
                    <p className="mt-1 font-mono text-[18px] font-bold text-white">{ncm}</p>
                  </div>
                  {pcram?.title && <p className="max-w-[300px] text-right text-[12px] text-[#555c6b]">{pcram.title}</p>}
                </div>
              </section>
            )}

            {/* Regulaciones */}
            {interventions.length > 0 && (
              <section>
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Regulaciones e intervenciones</p>
                <div className="mt-3 space-y-1.5">
                  {interventions.map((int, i) => (
                    <div key={i} className="rounded-lg border border-white/[0.04] bg-[#0B1622] px-4 py-2.5 text-[13px] text-[#b0b8c9]">
                      {int}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Costos */}
            {cards.length > 0 && (
              <section>
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Costos</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {cards.map((c: any) => (
                    <div key={c.label} className={`rounded-xl border p-4 ${c.highlight ? "border-[#d4a843]/20 bg-[#d4a843]/[0.04]" : "border-white/[0.04] bg-[#0B1622]"}`}>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-[#555c6b]">{c.label}</p>
                      <p className={`mt-1 text-[15px] font-bold ${c.highlight ? "text-[#d4a843]" : "text-white"}`}>{c.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Supuestos */}
            {assumptions.length > 0 && (
              <section>
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Supuestos del análisis</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {assumptions.map((a: any) => (
                    <span key={a.id} className="rounded border border-white/[0.04] bg-[#0B1622] px-3 py-1 text-[11px] text-[#b0b8c9]">
                      {a.label}: <span className="font-medium text-white">{a.value}</span>
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-xl border border-[#d4a843]/20 bg-[#d4a843]/[0.04] p-5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#555c6b]">Total estimado</p>
              <p className="mt-1 text-[22px] font-extrabold text-[#d4a843]" style={{ fontFamily: "var(--font-display)" }}>{total}</p>
            </div>

            <div className="rounded-xl border border-white/[0.04] bg-[#0B1622] p-5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#555c6b]">Timing estimado</p>
              <p className="mt-1 text-[14px] font-bold text-white">35–55 días</p>
              <p className="mt-1 text-[11px] text-[#555c6b]">Marítimo (rango típico)</p>
            </div>

            <div className="rounded-xl border border-white/[0.04] bg-[#0B1622] p-5 space-y-2">
              <a href={pdfHref} className="flex w-full items-center justify-center rounded-lg bg-[#2b59ff] py-2.5 text-[12px] font-medium text-white hover:bg-[#2348d4]">
                Descargar PDF
              </a>
              <Link href="/app/nueva" className="flex w-full items-center justify-center rounded-lg border border-white/[0.04] py-2.5 text-[12px] text-[#555c6b] hover:text-white">
                Nuevo análisis
              </Link>
              <Link href="/app/operaciones" className="flex w-full items-center justify-center rounded-lg border border-white/[0.04] py-2.5 text-[12px] text-[#555c6b] hover:text-white">
                Ver operaciones
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
