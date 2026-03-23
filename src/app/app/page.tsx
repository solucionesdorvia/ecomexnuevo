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

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ecomex_auth")?.value;
  const payload = token ? await verifyAuthToken(token) : null;

  let quotes: any[] = [];
  let totalOps = 0;
  let pendingCount = 0;

  if (payload?.sub) {
    quotes = await prisma.quote.findMany({
      where: { userId: payload.sub },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, createdAt: true, userText: true, mode: true, totalMinUsd: true, totalMaxUsd: true, stage: true, productJson: true },
    }).catch(() => []);

    totalOps = await prisma.quote.count({ where: { userId: payload.sub } }).catch(() => 0);
    pendingCount = await prisma.quote.count({
      where: { userId: payload.sub, stage: { in: ["awaiting_product", "awaiting_price", "awaiting_quantity"] } },
    }).catch(() => 0);
  }

  const lastQuote = quotes[0] ?? null;
  const lastTitle = lastQuote ? ((lastQuote.productJson as any)?.title ?? lastQuote.userText ?? "—") : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1000px]">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[20px] font-extrabold tracking-tight text-white sm:text-[22px]" style={{ fontFamily: "var(--font-display)" }}>
              Inicio
            </h1>
            <p className="mt-1 text-[13px] text-[#555c6b] sm:text-[14px]">Resumen de tu actividad en E-COMEX.</p>
          </div>
          <Link
            href="/app/nueva"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2b59ff] px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#2348d4] sm:w-auto"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16m8-8H4" /></svg>
            Nueva operación
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Operaciones", value: String(totalOps), sub: "totales" },
            { label: "Pendientes", value: String(pendingCount), sub: "en proceso" },
            { label: "Última", value: lastTitle ? String(lastTitle).slice(0, 28) : "—", sub: lastTitle ? "operación más reciente" : "" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/[0.04] bg-[#0B1622] p-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4a5568]">{s.label}</p>
              </div>
              <p className="mt-3 truncate text-[20px] font-extrabold text-white" style={{ fontFamily: "var(--font-display)" }}>{s.value}</p>
              {s.sub && <p className="mt-1 text-[11px] text-[#4a5568]">{s.sub}</p>}
            </div>
          ))}
        </div>

        {/* Recent operations */}
        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-white">Operaciones recientes</h2>
            <Link href="/app/operaciones" className="text-[12px] text-[#2b59ff] transition-colors hover:text-white">
              Ver todas
            </Link>
          </div>

          {quotes.length > 0 ? (
            <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.04]">
              <table className="w-full min-w-[600px] text-left">
                <thead>
                  <tr className="border-b border-white/[0.04] bg-[#0B1622]">
                    <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Producto</th>
                    <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Total USD</th>
                    <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Fecha</th>
                    <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Estado</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => {
                    const title = (q.productJson as any)?.title ?? q.userText ?? "—";
                    const total = q.totalMinUsd != null && q.totalMaxUsd != null
                      ? `${fmtUsd(q.totalMinUsd)} – ${fmtUsd(q.totalMaxUsd)}`
                      : "—";
                    return (
                      <tr key={q.id} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-[13px] text-white">{String(title).slice(0, 50)}</td>
                        <td className="px-4 py-3 text-[13px] font-medium text-[#d4a843]">{total}</td>
                        <td className="px-4 py-3 text-[13px] text-[#555c6b]">{fmtDate(q.createdAt)}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-[#b0b8c9]">
                            {q.stage}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/app/operaciones/${q.id}`} className="text-[12px] text-[#2b59ff] transition-colors hover:text-white">
                            Ver
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-white/[0.06] bg-[#0B1622]/50 p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#2b59ff]/10">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2b59ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="mt-4 text-[15px] font-medium text-white">Todavía no tenés operaciones</p>
              <p className="mt-1 text-[13px] text-[#4a5568]">Iniciá tu primer análisis de importación.</p>
              <Link
                href="/app/nueva"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#2b59ff] px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#2348d4]"
              >
                Empezá tu primera operación
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
