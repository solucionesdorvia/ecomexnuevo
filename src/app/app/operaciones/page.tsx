import Link from "next/link";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
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
  const cookieStore = await cookies();
  const token = cookieStore.get("ecomex_auth")?.value;
  const payload = token ? await verifyAuthToken(token) : null;

  const quotes = payload?.sub
    ? await prisma.quote.findMany({
        where: { userId: payload.sub },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          createdAt: true,
          mode: true,
          userText: true,
          totalMinUsd: true,
          totalMaxUsd: true,
          stage: true,
          productJson: true,
        },
      }).catch(() => [])
    : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1000px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[20px] font-extrabold tracking-tight text-white sm:text-[22px]" style={{ fontFamily: "var(--font-display)" }}>
              Operaciones
            </h1>
            <p className="mt-1 text-[13px] text-[#555c6b]">{quotes.length} operaciones registradas.</p>
          </div>
          <Link
            href="/app/nueva"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2b59ff] px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#2348d4] sm:w-auto"
          >
            Nueva operación
          </Link>
        </div>

        {quotes.length > 0 ? (
          <div className="mt-8 overflow-x-auto rounded-xl border border-white/[0.04]">
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
                {quotes.map((q) => {
                  const title = (q.productJson as any)?.title ?? q.userText ?? "—";
                  const total =
                    q.totalMinUsd != null && q.totalMaxUsd != null
                      ? `${fmtUsd(q.totalMinUsd)} – ${fmtUsd(q.totalMaxUsd)}`
                      : "—";
                  return (
                    <tr key={q.id} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-[13px] text-white">{String(title).slice(0, 60)}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-[#b0b8c9]">
                          {q.mode === "budget" ? "Presupuesto" : "Cotización"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] font-medium text-[#d4a843]">{total}</td>
                      <td className="px-4 py-3 text-[13px] text-[#555c6b]">{fmtDate(q.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium text-[#b0b8c9]">
                          {STAGE_LABELS[q.stage] ?? q.stage}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/app/operaciones/${q.id}`} className="text-[12px] text-[#2b59ff] transition-colors hover:text-white">
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
          <div className="mt-8 rounded-xl border border-white/[0.04] bg-[#0B1622] p-10 text-center">
            <p className="text-[14px] text-[#555c6b]">Todavía no tenés operaciones.</p>
            <Link
              href="/app/nueva"
              className="mt-4 inline-flex rounded-lg bg-[#2b59ff] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#2348d4]"
            >
              Empezá tu primera operación
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
