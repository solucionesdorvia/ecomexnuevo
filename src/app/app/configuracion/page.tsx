import { getSessionUser } from "@/lib/auth/session";
import { DocumentUploader } from "./DocumentUploader";

export const runtime = "nodejs";
export const metadata = { title: "Configuración — E-COMEX" };

export default async function ConfiguracionPage() {
  const user = await getSessionUser();
  const u = user as { email?: string; role?: string; name?: string; company?: string } | null;

  return (
    <div className="relative px-safe pb-10 pt-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,rgba(24,195,214,0.07),transparent_60%)]" />

      <div className="relative mx-auto w-full max-w-[780px]">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#4a5568]">Sistema E-COMEX</p>
          <h1 className="mt-1 text-[22px] font-extrabold tracking-tight text-white" style={{ fontFamily: "var(--font-display)" }}>
            Configuración
          </h1>
          <p className="mt-1 text-[13px] text-[#555c6b]">Datos de cuenta, empresa y documentación.</p>
        </div>

        {/* Account info (read-only) */}
        <section className="mb-6 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0B1622]">
          <div className="border-b border-white/[0.04] px-5 py-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4a5568]">Cuenta</p>
          </div>
          <div className="grid gap-px bg-white/[0.03] sm:grid-cols-3">
            {[
              { label: "Email", value: u?.email ?? "—" },
              { label: "Nombre", value: u?.name ?? "—" },
              { label: "Rol", value: u?.role ?? "user" },
            ].map((f) => (
              <div key={f.label} className="bg-[#0B1622] px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#4a5568]">{f.label}</p>
                <p className="mt-1 truncate text-[13px] text-[#c8d0dc]">{f.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Documents */}
        <section>
          <div className="mb-4 flex items-end justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4a5568]">Documentación</p>
              <h2 className="mt-1 text-[16px] font-bold text-white">Documentos de la empresa</h2>
              <p className="mt-1 text-[12px] text-[#555c6b]">
                Cargá los documentos que apliquen. Quedan disponibles para tus operaciones.
              </p>
            </div>
          </div>
          <DocumentUploader />
        </section>
      </div>
    </div>
  );
}
