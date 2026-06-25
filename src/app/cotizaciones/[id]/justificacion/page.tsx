/* eslint-disable @typescript-eslint/no-explicit-any */
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth/jwt";
import { buildArancelaryJustification } from "@/lib/ncm/justification";
import { ncmToPartida } from "@/lib/ncmDisplay";
import { PrintButton } from "./PrintButton";

export const runtime = "nodejs";
export const metadata = { title: "Justificación arancelaria — E-COMEX" };

function reportCode(id: string): string {
  const c = id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `#COMEX-${c.slice(0, 4) || "0000"}-${c.slice(-2) || "CN"}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="border-b border-slate-200 pb-1 text-[13px] font-bold uppercase tracking-wide text-[#0e7c8c]">{title}</h2>
      <div className="mt-2 text-[13px] leading-relaxed text-slate-800">{children}</div>
    </section>
  );
}

export default async function JustificacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const anonId = cookieStore.get("ecomex_anon")?.value ?? null;
  const token = cookieStore.get("ecomex_auth")?.value ?? null;
  const auth = token ? await verifyAuthToken(token) : null;

  const quote = await prisma.quote.findUnique({ where: { id } }).catch(() => null);
  if (!quote) return notFound();
  const allowedByUser = Boolean(auth?.sub && quote.userId && quote.userId === auth.sub);
  const allowedByAnon = Boolean(!quote.userId && anonId && quote.anonId === anonId);
  if (!allowedByUser && !allowedByAnon) return notFound();

  const product = (quote.productJson ?? {}) as any;
  const j = buildArancelaryJustification(product);

  if (!j) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-slate-700">
        <p>No hay una clasificación NCM resuelta para esta operación todavía.</p>
        <a href={`/cotizaciones/${id}`} className="text-[#0e7c8c] underline">Volver al reporte</a>
      </div>
    );
  }

  const fecha = new Date(quote.createdAt).toLocaleDateString("es-AR", { year: "numeric", month: "long", day: "numeric" });
  const pos = ncmToPartida(j.ncm) || j.ncm;

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } .sheet { box-shadow: none !important; margin: 0 !important; } }`}</style>
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <a href={`/cotizaciones/${id}`} className="text-sm text-[#0e7c8c] underline">← Volver al reporte</a>
        <PrintButton />
      </div>

      <div className="sheet mx-auto my-6 max-w-[820px] bg-white px-10 py-9 shadow-lg print:my-0">
        {/* Encabezado */}
        <div className="flex items-start justify-between border-b-2 border-[#0e7c8c] pb-4">
          <div>
            <div className="text-[20px] font-extrabold tracking-tight text-[#0b2a33]">E-COMEX</div>
            <div className="text-[12px] text-slate-500">Justificación de clasificación arancelaria (NCM)</div>
          </div>
          <div className="text-right text-[11px] text-slate-500">
            <div>Reporte {reportCode(quote.id)}</div>
            <div>{fecha}</div>
          </div>
        </div>

        {/* Producto + posición */}
        <div className="mt-5 flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Producto</div>
            <div className="text-[17px] font-bold text-slate-900">{j.product.title || "—"}</div>
            {j.origin && <div className="text-[12px] text-slate-500">Origen declarado: {j.origin}</div>}
          </div>
          <div className="shrink-0 rounded-lg border border-[#0e7c8c]/30 bg-[#0e7c8c]/[0.06] px-4 py-2 text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[#0e7c8c]">Posición NCM</div>
            <div className="font-mono text-[20px] font-bold text-[#0b2a33]">{pos}</div>
            {j.confidencePct != null && (
              <div className="text-[11px] text-slate-500">Confianza {j.confidencePct}%</div>
            )}
          </div>
        </div>

        <Section title="Posición arancelaria">
          <p><strong className="font-mono">{j.ncm}</strong> — {j.ncmDescription || "—"}</p>
          {j.chapterTitle && <p className="mt-1 text-slate-600">Capítulo {j.chapter}: {j.chapterTitle}</p>}
          {j.headingDescription && <p className="text-slate-600">Partida {j.headingCode}: {j.headingDescription}</p>}
          {j.tariff?.diePct != null && (
            <p className="mt-1">Derecho de importación (DIE) de referencia: <strong>{j.tariff.diePct}%</strong>{" "}
              <span className="text-slate-400">({j.tariff.source === "ncm_index" ? "nomenclador oficial" : j.tariff.source})</span></p>
          )}
        </Section>

        <Section title="Fundamento de la clasificación">
          <ul className="space-y-1">
            {j.product.mainFunction && <li>• <strong>Función principal:</strong> {j.product.mainFunction}</li>}
            {j.product.productType && <li>• <strong>Tipo de producto:</strong> {j.product.productType}</li>}
            {j.product.materials?.length ? <li>• <strong>Materiales:</strong> {j.product.materials.join(", ")}</li> : null}
            {j.product.use && <li>• <strong>Uso:</strong> {j.product.use}</li>}
            <li>• <strong>Regla aplicada:</strong> {j.rgiApplied}</li>
          </ul>
          {j.rationale && <p className="mt-2 text-slate-700">{j.rationale}</p>}
        </Section>

        {(j.discarded.length > 0 || j.alternatives.length > 0) && (
          <Section title="Alternativas evaluadas y descartadas">
            {j.alternatives.length > 0 && (
              <p className="text-slate-600">
                Posiciones consideradas: {j.alternatives.map((a) => (ncmToPartida(a.code) || a.code)).join(" · ")}.
              </p>
            )}
            {j.discarded.length > 0 && (
              <ul className="mt-1 space-y-1">
                {j.discarded.map((d) => (
                  <li key={d.code}>
                    • <span className="font-mono">{ncmToPartida(d.code) || d.code}</span> — descartada: {d.reason}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        {j.product.technicalDescription && (
          <Section title="Descripción técnica considerada">
            <p className="whitespace-pre-line text-slate-700">{j.product.technicalDescription.slice(0, 1200)}</p>
          </Section>
        )}

        {/* Disclaimer legal */}
        <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] leading-relaxed text-slate-500">
          Documento de asistencia profesional generado por el motor de E-COMEX (RGI del Sistema
          Armonizado + notas de sección y capítulo). La clasificación definitiva y la responsabilidad
          ante ARCA corresponden a un despachante de aduana matriculado del equipo de E-COMEX, que la
          valida antes de operar. Las alícuotas pueden variar según origen, valor en aduana, intervenciones
          y normativa vigente al momento del despacho.
        </div>
        <div className="mt-3 text-center text-[10px] text-slate-400">E-COMEX · Comercio exterior · {reportCode(quote.id)}</div>
      </div>
    </div>
  );
}
