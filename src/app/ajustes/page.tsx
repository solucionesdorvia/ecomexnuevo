import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { getSessionUser } from "@/lib/auth/session";
import { roleLabel } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { AjustesClient } from "./AjustesClient";

export default async function AjustesPage() {
  const session = await getSessionUser();
  const profile = session
    ? await prisma.user
        .findUnique({
          where: { id: session.id },
          select: { email: true, name: true, company: true, role: true },
        })
        .catch(() => null)
    : null;
  const currentRole =
    (profile?.role as "user" | "operator" | "admin" | "expert" | undefined) ??
    session?.role ??
    "user";

  return (
    <div className="bg-app min-h-screen text-strong">
      <header className="glass-nav sticky top-0 z-50 border-b border-subtle backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3 text-primary">
            <Icon name="settings" size={28} />
            <h1 className="text-xl font-extrabold tracking-tight text-strong">Ajustes E-COMEX</h1>
          </div>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            {roleLabel(currentRole)}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] px-6 py-10">
        <div className="mb-8">
          <h2 className="text-4xl font-black tracking-tight text-strong">Centro de Configuración</h2>
          <p className="mt-2 max-w-2xl text-muted">
            Ajusta perfil, datos de empresa y controles de seguridad.
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Email: {profile?.email ?? session?.email ?? "—"}
          </p>
        </div>

        <AjustesClient
          initialName={profile?.name ?? ""}
          initialCompany={profile?.company ?? ""}
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link
            href="/ajustes/roles-access"
            className="rounded-xl border border-primary/30 bg-primary/10 p-5 transition-colors hover:bg-primary/20"
          >
            <div className="text-sm font-bold text-white">Roles & Access</div>
            <div className="mt-1 text-xs text-slate-300">Matriz completa de permisos por rol.</div>
          </Link>
          <Link
            href="/trust-compliance"
            className="rounded-xl border border-primary/30 bg-primary/10 p-5 transition-colors hover:bg-primary/20"
          >
            <div className="text-sm font-bold text-white">Trust & Compliance</div>
            <div className="mt-1 text-xs text-slate-300">Auditoría operativa, firmas y trazabilidad.</div>
          </Link>
        </div>
      </main>
    </div>
  );
}
