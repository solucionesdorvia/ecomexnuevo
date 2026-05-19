import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#07111A] px-6 text-center">
      <div className="relative">
        <p className="text-[120px] font-extrabold leading-none tabular-nums text-white/[0.04] select-none" style={{ fontFamily: "var(--font-display)" }}>
          404
        </p>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#18C3D6]/70">E-COMEX</p>
          <h1 className="mt-2 text-[28px] font-extrabold tracking-tight text-white" style={{ fontFamily: "var(--font-display)" }}>
            Página no encontrada
          </h1>
          <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-[#5a6577]">
            La dirección que buscás no existe o fue movida.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/app"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#18C3D6] px-6 text-[14px] font-semibold text-[#030d18] transition hover:bg-[#0ea5b9]"
            >
              Ir al panel
            </Link>
            <Link
              href="/cotizador"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/[0.08] px-6 text-[14px] font-medium text-[#6b7a8d] transition hover:border-white/[0.16] hover:text-[#aab4c2]"
            >
              Cotizador público
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
