import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { parseQuoteCostJson } from "@/lib/quote/parseQuoteCostJson";
import { loadOperationDetail } from "@/lib/operations/loadOperationDetail";
import { OperationPipeline } from "./OperationPipeline";
import { QuoteCostBlocks } from "./QuoteCostBlocks";
import { OperationDocumentsClient } from "./OperationDocumentsClient";
import { OperationSuppliersClient } from "./OperationSuppliersClient";
import { OperationCommentsClient } from "./OperationCommentsClient";
import { operationStageBadgeClass } from "./operationStageUi";

export const runtime = "nodejs";

function fmtStarted(d: Date) {
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function productTitle(productJson: unknown, userText: string) {
  const pj = productJson as { title?: string; name?: string } | null | undefined;
  const t = pj?.title ?? pj?.name;
  if (t && String(t).trim()) return String(t).slice(0, 120);
  const u = userText?.trim();
  if (u) return u.slice(0, 60);
  return "Importación";
}

/** [id] en la URL = operationId */
export default async function OperationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: operationId } = await params;
  const user = await getSessionUser();
  if (!user) notFound();

  const data = await loadOperationDetail(operationId, user);
  if (!data) notFound();

  const { operation, comments } = data;
  const quote = operation.quote;
  const { cards, breakdown } = parseQuoteCostJson(quote.quoteJson);

  const title = productTitle(quote.productJson, quote.userText);

  // NCM final: lo buscamos en varias rutas porque las cotizaciones viejas
  // (pre-fix de runPipeline) pueden no tener `productJson.ncm` pero sí
  // tener candidatos del clasificador o el assumption "ncm" en quoteJson.
  const ncm = (() => {
    const pj = (quote.productJson ?? null) as
      | {
          ncm?: string;
          raw?: {
            ncm?: string;
            ncmMeta?: { ncm?: string; hsHeading?: string };
            classifier?: { candidates?: Array<{ code?: string }> };
          };
        }
      | null;

    const norm = (s: unknown): string => {
      if (typeof s !== "string") return "";
      const t = s.trim();
      if (!t) return "";
      if (t === "9999.99.99" || t === "9999.99.99.999") return "";
      return t;
    };

    // 1) productJson.ncm (lo más común)
    let found = norm(pj?.ncm);
    if (found) return found;

    // 2) productJson.raw.ncm
    found = norm(pj?.raw?.ncm);
    if (found) return found;

    // 3) productJson.raw.ncmMeta.ncm / hsHeading
    found = norm(pj?.raw?.ncmMeta?.ncm) || norm(pj?.raw?.ncmMeta?.hsHeading);
    if (found) return found;

    // 4) Candidato top del clasificador (en flujos donde no hubo pick final)
    const cand = pj?.raw?.classifier?.candidates;
    if (Array.isArray(cand) && cand.length > 0) {
      const top = norm(cand[0]?.code);
      if (top) return top;
    }

    // 5) Fallback: assumption "ncm" del quoteJson — calcImportQuote guarda
    //    siempre `{ id: "ncm", value: "NCM 1234.56.78.000A" | "Sin clasificar aún" }`.
    const qj = quote.quoteJson as { assumptions?: Array<{ id?: string; value?: string }> } | null;
    const ncmAssumption = qj?.assumptions?.find((a) => a?.id === "ncm");
    const m = typeof ncmAssumption?.value === "string"
      ? ncmAssumption.value.match(/NCM\s+([0-9.]{4,})/i)
      : null;
    if (m && m[1]) {
      const stripped = norm(m[1]);
      if (stripped) return stripped;
    }

    return null;
  })();

  const ncmDescription = (() => {
    const pj = (quote.productJson ?? null) as { raw?: { pcram?: { title?: string } } } | null;
    const t = pj?.raw?.pcram?.title;
    return typeof t === "string" ? t.trim() : "";
  })();

  const documentsForClient = operation.documents.map((d) => ({
    id: d.id,
    name: d.name,
    url: d.url,
    uploadedBy: d.uploadedBy,
    createdAt: d.createdAt.toISOString(),
  }));

  const suppliersForClient = operation.suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    country: s.country,
    contact: s.contact,
  }));

  const commentsForClient = comments.map((c) => ({
    id: c.id,
    createdAt: c.createdAt.toISOString(),
    authorRole: c.authorRole,
    authorLabel: c.authorLabel,
    message: c.message,
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1100px]">
        <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
          <Link href="/app/operaciones" className="text-[#555c6b] hover:text-white">
            Operaciones
          </Link>
          <span className="text-[#555c6b]">/</span>
          <Link href={`/app/operaciones/${quote.id}`} className="text-[#555c6b] hover:text-white">
            Cotización
          </Link>
          <span className="text-[#555c6b]">/</span>
          <span className="font-medium text-white">Importación</span>
        </div>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1
              className="text-[20px] font-extrabold leading-snug tracking-tight text-white sm:text-[22px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${operationStageBadgeClass(operation.stage)}`}
              >
                {operation.stage.replace(/_/g, " ")}
              </span>
              {quote.mode === "budget" ? (
                <span className="rounded bg-white/[0.04] px-2 py-0.5 text-[10px] text-[#b0b8c9]">Presupuesto</span>
              ) : (
                <span className="rounded bg-white/[0.04] px-2 py-0.5 text-[10px] text-[#b0b8c9]">Cotización</span>
              )}
              {ncm ? (
                <span className="inline-flex items-center gap-1 rounded border border-[#18C3D6]/35 bg-[#18C3D6]/[0.08] px-2 py-0.5 font-mono text-[10px] font-bold tracking-tight text-[#7aa2ff]">
                  NCM <span className="text-white">{ncm}</span>
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-[13px] text-[#555c6b]">Iniciada el {fmtStarted(operation.createdAt)}</p>
          </div>
          <a
            href={`/api/quote/pdf?mode=${encodeURIComponent(quote.mode)}&id=${encodeURIComponent(quote.id)}`}
            className="shrink-0 rounded-lg bg-[#18C3D6] px-4 py-2 text-[12px] font-medium text-[#030d18] transition-colors hover:bg-[#0ea5b9]"
          >
            PDF cotización
          </a>
        </div>

        <div className="mt-8 rounded-xl border border-white/[0.06] bg-[#0B1622] p-4 sm:p-5">
          <OperationPipeline currentStage={operation.stage} />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Columna izquierda */}
          <div className="space-y-8">
            <section>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#555c6b]">
                  Resumen de cotización
                </h2>
                {ncm ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-[#18C3D6]/30 bg-[#0f172a] px-2 py-0.5 font-mono text-[11px] font-semibold tracking-tight text-[#7aa2ff]">
                    NCM <span className="text-white">{ncm}</span>
                  </span>
                ) : null}
              </div>
              {ncm && ncmDescription ? (
                <p className="mt-1 text-[12px] leading-relaxed text-[#7c8597]">
                  {ncmDescription}
                </p>
              ) : null}
              <div className="mt-3">
                <QuoteCostBlocks
                  cards={cards}
                  breakdown={breakdown}
                  totalMinUsd={quote.totalMinUsd}
                  totalMaxUsd={quote.totalMaxUsd}
                />
              </div>
            </section>

            <section>
              <OperationDocumentsClient operationId={operation.id} initialDocuments={documentsForClient} />
            </section>
          </div>

          {/* Columna derecha */}
          <div className="space-y-8">
            <section>
              <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-[#555c6b]">Timeline</h2>
              {operation.timeline.length === 0 ? (
                <p className="text-[13px] text-[#555c6b]">Sin eventos aún.</p>
              ) : (
                <ul className="space-y-0">
                  {operation.timeline.map((ev, i) => (
                    <li key={ev.id} className="flex gap-3">
                      <div className="flex flex-col items-center pt-1">
                        <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#18C3D6]" aria-hidden />
                        {i < operation.timeline.length - 1 ? (
                          <div className="min-h-[28px] w-px flex-1 bg-white/[0.08]" aria-hidden />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1 pb-6">
                        <p className="text-[10px] text-[#555c6b]">
                          {ev.createdAt.toLocaleString("es-AR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${operationStageBadgeClass(ev.stage)}`}
                          >
                            {ev.stage.replace(/_/g, " ")}
                          </span>
                          <span className="text-[11px] text-[#555c6b]">{ev.actor}</span>
                        </div>
                        <p className="mt-1 text-[13px] leading-relaxed text-[#b0b8c9]">{ev.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-white/[0.04] bg-[#07111A]/80 p-4">
              <OperationSuppliersClient operationId={operation.id} initialSuppliers={suppliersForClient} />
            </section>

            <section className="rounded-xl border border-white/[0.04] bg-[#07111A]/80 p-4">
              <OperationCommentsClient quoteId={quote.id} initialComments={commentsForClient} />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
