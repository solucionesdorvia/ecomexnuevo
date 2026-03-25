"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* ── Scroll reveal ── */
function R({ children, cl = "", d = 0 }: { children: React.ReactNode; cl?: string; d?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const o = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setV(true); o.disconnect(); } }, { threshold: 0.1 });
    o.observe(el);
    return () => o.disconnect();
  }, []);
  return <div ref={ref} className={cl} style={{ opacity: v ? 1 : 0, transform: v ? "none" : "translateY(18px)", transition: `opacity .65s cubic-bezier(.16,1,.3,1) ${d}ms, transform .65s cubic-bezier(.16,1,.3,1) ${d}ms` }}>{children}</div>;
}

/* ── Palette ── */
const P = {
  bg: "#07111A", bg2: "#0B1622", navy: "#102235",
  cyan: "#18C3D6", blue: "#2F80ED",
  t1: "#F5F7FA", t2: "#A7B3C2", t3: "#5A6577",
  border: "rgba(255,255,255,0.06)",
};

/* ── Navbar with scroll blur ── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [["#servicios","Servicios"],["#como","Cómo trabajamos"],["#plataforma","Plataforma"],["#contacto","Contacto"]];

  return (
    <nav className={`fixed top-0 z-50 w-full transition-all duration-300 ${scrolled ? "bg-[#07111A]/80 backdrop-blur-xl border-b" : "bg-transparent"}`} style={{ borderColor: scrolled ? P.border : "transparent" }}>
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 lg:px-8">
        <img src="/brand/ecomex-logo.png" alt="E-COMEX" className="h-5 brightness-0 invert" />

        {/* Desktop */}
        <div className="hidden items-center gap-8 md:flex">
          {links.map(([h,l]) => <a key={l} href={h} className="text-[13px] text-[#A7B3C2] transition-colors hover:text-white">{l}</a>)}
          <a href="#contacto" className="rounded-lg px-5 py-2 text-[13px] font-medium text-white transition-all hover:shadow-[0_0_20px_-4px_rgba(47,128,237,0.4)]" style={{ background: P.blue }}>
            Hablar con un especialista
          </a>
        </div>

        {/* Mobile hamburger */}
        <button type="button" onClick={() => setMenuOpen(!menuOpen)} className="text-[#A7B3C2] md:hidden">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d={menuOpen ? "M6 6l12 12M6 18L18 6" : "M4 6h16M4 12h16M4 18h16"} /></svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t bg-[#07111A]/95 backdrop-blur-xl px-5 pb-6 pt-4 md:hidden" style={{ borderColor: P.border }}>
          <div className="flex flex-col gap-4">
            {links.map(([h,l]) => <a key={l} href={h} onClick={() => setMenuOpen(false)} className="text-[14px] text-[#A7B3C2]">{l}</a>)}
            <a href="#contacto" onClick={() => setMenuOpen(false)} className="mt-2 rounded-lg py-3 text-center text-[14px] font-medium text-white" style={{ background: P.blue }}>
              Hablar con un especialista
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

export default function LandingContainerGate() {
  return (
    <div style={{ background: P.bg, color: P.t2, fontFamily: "var(--font-body, 'Inter', sans-serif)" }} className="antialiased">
      <Navbar />

      {/* ══════════ HERO ══════════ */}
      <section className="relative overflow-hidden px-5 pb-20 pt-28 lg:px-8 lg:pt-36" style={{ minHeight: "100vh" }}>
        {/* 3D animated background */}
        <iframe
          src="/hero-3d.html"
          className="pointer-events-none absolute inset-0 h-full w-full border-0"
          style={{ opacity: 0.6 }}
          loading="lazy"
          title="Background animation"
        />
        {/* Dark overlay for text legibility */}
        <div className="pointer-events-none absolute inset-0" style={{
          background: `linear-gradient(180deg, ${P.bg}dd 0%, ${P.bg}99 40%, ${P.bg}dd 100%)`
        }} />

        <div className="relative mx-auto max-w-[1200px]">
          <div className="grid items-center gap-16 lg:grid-cols-[1fr_480px]">
            <div className="max-w-[600px]">
              <R>
                <div className="inline-flex items-center gap-2.5 rounded-full px-4 py-1.5" style={{ border: `1px solid ${P.border}`, background: `${P.bg2}cc` }}>
                  <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: P.cyan, boxShadow: `0 0 8px ${P.cyan}` }} />
                  <span className="text-[11px] font-medium tracking-wide" style={{ color: P.t3 }}>+20 años en comercio exterior</span>
                </div>
              </R>

              <R d={60}>
                <h1 className="mt-7 text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-[1.06] tracking-[-0.04em]" style={{ fontFamily: "var(--font-display)", color: P.t1 }}>
                  Tomá el control de tus importaciones
                </h1>
              </R>

              <R d={120}>
                <p className="mt-6 text-[16px] leading-[1.75]" style={{ color: P.t2 }}>
                  E-COMEX combina experiencia en comercio exterior con tecnología para resolver clasificación, regulaciones, costos y logística con claridad y velocidad.
                </p>
              </R>

              <R d={180}>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <a href="#contacto" className="rounded-lg px-6 py-3 text-center text-[14px] font-medium text-white transition-all hover:shadow-[0_0_30px_-6px_rgba(47,128,237,0.4)]" style={{ background: P.blue }}>
                    Hablar con un especialista
                  </a>
                  <a href="#como" className="rounded-lg px-6 py-3 text-center text-[14px] font-medium transition-colors hover:text-white" style={{ border: `1px solid ${P.border}`, color: P.t2 }}>
                    Ver cómo funciona
                  </a>
                </div>
              </R>

              <R d={240}>
                <div className="mt-12 flex flex-wrap gap-8">
                  {[["Más claridad","visibility"],["Más velocidad","bolt"],["Menos errores","verified"]].map(([t]) => (
                    <div key={t} className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full" style={{ background: P.cyan }} />
                      <span className="text-[12px] font-medium tracking-wide" style={{ color: P.t3 }}>{t}</span>
                    </div>
                  ))}
                </div>
              </R>
            </div>

            {/* Mockup */}
            <R d={300} cl="hidden lg:block">
              <div className="relative">
                <div className="absolute -inset-6 rounded-3xl opacity-50" style={{ background: `radial-gradient(circle at 50% 60%, ${P.blue}10, transparent 70%)` }} />
                <div className="relative overflow-hidden rounded-2xl shadow-[0_40px_100px_-30px_rgba(0,0,0,0.6)]" style={{ background: P.bg2, border: `1px solid ${P.border}` }}>
                  <div className="flex items-center border-b px-4 py-2.5" style={{ borderColor: P.border, background: `${P.bg}80` }}>
                    <div className="flex gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                    </div>
                    <div className="mx-auto flex items-center gap-2 rounded-md px-3 py-1" style={{ background: P.bg }}>
                      <span className="h-1.5 w-1.5 rounded-full bg-[#28c840]" />
                      <span className="text-[10px]" style={{ color: P.t3 }}>e-comex.app/analisis</span>
                    </div>
                  </div>
                  <div className="flex">
                    <div className="hidden w-12 shrink-0 flex-col items-center gap-3 border-r py-4 sm:flex" style={{ borderColor: P.border }}>
                      {[0,1,2,3].map(i=><div key={i} className="h-5 w-5 rounded" style={{ background: i===0 ? `${P.blue}15` : P.navy }} />)}
                    </div>
                    <div className="flex flex-1 gap-4 p-5">
                      <div className="flex-1 space-y-2.5">
                        <div className="flex items-center gap-3 rounded-lg p-3" style={{ background: P.bg }}>
                          <div className="h-9 w-9 rounded-md" style={{ background: P.navy }} />
                          <div className="flex-1"><div className="h-2.5 w-36 rounded" style={{ background: P.navy }} /><div className="mt-1.5 h-2 w-20 rounded" style={{ background: `${P.navy}80` }} /></div>
                          <span className="rounded px-2 py-0.5 text-[8px] font-bold" style={{ background: `${P.cyan}15`, color: P.cyan }}>Analizado</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg px-4 py-2.5" style={{ background: P.bg }}>
                          <span className="text-[10px]" style={{ color: P.t3 }}>NCM</span>
                          <span className="font-mono text-[13px] font-bold" style={{ color: P.t1 }}>8703.23.10</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {[["FOB","$2,400"],["Flete","$680"],["Impuestos","$1,920"]].map(([l,v])=>(
                            <div key={l} className="rounded-lg p-2.5" style={{ background: P.bg }}>
                              <p className="text-[7px] font-medium uppercase tracking-wider" style={{ color: P.t3 }}>{l}</p>
                              <p className="mt-0.5 text-[13px] font-bold" style={{ color: P.t1 }}>{v}</p>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-lg p-3" style={{ background: P.bg, borderLeft: "2px solid #d4a843" }}>
                          <p className="text-[7px] font-medium uppercase tracking-wider" style={{ color: P.t3 }}>Total puesto en Argentina</p>
                          <p className="mt-0.5 text-[18px] font-extrabold text-[#d4a843]" style={{ fontFamily: "var(--font-display)" }}>USD 6,840</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </R>
          </div>
        </div>
      </section>

      {/* ══════════ PROBLEMA ══════════ */}
      <section className="px-5 py-24 lg:px-8" style={{ background: P.bg2 }}>
        <div className="mx-auto max-w-[1200px]">
          <R>
            <p className="text-[12px] font-semibold uppercase tracking-[0.15em]" style={{ color: P.cyan }}>El problema</p>
            <h2 className="mt-4 max-w-[600px] text-[clamp(1.5rem,3vw,2.2rem)] font-extrabold leading-[1.12] tracking-[-0.02em]" style={{ fontFamily: "var(--font-display)", color: P.t1 }}>
              El problema no es importar. Es cómo lo estás gestionando.
            </h2>
          </R>
          <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Información dispersa","Datos en mails, excels y llamadas que nunca se consolidan."],
              ["Procesos manuales","Carga repetitiva y burocracia que consume el tiempo del equipo."],
              ["Falta de claridad","Dificultad para conocer el estado real de costos y tiempos."],
              ["Dependencia de terceros","Sentir que no tenés el control de tus propios flujos comerciales."],
            ].map(([t,d],i) => (
              <R key={t} d={i*60}>
                <div className="group flex h-full flex-col rounded-xl p-6 transition-all duration-300 hover:bg-white/[0.02]" style={{ border: `1px solid ${P.border}` }}>
                  <div className="mb-4 h-[2px] w-6 transition-all duration-300 group-hover:w-10" style={{ background: `${P.cyan}40` }} />
                  <h4 className="text-[14px] font-semibold" style={{ color: P.t1 }}>{t}</h4>
                  <p className="mt-2 text-[13px] leading-[1.7]" style={{ color: P.t3 }}>{d}</p>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ SOLUCIÓN ══════════ */}
      <section className="px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <R>
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.15em]" style={{ color: P.blue }}>La solución</p>
                <h2 className="mt-4 text-[clamp(1.5rem,3vw,2.2rem)] font-extrabold leading-[1.12] tracking-[-0.02em]" style={{ fontFamily: "var(--font-display)", color: P.t1 }}>
                  E-COMEX cambia la forma en la que operás
                </h2>
                <p className="mt-5 text-[15px] leading-[1.8]" style={{ color: P.t2 }}>
                  No somos solo una plataforma, ni solo una consultora. Somos el eslabón que faltaba: un equipo de expertos que usa tecnología propia para que tu empresa recupere el control de su logística internacional.
                </p>
              </div>
            </R>
            <R d={100}>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["+40%","Eficiencia operativa"],
                  ["100%","Visibilidad total"],
                  ["3 min","Tiempo de análisis"],
                  ["20+","Años de experiencia"],
                ].map(([n,l]) => (
                  <div key={n} className="rounded-xl p-6" style={{ background: P.bg2, border: `1px solid ${P.border}` }}>
                    <p className="text-[24px] font-extrabold" style={{ fontFamily: "var(--font-display)", color: P.t1 }}>{n}</p>
                    <p className="mt-1 text-[11px]" style={{ color: P.t3 }}>{l}</p>
                  </div>
                ))}
              </div>
            </R>
          </div>
        </div>
      </section>

      {/* ══════════ SERVICIOS ══════════ */}
      <section id="servicios" className="px-5 py-24 lg:px-8" style={{ background: P.bg2 }}>
        <div className="mx-auto max-w-[1200px]">
          <R>
            <p className="text-[12px] font-semibold uppercase tracking-[0.15em]" style={{ color: P.cyan }}>Servicios</p>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="max-w-[500px] text-[clamp(1.5rem,3vw,2.2rem)] font-extrabold leading-[1.12] tracking-[-0.02em]" style={{ fontFamily: "var(--font-display)", color: P.t1 }}>
                Todo lo que necesitás para operar con claridad.
              </h2>
              <p className="max-w-[280px] text-[13px] leading-[1.7]" style={{ color: P.t3 }}>
                Servicio profesional completo + plataforma de análisis propia.
              </p>
            </div>
          </R>

          <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { t: "Clasificación de productos", d: "Evaluamos viabilidad técnica y posición arancelaria antes de operar.", c: P.blue },
              { t: "Regulaciones", d: "Identificamos intervenciones, permisos y requisitos anticipadamente.", c: P.cyan },
              { t: "Costos", d: "Desglose completo: FOB, flete, impuestos, gastos operativos, landed cost.", c: P.blue },
              { t: "Logística", d: "Rutas, tiempos y modalidades optimizadas para cada operación.", c: P.cyan },
              { t: "Documentación", d: "Centralización y gestión de toda la documentación operativa.", c: P.blue },
              { t: "Acompañamiento", d: "Consultoría estratégica continua para importadores recurrentes.", c: P.cyan },
            ].map((s, i) => (
              <R key={s.t} d={i*50}>
                <div className="group relative flex h-full flex-col overflow-hidden rounded-xl p-7 transition-all duration-300 hover:translate-y-[-2px]" style={{ background: P.bg, border: `1px solid ${P.border}` }}>
                  <div className="absolute top-0 left-0 right-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: `linear-gradient(90deg, transparent, ${s.c}40, transparent)` }} />
                  <h4 className="text-[14px] font-semibold" style={{ color: P.t1 }}>{s.t}</h4>
                  <p className="mt-3 text-[13px] leading-[1.75]" style={{ color: P.t3 }}>{s.d}</p>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ CÓMO TRABAJAMOS ══════════ */}
      <section id="como" className="px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-[1200px]">
          <R>
            <p className="text-[12px] font-semibold uppercase tracking-[0.15em]" style={{ color: P.blue }}>Cómo trabajamos</p>
            <h2 className="mt-4 max-w-[500px] text-[clamp(1.5rem,3vw,2.2rem)] font-extrabold leading-[1.12] tracking-[-0.02em]" style={{ fontFamily: "var(--font-display)", color: P.t1 }}>
              Cuatro pasos. Sin fricciones.
            </h2>
          </R>

          <div className="relative mt-16">
            <div className="hidden lg:block absolute top-[30px] left-[12.5%] right-[12.5%] h-px" style={{ background: `linear-gradient(90deg, ${P.cyan}30, ${P.blue}30)` }} />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { n: "01", t: "Entendemos tu operación", d: "Mapeamos necesidades y desafíos específicos de tu industria.", c: P.cyan },
                { n: "02", t: "Analizamos la información", d: "Procesamos datos para encontrar patrones de mejora.", c: P.blue },
                { n: "03", t: "Organizamos los datos", d: "Estructuramos el flujo de trabajo en nuestra plataforma.", c: P.cyan },
                { n: "04", t: "Ejecutamos con claridad", d: "Reportes y estados en tiempo real para decidir con seguridad.", c: P.blue },
              ].map((s, i) => (
                <R key={s.n} d={i*80}>
                  <div className="group flex flex-col items-center text-center">
                    <div className="relative z-10 mb-6 flex h-[52px] w-[52px] items-center justify-center rounded-full transition-shadow duration-300 group-hover:shadow-[0_0_20px_-4px_var(--glow)]" style={{ background: P.bg, border: `2px solid ${s.c}`, ["--glow" as string]: `${s.c}50` }}>
                      <span className="text-[14px] font-extrabold" style={{ color: s.c, fontFamily: "var(--font-display)" }}>{s.n}</span>
                    </div>
                    <h4 className="text-[14px] font-semibold" style={{ color: P.t1 }}>{s.t}</h4>
                    <p className="mt-2 text-[13px] leading-[1.7]" style={{ color: P.t3 }}>{s.d}</p>
                  </div>
                </R>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ PLATAFORMA ══════════ */}
      <section id="plataforma" className="px-5 py-24 lg:px-8" style={{ background: P.bg2 }}>
        <div className="mx-auto max-w-[1200px]">
          <R>
            <p className="text-[12px] font-semibold uppercase tracking-[0.15em]" style={{ color: P.cyan }}>Plataforma</p>
            <h2 className="mt-4 max-w-[560px] text-[clamp(1.5rem,3vw,2.2rem)] font-extrabold leading-[1.12] tracking-[-0.02em]" style={{ fontFamily: "var(--font-display)", color: P.t1 }}>
              Además, una plataforma que potencia todo.
            </h2>
            <p className="mt-4 max-w-[460px] text-[15px] leading-[1.75]" style={{ color: P.t2 }}>
              Nuestra tecnología no reemplaza el criterio humano, lo amplifica. Todo tu comercio exterior en un solo lugar.
            </p>
          </R>

          <R d={100}>
            <div className="mt-14 grid gap-4 sm:grid-cols-3">
              {[
                ["Dashboard de control","Visibilidad total de operaciones, costos y tiempos."],
                ["Análisis automatizado","Clasificación, regulaciones y costos en minutos."],
                ["Reportes profesionales","PDFs listos para presentar a tu equipo o clientes."],
              ].map(([t,d]) => (
                <div key={t} className="rounded-xl p-6" style={{ background: P.bg, border: `1px solid ${P.border}` }}>
                  <h4 className="text-[14px] font-semibold" style={{ color: P.t1 }}>{t}</h4>
                  <p className="mt-2 text-[13px] leading-[1.7]" style={{ color: P.t3 }}>{d}</p>
                </div>
              ))}
            </div>
          </R>

          <R d={160}>
            <div className="mt-8">
              <Link href="/app/nueva" className="rounded-lg px-6 py-3 text-[14px] font-medium text-white transition-all hover:shadow-[0_0_30px_-6px_rgba(47,128,237,0.4)]" style={{ background: P.blue }}>
                Probar la plataforma
              </Link>
            </div>
          </R>
        </div>
      </section>

      {/* ══════════ DIFERENCIAL ══════════ */}
      <section className="px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-[800px]">
          <R>
            <h2 className="text-center text-[clamp(1.5rem,3vw,2.2rem)] font-extrabold leading-[1.12] tracking-[-0.02em]" style={{ fontFamily: "var(--font-display)", color: P.t1 }}>
              Transformación E-COMEX
            </h2>
          </R>

          <R d={80}>
            <div className="mt-12 grid overflow-hidden rounded-xl sm:grid-cols-2" style={{ border: `1px solid ${P.border}` }}>
              <div className="p-8 sm:p-10" style={{ background: P.bg }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: P.t3 }}>Antes</p>
                <div className="mt-6 space-y-5">
                  {["Caos documental","Cero previsibilidad","Gestión reactiva"].map(t => (
                    <div key={t} className="flex items-start gap-3">
                      <span className="mt-0.5 text-[16px] leading-none text-red-400/60">✕</span>
                      <span className="text-[14px]" style={{ color: P.t2 }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-8 sm:p-10" style={{ background: P.navy }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: P.cyan }}>Con E-COMEX</p>
                <div className="mt-6 space-y-5">
                  {["Flujo unificado","Control de costos","Gestión proactiva"].map(t => (
                    <div key={t} className="flex items-start gap-3">
                      <span className="mt-0.5 text-[16px] leading-none" style={{ color: P.cyan }}>✓</span>
                      <span className="text-[14px]" style={{ color: P.t1 }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </R>
        </div>
      </section>

      {/* ══════════ PARA QUIÉN ══════════ */}
      <section className="px-5 py-24 lg:px-8" style={{ background: P.bg2 }}>
        <div className="mx-auto max-w-[1200px]">
          <R>
            <h2 className="text-center text-[clamp(1.5rem,3vw,2.2rem)] font-extrabold leading-[1.12] tracking-[-0.02em]" style={{ fontFamily: "var(--font-display)", color: P.t1 }}>
              Aliados para cada perfil
            </h2>
            <p className="mx-auto mt-4 max-w-[480px] text-center text-[14px]" style={{ color: P.t3 }}>
              Soluciones escalables para empresas que entienden que el comercio exterior es el corazón de su competitividad.
            </p>
          </R>

          <div className="mt-14 grid gap-3 sm:grid-cols-3">
            {[
              ["Importadores","Optimizá márgenes y profesionalizá tu cadena de suministros."],
              ["Empresas comerciales","Gestioná catálogos diversos con agilidad y stock garantizado."],
              ["Equipos de compras","Decisiones basadas en datos con herramientas poderosas."],
            ].map(([t,d],i) => (
              <R key={t} d={i*60}>
                <div className="group flex h-full flex-col rounded-xl p-8 text-center transition-all duration-300 hover:translate-y-[-2px]" style={{ background: P.bg, border: `1px solid ${P.border}` }}>
                  <h3 className="text-[16px] font-bold" style={{ color: P.t1 }}>{t}</h3>
                  <p className="mt-3 text-[13px] leading-[1.7]" style={{ color: P.t3 }}>{d}</p>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ CTA FINAL ══════════ */}
      <section className="relative px-5 py-28 lg:px-8 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full opacity-[0.04] blur-[160px]" style={{ background: P.blue }} />
        <div className="relative mx-auto max-w-[600px] text-center">
          <R>
            <h2 className="text-[clamp(1.6rem,4vw,2.6rem)] font-extrabold leading-[1.08] tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: P.t1 }}>
              Empezá a importar con más claridad
            </h2>
            <p className="mt-4 text-[15px]" style={{ color: P.t2 }}>
              Unite a las empresas que ya transformaron sus operaciones con E-COMEX.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a href="#contacto" className="rounded-lg px-8 py-3.5 text-center text-[14px] font-medium text-white transition-all hover:shadow-[0_0_30px_-6px_rgba(47,128,237,0.4)]" style={{ background: P.blue }}>
                Hablar con un especialista
              </a>
              <Link href="/app/nueva" className="rounded-lg px-8 py-3.5 text-center text-[14px] font-medium transition-colors hover:text-white" style={{ border: `1px solid ${P.border}`, color: P.t2 }}>
                Probar la plataforma
              </Link>
            </div>
          </R>
        </div>
      </section>

      {/* ══════════ CONTACTO ══════════ */}
      <section id="contacto" className="px-5 py-24 lg:px-8" style={{ background: P.bg2 }}>
        <div className="mx-auto max-w-[1200px]">
          <div className="grid gap-16 lg:grid-cols-[1fr_420px]">
            <R>
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.15em]" style={{ color: P.blue }}>Contacto</p>
                <h2 className="mt-4 text-[clamp(1.5rem,3vw,2.2rem)] font-extrabold leading-[1.12] tracking-[-0.02em]" style={{ fontFamily: "var(--font-display)", color: P.t1 }}>
                  ¿Querés evaluar una operación?
                </h2>
                <p className="mt-4" style={{ color: P.t2 }}>Dejá tus datos y un especialista se comunica con vos.</p>
                <div className="mt-8 space-y-3 text-[14px]" style={{ color: P.t3 }}>
                  <p>inteligencia@e-comex.com</p>
                  <p>Buenos Aires, Argentina</p>
                </div>
              </div>
            </R>
            <R d={80}>
              <form className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  {["Nombre","Empresa"].map(ph => (
                    <input key={ph} type="text" placeholder={ph} className="w-full rounded-lg px-4 py-3 text-[14px] outline-none transition-colors focus:border-[#2F80ED]/40" style={{ background: P.bg, border: `1px solid ${P.border}`, color: P.t1 }} />
                  ))}
                </div>
                <input type="email" placeholder="Email" className="w-full rounded-lg px-4 py-3 text-[14px] outline-none transition-colors focus:border-[#2F80ED]/40" style={{ background: P.bg, border: `1px solid ${P.border}`, color: P.t1 }} />
                <textarea rows={3} placeholder="Mensaje" className="w-full resize-none rounded-lg px-4 py-3 text-[14px] outline-none transition-colors focus:border-[#2F80ED]/40" style={{ background: P.bg, border: `1px solid ${P.border}`, color: P.t1 }} />
                <button type="button" className="w-full rounded-lg py-3 text-[14px] font-medium text-white transition-all hover:shadow-[0_0_20px_-4px_rgba(47,128,237,0.3)]" style={{ background: P.blue }}>
                  Enviar
                </button>
              </form>
            </R>
          </div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="px-5 py-8 lg:px-8" style={{ borderTop: `1px solid ${P.border}` }}>
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 text-[12px] sm:flex-row" style={{ color: P.t3 }}>
          <span>© 2026 E-COMEX</span>
          <span>Buenos Aires, Argentina</span>
        </div>
      </footer>
    </div>
  );
}
