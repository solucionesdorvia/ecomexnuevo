import Link from "next/link";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { IniciarImportacionButton } from "./IniciarImportacionButton";

export const runtime = "nodejs";

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function OperacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("ecomex_auth")?.value;
  const payload = token ? await verifyAuthToken(token) : null;
  if (!payload?.sub) notFound();

  const quote = await prisma.quote.findFirst({
    where: { id, userId: payload.sub },
    select: {
      id: true, createdAt: true, updatedAt: true, mode: true, userText: true, sourceUrl: true,
      productJson: true, quoteJson: true, totalMinUsd: true, totalMaxUsd: true, stage: true,
      operation: { select: { id: true } },
    },
  }).catch(() => null);

  if (!quote) notFound();

  const pj: any = quote.productJson ?? {};
  const qj: any = quote.quoteJson ?? {};
  const title = pj?.title ?? pj?.displayTitle ?? quote.userText ?? "Operación";
  const ncm = typeof pj?.ncm === "string" ? pj.ncm : null;
  const origin = typeof pj?.origin === "string" ? pj.origin : null;
  const cards: any[] = Array.isArray(qj?.cards) ? qj.cards : [];
  const breakdown: any = qj?.breakdown ?? null;
  const assumptions: any[] = Array.isArray(qj?.assumptions) ? qj.assumptions : [];

  const total = quote.totalMinUsd != null && quote.totalMaxUsd != null
    ? `${fmtUsd(quote.totalMinUsd)} – ${fmtUsd(quote.totalMaxUsd)}`
    : "—";

  const pdfHref = `/api/quote/pdf?mode=${encodeURIComponent(quote.mode)}&id=${encodeURIComponent(quote.id)}`;

  const canIniciarImportacion = quote.stage === "quoted" && !quote.operation;

  return (
    <div className="relative px-safe pb-8 pt-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,rgba(24,195,214,0.08),transparent_60%)]" />
      <div className="relative mx-auto max-w-[1000px]">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[12px]">
          <Link href="/app/operaciones" className="text-[#555c6b] transition-colors hover:text-[#aab4c2]">Operaciones</Link>
          <span className="text-[#333d4d]">/</span>
          <span className="font-medium text-[#aab4c2]">Detalle</span>
        </div>

        {/* Header card */}
        <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0B1622]/80 px-5 py-5 backdrop-blur sm:px-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#18C3D6]/25 to-transparent" />
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#18C3D6]/[0.06] blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#3d4a5a]">Sistema E-COMEX</p>
              <h1 className="mt-1.5 text-[clamp(1.1rem,4vw,1.35rem)] font-extrabold leading-tight tracking-tight text-white" style={{ fontFamily: "var(--font-display)" }}>
                {String(title).slice(0, 80)}
              </h1>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-white/[0.06] bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium text-[#8a96a8]">
                  {quote.mode === "budget" ? "Presupuesto" : "Cotización"}
                </span>
                <span className="rounded-full border border-white/[0.06] bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium text-[#8a96a8]">
                  {quote.stage}
                </span>
                {ncm && <span className="rounded-full border border-[#18C3D6]/20 bg-[#18C3D6]/[0.08] px-2.5 py-0.5 text-[10px] font-bold text-[#18C3D6]">NCM {ncm}</span>}
                {origin && <span className="rounded-full border border-white/[0.06] bg-white/[0.04] px-2.5 py-0.5 text-[10px] text-[#555c6b]">Origen: {origin}</span>}
              </div>
              <p className="mt-2 text-[11px] text-[#4a5568]">
                Creada {fmtDate(quote.createdAt)} · ID {quote.id.slice(-8)}
              </p>
            </div>
            <a
              href={pdfHref}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#18C3D6] px-4 py-2.5 text-[12px] font-semibold text-[#030d18] transition-colors hover:bg-[#0ea5b9]"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Descargar PDF
            </a>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* On mobile, sidebar content comes first for quick access */}
          {/* Main */}
          <div className="space-y-6">
            {/* Cost cards */}
            {cards.length > 0 && (
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-px w-3 bg-[#18C3D6]/40" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7a8599]">Desglose de costos</p>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {cards.map((c: any) => (
                    <div key={c.label} className={`relative overflow-hidden rounded-xl border p-4 ${c.highlight ? "border-[#d4a843]/20 bg-[#d4a843]/[0.04]" : "border-white/[0.05] bg-[#0B1622]"}`}>
                      <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full ${c.highlight ? "bg-[#d4a843]/50" : "bg-[#18C3D6]/15"}`} />
                      <p className="pl-3 text-[10px] font-medium uppercase tracking-wider text-[#555c6b]">{c.label}</p>
                      <p className={`mt-1 pl-3 text-[15px] font-bold ${c.highlight ? "text-[#d4a843]" : "text-white"}`} style={{ fontFamily: "var(--font-display)" }}>{c.value}</p>
                      {c.detail && <p className="mt-1 pl-3 text-[11px] text-[#4a5568]">{c.detail}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assumptions */}
            {assumptions.length > 0 && (
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-px w-3 bg-[#18C3D6]/40" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7a8599]">Supuestos</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {assumptions.map((a: any) => (
                    <span key={a.id} className="rounded-full border border-white/[0.06] bg-[#0B1622] px-3 py-1 text-[11px] text-[#8a96a8]">
                      {a.label}: <span className="font-semibold text-white">{a.value}</span>
                      <span className="ml-1 text-[#4a5568]">({a.source})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* User text */}
            <div>
              <div className="flex items-center gap-2">
                <div className="h-px w-3 bg-[#18C3D6]/40" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7a8599]">Input original</p>
              </div>
              <div className="mt-3 rounded-xl border border-white/[0.04] bg-[#0B1622] p-4">
                <p className="text-[13px] leading-[1.7] text-[#8a96a8]">{quote.userText}</p>
                {quote.sourceUrl && (
                  <a href={quote.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[12px] text-[#18C3D6] hover:underline">
                    {quote.sourceUrl.slice(0, 60)}...
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-xl border border-[#d4a843]/15 bg-[#d4a843]/[0.04] p-5">
              <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-[#d4a843]/50" />
              <p className="pl-3 text-[10px] font-semibold uppercase tracking-wider text-[#7a6a3a]">Total estimado</p>
              <p className="mt-1 pl-3 text-[22px] font-extrabold text-[#d4a843]" style={{ fontFamily: "var(--font-display)" }}>{total}</p>
            </div>

            <div className="rounded-xl border border-white/[0.04] bg-[#0B1622] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#555c6b]">Acciones</p>
              <div className="mt-3 space-y-2">
                {canIniciarImportacion ? (
                  <IniciarImportacionButton quoteId={quote.id} />
                ) : null}
                {quote.operation ? (
                  <Link
                    href={`/app/operaciones/${quote.operation.id}/operation`}
                    className="flex min-h-[44px] w-full items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-2 text-[12px] font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20"
                  >
                    Ver importación
                  </Link>
                ) : null}
                <a href={pdfHref} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#18C3D6] py-2.5 text-[12px] font-semibold text-[#030d18] transition-colors hover:bg-[#0ea5b9]">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  Descargar PDF
                </a>
                <Link href="/app/operaciones" className="flex w-full items-center justify-center rounded-lg border border-white/[0.06] py-2 text-[12px] text-[#6b7a8d] transition-colors hover:border-white/[0.12] hover:text-[#aab4c2]">
                  ← Volver
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
