import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SystemPage } from "@/components/app/SystemPage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Consultas — E-COMEX" };

type ContactPayload = {
  nombre?: string;
  empresa?: string;
  email?: string;
  telefono?: string;
  web?: string;
  mensaje?: string;
};

function fmtFecha(d: Date): string {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 16).replace("T", " ");
  }
}

function waLink(tel: string): string {
  const digits = tel.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

export default async function ConsultasPage() {
  const gate = await requireRole(["operator", "admin"]);
  if (!gate.ok) redirect("/app");

  const rows = await prisma.auditLog
    .findMany({
      where: { entityType: "contact", action: "contact_submitted" },
      orderBy: { createdAt: "desc" },
      take: 300,
    })
    .catch(() => []);

  return (
    <SystemPage
      maxWidth="wide"
      title="Consultas web"
      description="Mensajes recibidos desde el formulario de contacto del sitio."
      action={
        <span className="rounded bg-[#18C3D6]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#18C3D6]">
          {rows.length} {rows.length === 1 ? "consulta" : "consultas"}
        </span>
      }
    >
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0B1622] px-5 py-10 text-center">
          <p className="text-[13px] text-[#5a6577]">Todavía no hay consultas registradas.</p>
          <p className="mt-1 text-[11px] text-[#3d4a5a]">
            Cuando alguien complete el formulario de contacto del sitio, aparece acá.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const p = (r.payload ?? {}) as ContactPayload;
            const nombre = (p.nombre || "").trim();
            const email = (p.email || "").trim();
            const telefono = (p.telefono || "").trim();
            const empresa = (p.empresa || "").trim();
            const web = (p.web || "").trim();
            const mensaje = (p.mensaje || "").trim();
            return (
              <div
                key={r.id}
                className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0B1622]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.05] px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-white">
                      {nombre || email || "Consulta sin nombre"}
                    </p>
                    {empresa && <p className="mt-0.5 text-[12px] text-[#5a6577]">{empresa}</p>}
                  </div>
                  <span className="shrink-0 text-[11px] text-[#4a5568]">{fmtFecha(r.createdAt)}</span>
                </div>

                <div className="grid gap-px bg-white/[0.03] sm:grid-cols-3">
                  <div className="bg-[#0B1622] px-5 py-3">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-[#4a5568]">Email</p>
                    {email ? (
                      <a href={`mailto:${email}`} className="mt-1 block truncate text-[12px] text-[#18C3D6] hover:underline">
                        {email}
                      </a>
                    ) : (
                      <p className="mt-1 text-[12px] text-[#5a6577]">—</p>
                    )}
                  </div>
                  <div className="bg-[#0B1622] px-5 py-3">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-[#4a5568]">Teléfono</p>
                    {telefono ? (
                      <a href={waLink(telefono)} target="_blank" rel="noopener noreferrer" className="mt-1 block truncate text-[12px] text-[#18C3D6] hover:underline">
                        {telefono}
                      </a>
                    ) : (
                      <p className="mt-1 text-[12px] text-[#5a6577]">—</p>
                    )}
                  </div>
                  <div className="bg-[#0B1622] px-5 py-3">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-[#4a5568]">Web</p>
                    {web ? (
                      <a href={web} target="_blank" rel="noopener noreferrer" className="mt-1 block truncate text-[12px] text-[#18C3D6] hover:underline">
                        {web}
                      </a>
                    ) : (
                      <p className="mt-1 text-[12px] text-[#5a6577]">—</p>
                    )}
                  </div>
                </div>

                {mensaje && (
                  <div className="border-t border-white/[0.05] px-5 py-3">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-[#4a5568]">Mensaje</p>
                    <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-[#c8d0dc]">{mensaje}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SystemPage>
  );
}
