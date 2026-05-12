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
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1000px]">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[13px]">
          <Link href="/app/operaciones" className="text-[#555c6b] hover:text-white">Operaciones</Link>
          <span className="text-[#555c6b]">/</span>
          <span className="text-white font-medium">Detalle</span>
        </div>

        {/* Header */}
        <div className="mt-6 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-[20px] font-extrabold tracking-tight text-white" style={{ fontFamily: "var(--font-display)" }}>
              {String(title).slice(0, 80)}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-[#b0b8c9]">
                {quote.mode === "budget" ? "Presupuesto" : "Cotización"}
              </span>
              <span className="rounded bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-[#b0b8c9]">
                {quote.stage}
              </span>
              {ncm && <span className="rounded bg-[#18C3D6]/10 px-2 py-0.5 text-[10px] font-bold text-[#18C3D6]">NCM {ncm}</span>}
              {origin && <span className="rounded bg-white/[0.04] px-2 py-0.5 text-[10px] text-[#555c6b]">Origen: {origin}</span>}
            </div>
            <p className="mt-2 text-[12px] text-[#555c6b]">
              Creada {fmtDate(quote.createdAt)} · ID {quote.id.slice(-8)}
            </p>
          </div>
          <a
            href={pdfHref}
            className="shrink-0 rounded-lg bg-[#18C3D6] px-4 py-2 text-[12px] font-medium text-[#030d18] transition-colors hover:bg-[#0ea5b9]"
          >
            Descargar PDF
          </a>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* On mobile, sidebar content comes first for quick access */}
          {/* Main */}
          <div className="space-y-6">
            {/* Cost cards */}
            {cards.length > 0 && (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Desglose</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {cards.map((c: any) => (
                    <div key={c.label} className={`rounded-xl border p-4 ${c.highlight ? "border-[#d4a843]/20 bg-[#d4a843]/[0.04]" : "border-white/[0.04] bg-[#0B1622]"}`}>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-[#555c6b]">{c.label}</p>
                      <p className={`mt-1 text-[15px] font-bold ${c.highlight ? "text-[#d4a843]" : "text-white"}`} style={{ fontFamily: "var(--font-display)" }}>{c.value}</p>
                      {c.detail && <p className="mt-1 text-[11px] text-[#555c6b]">{c.detail}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assumptions */}
            {assumptions.length > 0 && (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Supuestos</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {assumptions.map((a: any) => (
                    <span key={a.id} className="rounded border border-white/[0.04] bg-[#0B1622] px-3 py-1 text-[11px] text-[#b0b8c9]">
                      {a.label}: <span className="font-medium text-white">{a.value}</span>
                      <span className="ml-1 text-[#555c6b]">({a.source})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* User text */}
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Input original</p>
              <div className="mt-3 rounded-xl border border-white/[0.04] bg-[#0B1622] p-4">
                <p className="text-[13px] leading-[1.7] text-[#b0b8c9]">{quote.userText}</p>
                {quote.sourceUrl && (
                  <a href={quote.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[12px] text-[#18C3D6] hover:underline">
                    {quote.sourceUrl.slice(0, 60)}...
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-xl border border-white/[0.04] bg-[#0B1622] p-5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#555c6b]">Total estimado</p>
              <p className="mt-1 text-[20px] font-extrabold text-[#d4a843]" style={{ fontFamily: "var(--font-display)" }}>{total}</p>
            </div>

            <div className="rounded-xl border border-white/[0.04] bg-[#0B1622] p-5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#555c6b]">Acciones</p>
              <div className="mt-3 space-y-2">
                {canIniciarImportacion ? (
                  <IniciarImportacionButton quoteId={quote.id} />
                ) : null}
                {quote.operation ? (
                  <Link
                    href={`/app/operaciones/${quote.operation.id}/operation`}
                    className="flex w-full min-h-[44px] items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-2 text-[12px] font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20"
                  >
                    Ver importación
                  </Link>
                ) : null}
                <a href={pdfHref} className="flex w-full items-center justify-center rounded-lg bg-[#18C3D6] py-2 text-[12px] font-medium text-[#030d18] transition-colors hover:bg-[#0ea5b9]">
                  PDF
                </a>
                <Link href="/app/operaciones" className="flex w-full items-center justify-center rounded-lg border border-white/[0.04] py-2 text-[12px] text-[#555c6b] transition-colors hover:text-white">
                  Volver
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
