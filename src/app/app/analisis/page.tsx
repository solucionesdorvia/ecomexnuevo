import Link from "next/link";

export const metadata = { title: "Análisis — E-COMEX" };

const FEATURES = [
  {
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    title: "Análisis de rentabilidad",
    desc: "Margen bruto, punto de equilibrio y sensibilidad al tipo de cambio por operación.",
  },
  {
    icon: "M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z",
    title: "Comparativa histórica",
    desc: "Evolución de costos FOB, aranceles e impuestos a lo largo del tiempo.",
  },
  {
    icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
    title: "Mapa de rutas óptimas",
    desc: "Comparación marítimo vs aéreo por producto, con tiempos y costos reales.",
  },
  {
    icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
    title: "Alertas regulatorias",
    desc: "Detección automática de cambios en SIRA, licencias y restricciones de productos.",
  },
];

export default function AnalisisPage() {
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
          Análisis inteligente de operaciones
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[#555c6b]">
          Estamos construyendo el módulo de análisis financiero y regulatorio. Vas a poder
          evaluar la rentabilidad de cada importación en profundidad.
        </p>

        <div className="mt-10 grid gap-3 text-left sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-white/[0.05] bg-[#0B1622] p-4"
            >
              <svg className="mb-3 h-5 w-5 text-[#18C3D6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
              </svg>
              <p className="text-[13px] font-semibold text-white">{f.title}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#555c6b]">{f.desc}</p>
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
            href="/app/operaciones"
            className="rounded-lg border border-white/[0.08] px-5 py-2.5 text-[13px] text-[#94a3b8] transition hover:text-white"
          >
            Ver operaciones
          </Link>
        </div>
      </div>
    </div>
  );
}
