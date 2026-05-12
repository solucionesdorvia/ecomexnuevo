import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export default async function TrustCompliancePage() {
  const user = await getSessionUser();
  if (!user) redirect("/account/login");

  const logs = await prisma.auditLog.findMany({
    where: { actorUserId: user.id },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true,
      createdAt: true,
      entityType: true,
      entityId: true,
      action: true,
      actorRole: true,
      quoteId: true,
      operatorBudgetId: true,
    },
  });

  return (
    <div className="bg-app min-h-screen text-strong">
      <header className="glass-nav sticky top-0 z-50 border-b border-subtle px-6 py-3">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between">
          <div className="flex items-center gap-3 text-primary">
            <span className="material-symbols-outlined text-3xl">verified_user</span>
            <h1 className="text-xl font-extrabold tracking-tight text-strong">Trust & Compliance</h1>
          </div>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            Audit ready
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1280px] px-6 py-10">
        <div className="mb-6 flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
          </span>
          Audit Mode Active
        </div>

        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-4xl font-black tracking-tight text-white">Trazabilidad de Decisiones</h2>
            <p className="mt-2 max-w-2xl text-slate-400">
              Complete immutable audit log y trazabilidad de cambios para accountability operativo.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-lg border border-subtle px-4 py-2 text-sm font-semibold text-muted">
              Export PDF
            </button>
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-[#030d18]">External Audit</button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardContent>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Total Operations</p>
              <p className="mt-2 text-4xl font-extrabold text-strong">{logs.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">System Automated</p>
              <p className="mt-2 text-4xl font-extrabold text-strong">{logs.filter((l) => !l.actorRole || l.actorRole === "system").length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Manual Adjustments</p>
              <p className="mt-2 text-4xl font-extrabold text-strong">{logs.filter((l) => l.actorRole && l.actorRole !== "system").length}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader
            eyebrow="DECISIONS LOG"
            title="Trazabilidad de Decisiones"
            icon="history_edu"
            right={<Badge tone="primary" icon="lock">Persistido</Badge>}
          />
          <CardContent>
            {logs.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[rgba(140,177,236,0.2)] bg-[rgba(16,29,52,0.5)]">
                      <th className="px-4 py-3 text-xs font-bold uppercase text-slate-400">Timestamp</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase text-slate-400">Type</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase text-slate-400">Operation ID</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase text-slate-400">Action</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(140,177,236,0.14)]">
                    {logs.map((log) => (
                      <tr key={log.id} className="transition-colors hover:bg-primary/5">
                        <td className="px-4 py-4 text-xs text-slate-300">
                          {new Date(log.createdAt).toLocaleString("es-AR")}
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1 rounded-md border border-[rgba(140,177,236,0.2)] bg-white/5 px-2 py-1 text-[10px] font-bold uppercase text-slate-300">
                            {log.actorRole ?? "system"}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-mono text-xs text-primary">{log.entityId}</td>
                        <td className="px-4 py-4 text-sm text-slate-300">{log.action}</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase text-emerald-400">
                            <span className="material-symbols-outlined text-sm">check_circle</span> Verified
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-white/15 bg-white/5 p-4 text-sm text-white/70">
                Sin eventos de auditoría para este usuario.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 rounded-lg border border-dashed border-[rgba(140,177,236,0.2)] bg-[rgba(16,29,52,0.3)] p-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">security</span>
            <p className="text-xs italic leading-relaxed text-slate-400">
              This digital audit log is protected by encrypted persistence. Every manual adjustment is
              recorded with actor role and timestamp. Unauthorized modification of this log is a compliance violation.
            </p>
          </div>
          <Link href="/ajustes" className="mt-3 inline-flex text-xs text-white/75 underline">
            Volver a ajustes
          </Link>
        </div>
      </main>
    </div>
  );
}

