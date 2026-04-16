import { getSessionUser } from "@/lib/auth/session";
import { SystemPage, SystemSection } from "@/components/app/SystemPage";

export const runtime = "nodejs";

export default async function ConfiguracionPage() {
  const user = await getSessionUser();

  return (
    <SystemPage maxWidth="narrow" title="Configuracion" description="Datos de cuenta, empresa y preferencias del sistema.">
      <div className="mt-8 space-y-6">
        <SystemSection title="Empresa" className="mt-0">
          <div className="rounded-xl border border-white/[0.04] bg-[#0B1622] p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-[12px] text-[#555c6b]">Nombre</span>
                <input defaultValue="Mi Empresa S.A." className="mt-1 w-full rounded-lg border border-white/[0.06] bg-[#07111A] px-4 py-2.5 text-[14px] text-white outline-none focus:border-[#2b59ff]/40" />
              </label>
              <label className="block">
                <span className="text-[12px] text-[#555c6b]">CUIT</span>
                <input defaultValue="30-12345678-9" className="mt-1 w-full rounded-lg border border-white/[0.06] bg-[#07111A] px-4 py-2.5 text-[14px] text-white outline-none focus:border-[#2b59ff]/40" />
              </label>
            </div>
          </div>
        </SystemSection>

        <SystemSection title="Cuenta" className="mt-0">
          <div className="rounded-xl border border-white/[0.04] bg-[#0B1622] p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-[12px] text-[#555c6b]">Email</span>
                <input defaultValue={user?.email ?? ""} readOnly className="mt-1 w-full rounded-lg border border-white/[0.06] bg-[#07111A] px-4 py-2.5 text-[14px] text-[#555c6b] outline-none" />
              </label>
              <label className="block">
                <span className="text-[12px] text-[#555c6b]">Rol</span>
                <input defaultValue={user?.role ?? "user"} readOnly className="mt-1 w-full rounded-lg border border-white/[0.06] bg-[#07111A] px-4 py-2.5 text-[14px] text-[#555c6b] outline-none" />
              </label>
            </div>
          </div>
        </SystemSection>

        <SystemSection title="Preferencias" className="mt-0">
          <div className="rounded-xl border border-white/[0.04] bg-[#0B1622] p-6">
            <div className="space-y-3">
              {["Notificaciones por email", "Resumen semanal", "Modo maritimo por defecto"].map((pref) => (
                <label key={pref} className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-white/10 bg-[#07111A]" />
                  <span className="text-[13px] text-[#b0b8c9]">{pref}</span>
                </label>
              ))}
            </div>
          </div>
        </SystemSection>

        <button type="button" className="rounded-lg bg-[#2b59ff] px-6 py-2.5 text-[13px] font-medium text-white hover:bg-[#2348d4]">
          Guardar cambios
        </button>
      </div>
    </SystemPage>
  );
}
