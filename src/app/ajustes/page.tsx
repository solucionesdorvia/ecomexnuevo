import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { roleLabel } from "@/lib/auth/permissions";

export default async function AjustesPage() {
  const user = await getSessionUser();
  const currentRole =
    (user?.role as "user" | "operator" | "admin" | "expert" | undefined) ?? "user";

  return (
    <div className="bg-app min-h-screen text-strong">
      <header className="glass-nav sticky top-0 z-50 border-b border-subtle backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3 text-primary">
            <span className="material-symbols-outlined text-3xl">settings</span>
            <h1 className="text-xl font-extrabold tracking-tight text-strong">Ajustes E-COMEX</h1>
          </div>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            {roleLabel(currentRole)}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] px-6 py-10">
        <div className="mb-8">
          <h2 className="text-4xl font-black tracking-tight text-strong">Centro de Configuracion</h2>
          <p className="mt-2 max-w-2xl text-muted">
            Ajusta perfil, datos de empresa y controles de seguridad.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <section className="panel p-5">
            <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-muted">Perfil</h3>
            <div className="space-y-3">
              <label className="block text-xs text-muted">
                Nombre
                <input className="field mt-1" defaultValue={user?.email?.split("@")[0] ?? "Usuario"} />
              </label>
              <label className="block text-xs text-muted">
                Email
                <input className="field mt-1" defaultValue={user?.email ?? "sin-sesion@e-comex.app"} />
              </label>
            </div>
          </section>

          <section className="panel p-5">
            <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-muted">Empresa</h3>
            <div className="space-y-3">
              <label className="block text-xs text-muted">
                Razon social
                <input className="field mt-1" defaultValue="E-COMEX S.A." />
              </label>
              <label className="block text-xs text-muted">
                CUIT
                <input className="field mt-1" defaultValue="30-71234567-9" />
              </label>
            </div>
          </section>

          <section className="panel p-5">
            <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-muted">Preferencias</h3>
            <div className="space-y-2 text-sm text-muted">
              <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Notificar cambios de riesgo</label>
              <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Exportacion PDF verificada</label>
              <label className="flex items-center gap-2"><input type="checkbox" /> Modo compacto</label>
            </div>
          </section>
        </div>

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
            <div className="mt-1 text-xs text-slate-300">Auditoria operativa, firmas y trazabilidad.</div>
          </Link>
        </div>

        <div className="mt-6">
          <button type="button" className="button button-primary">
            Guardar ajustes
          </button>
        </div>
      </main>
    </div>
  );
}

