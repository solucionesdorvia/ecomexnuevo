import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const metadata = { title: "Proveedores — E-COMEX" };

export default async function ProveedoresPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="relative px-safe pb-10 pt-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,rgba(24,195,214,0.07),transparent_60%)]" />
      <div className="relative mx-auto w-full max-w-[900px]">
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0B1622]/80 px-5 py-5 backdrop-blur sm:px-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#18C3D6]/25 to-transparent" />
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#18C3D6]/[0.06] blur-3xl" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#3d4a5a]">Directorio</p>
          <h1 className="mt-1 text-[22px] font-extrabold tracking-tight text-white" style={{ fontFamily: "var(--font-display)" }}>
            Proveedores
          </h1>
          <p className="mt-1 text-[13px] text-[#5a6577]">
            Proveedores internacionales verificados para tus importaciones.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-[#0B1622] px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#18C3D6]/10 text-[#18C3D6]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="mt-4 text-[15px] font-semibold text-white">Próximamente</p>
          <p className="mt-1.5 max-w-[440px] text-[13px] leading-relaxed text-[#5a6577]">
            Próximamente vas a ver acá los <span className="text-[#94a3b8]">proveedores destacados de E-COMEX</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
