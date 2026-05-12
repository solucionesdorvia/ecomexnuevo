"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const FIRST_USE_KEY = "ecomex_guided_onboarding_seen_v1";

export function GuidedOnboarding() {
  const [firstUse, setFirstUse] = useState(false);

  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(FIRST_USE_KEY);
      if (!seen) {
        setFirstUse(true);
      }
    } catch {
      setFirstUse(false);
    }
  }, []);

  function dismissFirstUse() {
    try {
      window.localStorage.setItem(FIRST_USE_KEY, "1");
    } catch {
      // ignore
    }
    setFirstUse(false);
  }

  const options = [
    {
      title: "Cotizar una operación",
      copy: "Iniciá un análisis modular con NCM, costos, riesgos y tiempos.",
      href: "/cotizar",
      icon: "bolt",
    },
    {
      title: "Revisar cotizaciones",
      copy: "Filtrá, compará 2-3 escenarios y exportá reportes profesionales.",
      href: "/cotizaciones",
      icon: "receipt_long",
    },
    {
      title: "Contactar a un experto",
      copy: "Abrí un canal de validación técnica para clasificación y compliance.",
      href: "/cotizaciones/reporte",
      icon: "support_agent",
    },
  ] as const;

  return (
    <section className="flex flex-col gap-8 rounded-xl border border-[rgba(140,177,236,0.2)] bg-[rgba(16,29,52,0.24)] p-8">
      <div className="max-w-2xl">
        <h1 className="mb-4 text-5xl font-extrabold leading-tight tracking-tight text-white">
          ¿Qué quieres hacer hoy?
        </h1>
        <p className="text-lg text-slate-400">
          Selecciona una opción para comenzar a gestionar tus operaciones de comercio exterior con inteligencia de datos.
        </p>
        {firstUse ? (
          <button
            type="button"
            onClick={dismissFirstUse}
            className="mt-4 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-primary"
          >
            primer uso activo
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {options.map((item, idx) => (
          <Link
            key={item.title}
            href={item.href}
            className={[
              "group flex cursor-pointer flex-col gap-6 rounded-xl border-2 p-8 transition-all hover:scale-[1.02]",
              idx === 0
                ? "border-primary bg-[rgba(16,29,52,0.8)] shadow-[0_0_20px_rgba(31,102,255,0.15)]"
                : "border-transparent bg-[rgba(16,29,52,0.45)] hover:border-slate-300 dark:hover:border-slate-700",
            ].join(" ")}
          >
            <div
              className={[
                "flex size-14 items-center justify-center rounded-lg",
                idx === 0 ? "bg-primary text-[#030d18] shadow-lg shadow-primary/30" : "bg-slate-800 text-slate-300",
              ].join(" ")}
            >
              <span className="material-symbols-outlined text-3xl">
                {idx === 0 ? "add_chart" : idx === 1 ? "list_alt" : "support_agent"}
              </span>
            </div>
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-xl font-bold text-white">
                {item.title}
                {idx === 0 ? (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-black uppercase text-primary">
                    Recomendado
                  </span>
                ) : null}
              </h3>
              <p className="text-sm leading-relaxed text-slate-400">{item.copy}</p>
            </div>
            <div className="mt-auto flex items-center border-t border-slate-700/50 pt-4 text-sm font-bold text-primary transition-all group-hover:gap-2">
              {idx === 0 ? "Comenzar ahora" : idx === 1 ? "Ver historial" : "Agendar consulta"}
              <span className="material-symbols-outlined text-sm">
                {idx === 1 ? "history" : idx === 2 ? "calendar_today" : "arrow_forward"}
              </span>
            </div>
          </Link>
        ))}
      </div>
      <section className="flex flex-col gap-6 border-t border-slate-800 pt-12">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-white">Tu Actividad Reciente</h2>
          <div className="flex gap-2">
            <span className="h-3 w-3 rounded-full bg-slate-700"></span>
            <span className="h-3 w-3 rounded-full bg-slate-700"></span>
            <span className="h-3 w-3 rounded-full bg-slate-700"></span>
          </div>
        </div>
        <div className="relative w-full overflow-hidden rounded-2xl border border-dashed border-slate-800 bg-[rgba(16,29,52,0.2)] p-12">
          <div className="absolute inset-0 flex items-end justify-between px-20 opacity-10">
            <div className="w-16 rounded-t-lg bg-primary" style={{ height: "40%" }} />
            <div className="w-16 rounded-t-lg bg-primary" style={{ height: "65%" }} />
            <div className="w-16 rounded-t-lg bg-primary" style={{ height: "35%" }} />
            <div className="w-16 rounded-t-lg bg-primary" style={{ height: "85%" }} />
            <div className="w-16 rounded-t-lg bg-primary" style={{ height: "55%" }} />
            <div className="w-16 rounded-t-lg bg-primary" style={{ height: "70%" }} />
          </div>
          <div className="relative z-10 mx-auto flex max-w-lg flex-col items-center justify-center py-10 text-center">
            <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-slate-800 ring-8 ring-[rgba(3,8,20,0.5)]">
              <span className="material-symbols-outlined text-4xl text-slate-500">bar_chart_4_bars</span>
            </div>
            <h3 className="mb-3 text-xl font-bold text-white">Aún no tienes operaciones activas</h3>
            <p className="mb-8 text-base leading-relaxed text-slate-400">
              Comienza tu primera cotización para ver el análisis de{" "}
              <span className="font-semibold text-primary">Import Intelligence</span> y visualizar tus proyecciones de ahorro y tiempos.
            </p>
            <Link
              href="/cotizar"
              className="group flex items-center gap-2 rounded-lg bg-primary px-8 py-3 font-bold text-[#030d18] transition-all hover:bg-primary/90"
            >
              <span className="material-symbols-outlined">add</span>
              Nueva Cotización
            </Link>
          </div>
        </div>
      </section>
    </section>
  );
}

