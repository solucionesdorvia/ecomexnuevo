import Link from "next/link";
import { ROLE_ACCESS_DESCRIPTION, roleLabel } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/session";

export default async function RolesAccessPage() {
  const user = await getSessionUser();
  const currentRole = user?.role ?? "user";

  return (
    <div className="bg-app min-h-screen text-strong">
      <header className="glass-nav sticky top-0 z-50 flex items-center justify-between border-b border-subtle px-10 py-3">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 text-primary">
            <span className="material-symbols-outlined text-3xl">shield_person</span>
            <h2 className="text-lg font-bold tracking-tight text-strong">E-COMEX</h2>
          </div>
          <nav className="hidden items-center gap-6 lg:flex">
            <Link className="text-sm font-medium text-muted hover:text-primary" href="/ajustes">
              Ajustes
            </Link>
            <span className="border-b-2 border-primary pb-1 text-sm font-bold text-primary">
              Roles & Access
            </span>
            <Link className="text-sm font-medium text-muted hover:text-primary" href="/trust-compliance">
              Trust & Compliance
            </Link>
          </nav>
        </div>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
          {roleLabel(currentRole as import("@/lib/auth/permissions").AppRole)}
        </span>
      </header>

      <main className="flex min-h-[calc(100vh-61px)]">
        <aside className="hidden w-64 border-r border-subtle bg-[var(--surface)] p-6 lg:flex lg:flex-col lg:gap-4">
          <h3 className="text-base font-bold text-strong">Security Center</h3>
          <p className="text-xs text-muted">Access Control Management</p>
          <div className="mt-2 flex flex-col gap-1">
            <Link href="/ajustes" className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-[var(--surface2)] hover:text-strong">
              Overview
            </Link>
            <div className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-bold text-primary">
              Role Permissions
            </div>
            <Link href="/trust-compliance" className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-[var(--surface2)] hover:text-strong">
              Security Logs
            </Link>
          </div>
        </aside>

        <div className="w-full p-8">
          <div className="mx-auto w-full max-w-[1200px] space-y-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tight text-strong">Roles & Access</h1>
              <p className="text-muted">Control granular de permisos por rol dentro de E-COMEX.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="panel-strong overflow-hidden rounded-xl">
                <div className="border-b border-subtle bg-[var(--surface2)] p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted">Organization Members</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-subtle text-xs font-semibold text-muted">
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Visibility</th>
                        <th className="px-6 py-4">Access Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {ROLE_ACCESS_DESCRIPTION.map((row) => (
                        <tr
                          key={row.role}
                          className={[
                            "transition-colors hover:bg-[var(--surface2)]",
                            row.role === currentRole ? "bg-[color:color-mix(in_oklab,var(--primary)_16%,transparent)]" : "",
                          ].join(" ")}
                        >
                          <td className="px-6 py-5">
                            <div className="font-semibold text-strong">{row.title}</div>
                            <div className="mt-1 text-xs text-muted">{row.detail}</div>
                          </td>
                          <td className="px-6 py-5">
                            <span
                              className={[
                                "rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-tight",
                                row.role === "admin"
                                  ? "border border-red-500/40 bg-red-500/20 text-red-300"
                                  : row.role === "operator"
                                    ? "border border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                                    : row.role === "expert"
                                      ? "border border-amber-500/40 bg-amber-500/20 text-amber-300"
                                      : "border border-sky-500/40 bg-sky-500/20 text-sky-300",
                              ].join(" ")}
                            >
                              {row.role}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-sm text-[#AFC0E0]">
                            {row.permissions.includes("quote:override")
                              ? "Global Read/Write"
                              : row.permissions.includes("quote:validate")
                                ? "Validation Access"
                                : "Read/Operate"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-[rgba(140,177,236,0.2)] bg-[rgba(16,29,52,0.6)]">
                <div className="border-b border-[rgba(140,177,236,0.2)] bg-[rgba(16,29,52,0.7)] p-6">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-bold text-white">Permisos por Rol</h3>
                    <span className="rounded bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                      Active
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Currently inspecting: <span className="font-bold uppercase text-emerald-400">{currentRole}</span>
                  </div>
                </div>
                <div className="space-y-6 p-6">
                  {ROLE_ACCESS_DESCRIPTION.map((row) => (
                    <section key={row.role} className="space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">{row.title}</h4>
                      <div className="grid gap-2">
                        {row.permissions.map((permission) => (
                          <div
                            key={`${row.role}-${permission}`}
                            className={[
                              "flex items-center justify-between rounded-lg p-2",
                              row.role === currentRole
                                ? "border border-emerald-500/20 bg-emerald-500/10"
                                : "bg-[rgba(16,29,52,0.32)]",
                            ].join(" ")}
                          >
                            <span className="text-sm text-[#AFC0E0]">{permission}</span>
                            <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            </div>

            <Link href="/ajustes" className="inline-flex text-xs text-white/75 underline">
              Volver a Ajustes
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

