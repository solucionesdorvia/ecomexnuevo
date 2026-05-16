import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-[#030712] px-4 text-center"
      style={{ fontFamily: "var(--font-body, ui-sans-serif, system-ui)" }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#18C3D6]">
        Error 404
      </p>
      <h1
        className="mt-4 text-[clamp(2.5rem,8vw,4.5rem)] font-extrabold leading-[1.05] tracking-tight text-white"
        style={{ fontFamily: "var(--font-display, ui-sans-serif)" }}
      >
        Página no encontrada
      </h1>
      <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-slate-500">
        La dirección que buscás no existe o fue movida.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl bg-[#18C3D6] px-6 py-3 text-[14px] font-semibold text-[#030712] transition hover:bg-[#0ea5b9]"
        >
          Ir al inicio
        </Link>
        <Link
          href="/cotizador"
          className="inline-flex items-center justify-center rounded-xl border border-white/[0.1] px-6 py-3 text-[14px] font-medium text-slate-400 transition hover:border-white/[0.2] hover:text-slate-200"
        >
          Cotizador gratuito
        </Link>
      </div>
    </div>
  );
}
