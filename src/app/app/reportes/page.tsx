import Link from "next/link";

export const metadata = { title: "Reportes — E-COMEX" };

const FEATURES = [
  {
    icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    title: "Reporte ejecutivo PDF",
    desc: "Exportación completa de cada operación: costos, NCM, proveedor y cronograma.",
  },
  {
    icon: "M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
    title: "Exportación a Excel",
    desc: "Tablas de costos y desgloses en formato .xlsx para contabilidad e impuestos.",
  },
  {
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    title: "Historial de cotizaciones",
    desc: "Registro completo con fecha, producto, NCM y totales de todas tus operaciones.",
  },
  {
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    title: "Reporte periódico",
    desc: "Resumen mensual automático de volumen importado, costos y tendencias de aranceles.",
  },
];

export default function ReportesPage() {
  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center px-4 py-16 sm:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,rgba(24,195,214,0.08),transparent_60%)]" />

      <div className="relative mx-auto w-full max-w-[680px] text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#18C3D6]/20 bg-[#18C3D6]/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#18C3D6]">
          Próximamente
        </span>
        <h1
          className="mt-5 text-[clamp(1.6rem,5vw,2.2rem)] font-extrabold leading-tight tracking-tight text-white"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Reportes y exportaciones
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[#555c6b]">
          El módulo de reportes va a centralizar toda tu trazabilidad documental y financiera
          en formatos listos para auditoría, contabilidad y organismos regulatorios.
        </p>

        <div className="mt-10 grid gap-3 text-left sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="relative overflow-hidden rounded-xl border border-white/[0.05] bg-[#0B1622] p-4 pl-5"
            >
              <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full bg-[#18C3D6]/25" />
              <svg className="mb-2.5 h-5 w-5 text-[#18C3D6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
              </svg>
              <p className="text-[13px] font-semibold text-white">{f.title}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#5a6577]">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/app/nueva"
            className="rounded-lg bg-[#18C3D6] px-5 py-2.5 text-[13px] font-medium text-[#030d18] transition hover:bg-[#0ea5b9]"
          >
            Nueva operación
          </Link>
          <Link
            href="/app/costos"
            className="rounded-lg border border-white/[0.08] px-5 py-2.5 text-[13px] text-[#94a3b8] transition hover:text-white"
          >
            Ver costos
          </Link>
        </div>
      </div>
    </div>
  );
}
