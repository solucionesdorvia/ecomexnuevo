import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  OPERATION_STAGE_LABEL_ES,
  operationStageBadgeClass,
} from "@/app/app/operaciones/[id]/operation/operationStageUi";
import { SystemPage, SystemSection } from "@/components/app/SystemPage";

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
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Mismo fallback que /app/operaciones (productJson title/name, userText). */
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

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [operations, quotesSinOp, countActiveOps, countPendingQuotes, countCompletedOps] = await Promise.all([
    prisma.operation
      .findMany({
        where: {
          userId: user.id,
          stage: { not: "COMPLETADA" },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: {
          quote: {
            select: {
              id: true,
              productJson: true,
              userText: true,
              totalMinUsd: true,
              totalMaxUsd: true,
              createdAt: true,
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
        where: { userId: user.id, operation: { is: null } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          productJson: true,
          userText: true,
          totalMinUsd: true,
          totalMaxUsd: true,
          stage: true,
          createdAt: true,
        },
      })
      .catch(() => []),
    prisma.operation
      .count({
        where: { userId: user.id, stage: { not: "COMPLETADA" } },
      })
      .catch(() => 0),
    prisma.quote
      .count({
        where: { userId: user.id, operation: { is: null } },
      })
      .catch(() => 0),
    prisma.operation
      .count({
        where: { userId: user.id, stage: "COMPLETADA" },
      })
      .catch(() => 0),
  ]);

  const showWelcomeEmpty = countActiveOps === 0 && countPendingQuotes === 0;

  return (
    <SystemPage
      title="Inicio"
      description="Resumen ejecutivo de actividad en E-COMEX."
      action={
        <Link
          href="/app/nueva"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2b59ff] px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#2348d4] sm:w-auto"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4v16m8-8H4" />
          </svg>
          Nueva operacion
        </Link>
      }
    >

        {/* SECCION 1 — Stats */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/[0.04] bg-[#0B1622] p-5">
            <p className="text-[28px] font-extrabold leading-none text-white" style={{ fontFamily: "var(--font-display)" }}>
              {countActiveOps}
            </p>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#555c6b]">Importaciones activas</p>
            {countActiveOps > 0 ? (
              <Link href="/app/operaciones" className="mt-3 inline-block text-[12px] font-medium text-[#2b59ff] hover:underline">
                Ver todas
              </Link>
            ) : null}
          </div>
          <div className="rounded-xl border border-white/[0.04] bg-[#0B1622] p-5">
            <p className="text-[28px] font-extrabold leading-none text-white" style={{ fontFamily: "var(--font-display)" }}>
              {countPendingQuotes}
            </p>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#555c6b]">Cotizaciones sin importar</p>
          </div>
          <div className="rounded-xl border border-white/[0.04] bg-[#0B1622] p-5">
            <p className="text-[28px] font-extrabold leading-none text-white" style={{ fontFamily: "var(--font-display)" }}>
              {countCompletedOps}
            </p>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#555c6b]">Importaciones completadas</p>
          </div>
        </div>

        {showWelcomeEmpty ? (
          <div className="mt-12 rounded-xl border border-dashed border-white/[0.08] bg-[#0B1622]/50 px-6 py-14 text-center sm:py-16">
            <p className="text-[17px] font-semibold text-white">Bienvenido a E-COMEX</p>
            <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-[#555c6b]">
              Empezá cotizando un producto o clasificando el NCM antes de importar.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/app/nueva"
                className="inline-flex min-h-[44px] w-full max-w-xs items-center justify-center rounded-lg bg-[#2b59ff] px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#2348d4] sm:w-auto"
              >
                Nueva cotización
              </Link>
              <Link
                href="/clasificarncm"
                className="inline-flex min-h-[44px] w-full max-w-xs items-center justify-center rounded-lg border border-white/[0.12] px-5 py-2.5 text-[13px] font-medium text-[#b0b8c9] transition-colors hover:border-white/[0.2] hover:text-white sm:w-auto"
              >
                Clasificar un producto
              </Link>
            </div>
          </div>
        ) : null}

        {/* SECCIÓN 2 — Importaciones activas */}
        {operations.length > 0 ? (
          <SystemSection title="Importaciones activas" className="mt-12">
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
                    <div className="mt-4">
                      <Link
                        href={`/app/operaciones/${op.id}/operation`}
                        className="inline-flex rounded-lg bg-[#2b59ff] px-4 py-2 text-[12px] font-medium text-white transition-colors hover:bg-[#2348d4]"
                      >
                        Ver importación
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </SystemSection>
        ) : null}

        {/* SECCION 3 — Cotizaciones recientes */}
        {quotesSinOp.length > 0 ? (
          <SystemSection title="Cotizaciones recientes" className="mt-12">
            <ul className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.04] bg-[#0B1622]">
              {quotesSinOp.map((q) => {
                const title = productLabel(q.productJson, q.userText, 80);
                const total =
                  q.totalMinUsd != null && q.totalMaxUsd != null
                    ? `${fmtUsd(q.totalMinUsd)} – ${fmtUsd(q.totalMaxUsd)}`
                    : "—";
                return (
                  <li key={q.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-white [overflow-wrap:anywhere]">{title}</p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#555c6b]">
                        <span className="font-medium text-[#d4a843]">{total}</span>
                        <span>{fmtQuoteDate(q.createdAt)}</span>
                        <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-[#b0b8c9]">
                          {STAGE_LABELS[q.stage] ?? q.stage}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/app/operaciones/${q.id}`}
                      className="shrink-0 text-[13px] font-medium text-[#2b59ff] hover:underline sm:pl-4"
                    >
                      Ver
                    </Link>
                  </li>
                );
              })}
            </ul>
            {quotesSinOp.length > 3 ? (
              <div className="mt-4 text-right">
                <Link href="/app/operaciones" className="text-[12px] font-medium text-[#2b59ff] hover:underline">
                  Ver todas
                </Link>
              </div>
            ) : null}
          </SystemSection>
        ) : null}
    </SystemPage>
  );
}
