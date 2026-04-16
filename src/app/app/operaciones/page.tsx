import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  OPERATION_STAGE_LABEL_ES,
  operationStageBadgeClass,
} from "@/app/app/operaciones/[id]/operation/operationStageUi";
import { SystemEmpty, SystemPage, SystemSection } from "@/components/app/SystemPage";

export const runtime = "nodejs";

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtActivity(d: Date) {
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtQuoteDate(d: Date) {
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

function productLabel(productJson: unknown, userText: string, max = 60): string {
  const pj = productJson as { title?: string; name?: string } | null | undefined;
  const t = pj?.title ?? pj?.name;
  if (t && String(t).trim()) return String(t).slice(0, max);
  if (userText?.trim()) return userText.trim().slice(0, max);
  return "—";
}

const STAGE_LABELS: Record<string, string> = {
  quoted: "Cotizado",
  refined: "Refinado",
  decision_requested: "Decisión",
  lead_captured: "Lead",
  awaiting_product: "Esperando producto",
  awaiting_price: "Esperando precio",
  awaiting_quantity: "Esperando cantidad",
};

export default async function OperacionesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [operations, quotesSinOperation] = await Promise.all([
    prisma.operation
      .findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        include: {
          quote: {
            select: {
              id: true,
              productJson: true,
              userText: true,
              totalMinUsd: true,
              totalMaxUsd: true,
              stage: true,
              mode: true,
            },
          },
          timeline: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      })
      .catch(() => []),
    prisma.quote
      .findMany({
        where: {
          userId: user.id,
          operation: { is: null },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          createdAt: true,
          userText: true,
          productJson: true,
          totalMinUsd: true,
          totalMaxUsd: true,
          stage: true,
          mode: true,
        },
      })
      .catch(() => []),
  ]);

  const summaryParts: string[] = [];
  if (operations.length > 0) {
    summaryParts.push(
      `${operations.length} importación${operations.length !== 1 ? "es" : ""} activa${operations.length !== 1 ? "s" : ""}`
    );
  }
  if (quotesSinOperation.length > 0) {
    summaryParts.push(
      `${quotesSinOperation.length} cotización${quotesSinOperation.length !== 1 ? "es" : ""} sin importación`
    );
  }
  const summaryLine = summaryParts.length > 0 ? summaryParts.join(" · ") : "Gestioná tus importaciones y cotizaciones.";

  return (
    <SystemPage
      title="Operaciones"
      description={summaryLine}
      action={
        <Link
          href="/app/nueva"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2b59ff] px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#2348d4] sm:w-auto"
        >
          Nueva operacion
        </Link>
      }
    >

        {operations.length > 0 ? (
          <SystemSection title="Importaciones activas">
            <div className="grid gap-4 sm:grid-cols-2">
              {operations.map((op) => {
                const q = op.quote;
                const title = productLabel(q.productJson, q.userText, 60);
                const lastEv = op.timeline[0];
                const stageKey = op.stage as keyof typeof OPERATION_STAGE_LABEL_ES;
                const stageLabel = OPERATION_STAGE_LABEL_ES[stageKey] ?? op.stage;
                return (
                  <div
                    key={op.id}
                    className="rounded-xl border border-white/[0.06] bg-[#0B1622] p-4 transition-colors hover:border-white/[0.1]"
                  >
                    <p className="text-[14px] font-semibold leading-snug text-white [overflow-wrap:anywhere]">{title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${operationStageBadgeClass(op.stage)}`}
                      >
                        {stageLabel}
                      </span>
                      <span className="text-[11px] text-[#555c6b]">Act. {fmtActivity(op.updatedAt)}</span>
                    </div>
                    {lastEv ? (
                      <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-[#b0b8c9]">
                        <span className="text-[#555c6b]">Último evento: </span>
                        {lastEv.description.length > 120 ? `${lastEv.description.slice(0, 120)}…` : lastEv.description}
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/app/operaciones/${op.id}/operation`}
                        className="inline-flex flex-1 items-center justify-center rounded-lg bg-[#2b59ff] px-3 py-2 text-center text-[12px] font-medium text-white transition-colors hover:bg-[#2348d4] sm:flex-none"
                      >
                        Ver importación
                      </Link>
                      <Link
                        href={`/app/operaciones/${q.id}`}
                        className="inline-flex flex-1 items-center justify-center rounded-lg border border-white/[0.1] px-3 py-2 text-center text-[12px] font-medium text-[#b0b8c9] transition-colors hover:border-white/[0.2] hover:text-white sm:flex-none"
                      >
                        Ver cotización
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </SystemSection>
        ) : null}

        <SystemSection title="Cotizaciones" className={operations.length > 0 ? "mt-12" : ""}>

          {quotesSinOperation.length > 0 ? (
            <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.04]">
              <table className="w-full min-w-[700px] text-left">
                <thead>
                  <tr className="border-b border-white/[0.04] bg-[#0B1622]">
                    <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Producto</th>
                    <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Modo</th>
                    <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Total USD</th>
                    <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Fecha</th>
                    <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Estado</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {quotesSinOperation.map((q) => {
                    const t = productLabel(q.productJson, q.userText, 60);
                    const total =
                      q.totalMinUsd != null && q.totalMaxUsd != null
                        ? `${fmtUsd(q.totalMinUsd)} – ${fmtUsd(q.totalMaxUsd)}`
                        : "—";
                    return (
                      <tr key={q.id} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-[13px] text-white">{t}</td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-[#b0b8c9]">
                            {q.mode === "budget" ? "Presupuesto" : "Cotización"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[13px] font-medium text-[#d4a843]">{total}</td>
                        <td className="px-4 py-3 text-[13px] text-[#555c6b]">{fmtQuoteDate(q.createdAt)}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium text-[#b0b8c9]">
                            {STAGE_LABELS[q.stage] ?? q.stage}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/app/operaciones/${q.id}`}
                            className="text-[12px] text-[#2b59ff] transition-colors hover:text-white"
                          >
                            Detalle
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-4">
              <SystemEmpty
                title="No hay cotizaciones pendientes."
                description="Inicia una nueva cotizacion para comenzar el flujo de importacion."
                action={
                  <Link
                    href="/app/nueva"
                    className="inline-flex rounded-lg bg-[#2b59ff] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#2348d4]"
                  >
                    Nueva cotizacion
                  </Link>
                }
              />
            </div>
          )}
        </SystemSection>
    </SystemPage>
  );
}
