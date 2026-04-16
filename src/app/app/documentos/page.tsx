import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { listUserOperationDocuments } from "@/lib/documents/listUserOperationDocuments";
import {
  OPERATION_STAGE_LABEL_ES,
  operationStageBadgeClass,
} from "@/app/app/operaciones/[id]/operation/operationStageUi";
import { SystemEmpty, SystemKpi, SystemPage, SystemSection } from "@/components/app/SystemPage";

export const runtime = "nodejs";

function productTitle(productJson: unknown, userText: string) {
  const pj = productJson as { title?: string; name?: string } | null | undefined;
  const t = pj?.title ?? pj?.name;
  if (t && String(t).trim()) return String(t).slice(0, 120);
  const u = userText?.trim();
  if (u) return u.slice(0, 80);
  return "Importación";
}

function fmtUploaded(d: Date) {
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isHttpUrl(url: string) {
  return /^https?:\/\//i.test(url.trim());
}

export default async function DocumentosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const docs = await listUserOperationDocuments(user.id);

  const orderedOpIds: string[] = [];
  const byOp = new Map<string, typeof docs>();
  for (const d of docs) {
    const oid = d.operation.id;
    if (!byOp.has(oid)) {
      orderedOpIds.push(oid);
      byOp.set(oid, []);
    }
    byOp.get(oid)!.push(d);
  }
  const opsWithDocs = orderedOpIds.length;

  return (
    <SystemPage title="Documentos" description="Indice de archivos subidos en tus importaciones.">
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <SystemKpi label="Documentos" value={docs.length} hint="Archivos totales indexados." />
        <SystemKpi label="Operaciones con archivos" value={opsWithDocs} hint="Importaciones con evidencia documental." />
        <SystemKpi
          label="Promedio por operacion"
          value={opsWithDocs > 0 ? (docs.length / opsWithDocs).toFixed(1) : "0"}
          hint="Documentos por importacion."
        />
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-[#555c6b]">
        Los archivos se cargan desde cada importacion en{" "}
        <Link href="/app/operaciones" className="text-[#2b59ff] hover:underline">
          Operaciones
        </Link>
        . Esta pantalla funciona como una vista global.
      </p>

      {docs.length === 0 ? (
        <SystemSection title="Repositorio">
          <SystemEmpty
            title="Todavia no hay documentos cargados."
            description="Cuando subas archivos desde una importacion, apareceran listados aqui por operacion."
            action={
              <Link
                href="/app/operaciones"
                className="inline-flex rounded-lg bg-[#2b59ff] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#2348d4]"
              >
                Ir a operaciones
              </Link>
            }
          />
        </SystemSection>
      ) : (
        <SystemSection
          title="Documentacion por operacion"
          subtitle="Cada bloque agrupa archivos por importacion y estado de avance."
        >
          <div className="space-y-12">
            {orderedOpIds.map((opId) => {
              const opDocs = byOp.get(opId)!;
              const op = opDocs[0].operation;
              const title = productTitle(op.quote.productJson, op.quote.userText);
              const stageKey = op.stage as keyof typeof OPERATION_STAGE_LABEL_ES;
              const stageLabel = OPERATION_STAGE_LABEL_ES[stageKey] ?? op.stage;
              return (
                <section key={opId}>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[15px] font-semibold text-white [overflow-wrap:anywhere]">{title}</h2>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${operationStageBadgeClass(op.stage)}`}
                    >
                      {stageLabel}
                    </span>
                  </div>
                  <ul className="mt-4 space-y-3 border-t border-white/[0.06] pt-4">
                    {opDocs.map((d) => (
                      <li
                        key={d.id}
                        className="flex flex-col gap-1 rounded-lg border border-white/[0.04] bg-[#0B1622] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          {isHttpUrl(d.url) ? (
                            <a
                              href={d.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[13px] font-medium text-[#2b59ff] hover:underline [overflow-wrap:anywhere]"
                            >
                              {d.name}
                            </a>
                          ) : (
                            <span className="text-[13px] font-medium text-white [overflow-wrap:anywhere]">{d.name}</span>
                          )}
                          <p className="mt-1 text-[11px] text-[#555c6b]">
                            {fmtUploaded(d.createdAt)} · Subido por {d.uploadedBy}
                          </p>
                        </div>
                        <Link
                          href={`/app/operaciones/${opId}/operation`}
                          className="shrink-0 text-[12px] text-[#2b59ff] hover:underline sm:ml-4"
                        >
                          Ver importacion
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </SystemSection>
      )}
    </SystemPage>
  );
}
