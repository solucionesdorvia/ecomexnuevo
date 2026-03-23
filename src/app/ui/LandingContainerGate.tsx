"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import TopoBackground from "@/components/TopoBackground";

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setShow(true); obs.disconnect(); } }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{
      opacity: show ? 1 : 0,
      transform: show ? "none" : "translateY(16px)",
      transition: `opacity 0.6s cubic-bezier(.16,1,.3,1) ${delay}ms, transform 0.6s cubic-bezier(.16,1,.3,1) ${delay}ms`,
    }}>{children}</div>
  );
}

export default function LandingContainerGate() {
  return (
    <div className="bg-[#07111A] text-[#b0b8c9] antialiased" style={{ fontFamily: "var(--font-body, 'Inter', sans-serif)" }}>

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.04] bg-[#07111A]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between px-6">
          <img src="/brand/ecomex-logo.png" alt="E-COMEX" className="h-6 brightness-0 invert" />
          <div className="hidden items-center gap-8 md:flex">
            {["Nosotros","Servicios","Plataforma","Contacto"].map((l)=>(
              <a key={l} href={`#${l.toLowerCase()}`} className="text-[13px] text-[#555c6b] transition-colors hover:text-white">{l}</a>
            ))}
          </div>
          <Link href="/login" className="relative rounded-md bg-[#2b59ff] px-5 py-[7px] text-[13px] font-medium text-white transition-all duration-200 hover:shadow-[0_0_20px_-4px_rgba(43,89,255,0.4)]">
            Acceder
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden px-6 pb-0 pt-20 lg:pt-32">
        <TopoBackground />

        <div className="relative mx-auto max-w-[1100px]">
          <Reveal>
            <p className="text-[13px] font-medium text-[#2b59ff]">Servicios de importación y comercio exterior</p>
          </Reveal>
          <Reveal delay={60}>
            <h1 className="mt-5 max-w-[700px] text-[clamp(2.4rem,5vw,4rem)] font-extrabold leading-[1.02] tracking-[-0.04em] text-white" style={{ fontFamily: "var(--font-display, 'Manrope', sans-serif)" }}>
              Inteligencia de importación.
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-6 max-w-[500px] text-[17px] leading-[1.7] text-[#6b7280]">
              E-COMEX nace de más de 20 años de experiencia en comercio exterior.
              Convertimos ese conocimiento en una plataforma que automatiza en minutos
              lo que antes llevaba horas.
            </p>
          </Reveal>
          <Reveal delay={180}>
            <div className="mt-8 flex items-center gap-4">
              <a href="#contacto" className="rounded-md bg-white px-6 py-3 text-[14px] font-medium text-[#07111A] transition-colors hover:bg-[#dde1e8]">
                Hablar con un especialista
              </a>
              <Link href="/app/nueva" className="text-[14px] font-medium text-[#555c6b] underline decoration-[#2b59ff]/30 underline-offset-4 transition-colors hover:text-white hover:decoration-[#2b59ff]">
                Probar la plataforma
              </Link>
            </div>
          </Reveal>

          {/* Platform mockup — the hero moment */}
          <Reveal delay={260}>
            <div className="relative mt-24" style={{ perspective: "1200px" }}>
              {/* Glow behind the mockup */}
              <div className="pointer-events-none absolute -inset-8 rounded-3xl" style={{
                background: "radial-gradient(ellipse 70% 50% at 50% 60%, rgba(43,89,255,0.08), transparent 70%)"
              }} />
              <div style={{ transform: "rotateX(2deg)", transformOrigin: "center bottom" }}>
                <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#0B1622] shadow-[0_50px_100px_-30px_rgba(43,89,255,0.08),0_30px_60px_-20px_rgba(0,0,0,0.4)]">
                  {/* Chrome */}
                  <div className="flex items-center gap-2 border-b border-white/[0.04] px-4 py-2.5 bg-[#0B1622]">
                    <div className="flex gap-1.5">
                      <span className="h-[9px] w-[9px] rounded-full bg-[#ff5f57]" />
                      <span className="h-[9px] w-[9px] rounded-full bg-[#febc2e]" />
                      <span className="h-[9px] w-[9px] rounded-full bg-[#28c840]" />
                    </div>
                    <div className="mx-auto rounded-md bg-[#07111A] px-4 py-1 text-[11px] text-[#555c6b]">e-comex.app/analisis</div>
                  </div>
                  {/* App */}
                  <div className="flex min-h-[320px]">
                    <div className="hidden w-[48px] shrink-0 flex-col items-center gap-3 border-r border-white/[0.04] py-4 sm:flex">
                      {[0,1,2,3].map((i)=>(
                        <div key={i} className="h-5 w-5 rounded" style={{ background: i === 0 ? "rgba(43,89,255,0.15)" : "#0B1622" }} />
                      ))}
                    </div>
                    <div className="flex flex-1 gap-4 p-5">
                      <div className="flex-1 space-y-2.5">
                        <div className="flex items-center gap-3 rounded-lg bg-[#0B1622] p-3">
                          <div className="h-9 w-9 rounded bg-[#0B1622]" />
                          <div className="flex-1"><div className="h-2.5 w-36 rounded bg-[#0B1622]" /><div className="mt-1.5 h-2 w-20 rounded bg-[#0B1622]" /></div>
                          <span className="rounded bg-[#2b59ff]/15 px-2 py-0.5 text-[8px] font-bold text-[#2b59ff]">Analizado</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-[#0B1622] px-4 py-2.5">
                          <span className="text-[10px] text-[#555c6b]">NCM</span>
                          <span className="font-mono text-[13px] font-bold text-white">8703.23.10</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {[["FOB","$2,400"],["Flete","$680"],["Impuestos","$1,920"]].map(([l,v])=>(
                            <div key={l} className="rounded-lg bg-[#0B1622] p-2.5">
                              <p className="text-[7px] font-medium uppercase tracking-wider text-[#555c6b]">{l}</p>
                              <p className="mt-0.5 text-[13px] font-bold text-white">{v}</p>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-lg bg-[#0B1622] p-3 border-l-2 border-[#d4a843]">
                          <p className="text-[7px] font-medium uppercase tracking-wider text-[#555c6b]">Total puesto en Argentina</p>
                          <p className="mt-0.5 text-[20px] font-extrabold text-[#d4a843]" style={{ fontFamily: "var(--font-display)" }}>USD 6,840</p>
                        </div>
                      </div>
                      <div className="hidden w-[160px] shrink-0 space-y-2 lg:block">
                        {[["Riesgo","Bajo","#7c3aed"],["Timing","35–55 días","#b0b8c9"],["Ruta","Marítimo","#b0b8c9"]].map(([l,v,c])=>(
                          <div key={l} className="rounded-lg bg-[#0B1622] p-2.5">
                            <p className="text-[7px] font-medium uppercase tracking-wider text-[#555c6b]">{l}</p>
                            <p className="mt-0.5 text-[11px] font-bold" style={{ color: c }}>{v}</p>
                          </div>
                        ))}
                        <div className="rounded bg-[#2b59ff] py-2 text-center text-[9px] font-bold text-white">Descargar PDF</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Fade bottom */}
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#07111A] to-transparent" />
            </div>
          </Reveal>

          <div className="h-20" />
        </div>
      </section>

      {/* Accent divider */}
      <div className="mx-auto max-w-[1100px] px-6">
        <div className="h-px" style={{ background: "linear-gradient(90deg, #2b59ff, #7c3aed, transparent)" }} />
      </div>

      {/* ── NOSOTROS ── */}
      <section id="nosotros" className="relative px-6 py-28 overflow-hidden">
        <div className="pointer-events-none absolute top-0 right-0 h-[400px] w-[400px] rounded-full bg-[#7c3aed] opacity-[0.025] blur-[140px]" />

        <div className="mx-auto max-w-[1100px]">
          {/* Intro */}
          <Reveal>
            <div className="max-w-[600px]">
              <p className="text-[13px] font-medium text-[#7c3aed]">Nosotros</p>
              <h2 className="mt-4 text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-white" style={{ fontFamily: "var(--font-display)" }}>
                ¿Para qué nacimos?
              </h2>
              <p className="mt-5 text-[15px] leading-[1.75] text-[#b0b8c9]">
                Nacimos con el firme propósito de brindarles a nuestros clientes un mejor entorno para sus operaciones de comercio exterior. Nos distingue nuestro compromiso con importadores y exportadores, basado en la asociatividad de servicios especializados y un gran grupo profesional, fuertemente involucrado en cada proceso.
              </p>
            </div>
          </Reveal>

          {/* 4 pillars */}
          <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Propósito", "Brindar a nuestros clientes el mejor entorno para sus operaciones de comex."],
              ["Metodología", "Trabajamos en equipo y con alianzas estratégicas para alcanzar grandes resultados."],
              ["Expertise", "Cada consultor tiene experiencia en un área específica del comercio exterior."],
              ["Herramientas", "La economía colaborativa, alianzas estratégicas e intercambio de recursos."],
            ].map(([t, d], i) => (
              <Reveal key={t} delay={i * 60}>
                <div className="group flex h-full flex-col rounded-xl border border-white/[0.04] p-6 transition-all duration-300 hover:border-[#7c3aed]/20 hover:bg-[#7c3aed]/[0.03]">
                  <p className="text-[13px] font-bold text-[#7c3aed]">{t}</p>
                  <p className="mt-3 text-[13px] leading-[1.7] text-[#555c6b]">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* How we work + differentiators */}
          <div className="mt-20 grid gap-16 lg:grid-cols-2">
            <Reveal>
              <div>
                <h3 className="text-[18px] font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>¿Cómo trabajamos?</h3>
                <div className="mt-4 space-y-4 text-[14px] leading-[1.75] text-[#b0b8c9]">
                  <p>Elegimos trabajar en equipo y con alianzas estratégicas, que nos permiten crear soluciones innovadoras para nuestros clientes en sus operaciones de importación y exportación.</p>
                  <p>Cada uno de nuestros consultores y asesores tienen experiencia en un sector específico de la industria del comercio exterior. Teniendo en cuenta su expertise, cada consultor es asignado a cada proyecto en particular.</p>
                  <p className="text-[#555c6b]">Esta dinámica de trabajo, que implica la colaboración y asesoría permanente de los consultores que integran E-Comex, permiten dinamizar y optimizar las operaciones de comercio exterior, generando un crecimiento sostenido y mensurable.</p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div>
                <h3 className="text-[18px] font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>¿En qué nos diferenciamos?</h3>
                <div className="mt-4 space-y-3">
                  {[
                    "Generamos y desarrollamos negocios internacionales para empresas, facilitando todas sus operaciones de importación y exportación.",
                    "Asesoramos, gestionamos, generamos soluciones en negocios internacionales. Con HQ en Argentina, hacia el mundo.",
                    "Damos solución a las deficiencias en tiempos, comunicación, financiación, pagos, seguimiento de operaciones, gestión administrativa y requerimientos legales.",
                    "Tercerizamos el departamento de comercio exterior de empresas de diversos rubros y áreas de actividad.",
                  ].map((text) => (
                    <div key={text.slice(0, 30)} className="flex gap-3">
                      <div className="mt-2 h-[2px] w-4 shrink-0 bg-[#2b59ff]/30" />
                      <p className="text-[13px] leading-[1.7] text-[#555c6b]">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── SERVICIOS ── */}
      <section id="servicios" className="relative border-t border-white/[0.04] px-6 py-28">
        <div className="pointer-events-none absolute bottom-0 left-[20%] h-[300px] w-[300px] rounded-full bg-[#2b59ff] opacity-[0.02] blur-[120px]" />
        <div className="mx-auto max-w-[1100px]">
          <Reveal>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[13px] font-medium text-[#2b59ff]">Servicios</p>
                <h2 className="mt-4 text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-white" style={{ fontFamily: "var(--font-display)" }}>
                  Acompañamiento integral.
                </h2>
              </div>
              <p className="max-w-[260px] text-[13px] leading-[1.7] text-[#555c6b]">
                La plataforma es una herramienta más dentro de un servicio profesional completo.
              </p>
            </div>
          </Reveal>

          <div className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Análisis de producto", "Viabilidad técnica y comercial antes de operar."],
              ["Análisis regulatorio", "Intervenciones, permisos y requisitos anticipados."],
              ["Estimación de costos", "FOB, flete, impuestos, operativos — landed cost."],
              ["Logística internacional", "Rutas, tiempos y modalidades optimizadas."],
              ["Desarrollo de proveedores", "Búsqueda y validación de proveedores confiables."],
              ["Consultoría estratégica", "Acompañamiento recurrente para importadores."],
            ].map(([t, d], i) => (
              <Reveal key={t} delay={i * 50}>
                <div className="group flex h-full flex-col rounded-xl border border-white/[0.04] p-6 transition-all duration-300 hover:border-white/[0.08]">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-[2px] w-5 bg-[#2b59ff]/25 transition-all duration-300 group-hover:w-8 group-hover:bg-[#2b59ff]/60" />
                    <span className="text-[10px] font-medium text-[#555c6b]">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h4 className="text-[15px] font-semibold text-white">{t}</h4>
                  <p className="mt-2 text-[13px] leading-[1.75] text-[#555c6b]">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLATAFORMA ── */}
      <section id="plataforma" className="relative border-t border-white/[0.04] px-6 py-28 overflow-hidden">
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-[#7c3aed] opacity-[0.02] blur-[160px]" />
        <div className="mx-auto max-w-[1100px]">
          <Reveal>
            <p className="text-[13px] font-medium text-[#7c3aed]">Plataforma</p>
            <h2 className="mt-4 max-w-[500px] text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-white" style={{ fontFamily: "var(--font-display)" }}>
              Del producto al costo final en minutos.
            </h2>
            <p className="mt-4 max-w-[420px] text-[15px] leading-[1.7] text-[#6b7280]">
              Link, imagen, factura o descripción. La plataforma hace el resto.
            </p>
          </Reveal>

          <div className="mt-16 grid gap-6 lg:grid-cols-3">
            {[
              { n: "01", title: "Cargá el producto", desc: "Link de Alibaba, foto, factura o texto libre. El sistema extrae todo automáticamente.", color: "#2b59ff" },
              { n: "02", title: "Análisis estructurado", desc: "NCM, requisitos regulatorios, costos e impuestos. Trazable y documentado.", color: "#7c3aed" },
              { n: "03", title: "Resultado profesional", desc: "Reporte PDF, comparación de escenarios o consultoría para validar.", color: "#2b59ff" },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 80}>
                <div className="group rounded-xl border border-white/[0.04] p-7 transition-all duration-300 hover:border-white/[0.08]" style={{ background: `linear-gradient(160deg, ${s.color}04, transparent 60%)` }}>
                  <span className="text-[40px] font-extrabold leading-none" style={{ fontFamily: "var(--font-display)", color: `${s.color}15` }}>{s.n}</span>
                  <h4 className="mt-4 text-[15px] font-semibold text-white">{s.title}</h4>
                  <p className="mt-2 text-[13px] leading-[1.75] text-[#555c6b]">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={200}>
            <div className="mt-12">
              <Link href="/app/nueva" className="rounded-md bg-[#2b59ff] px-6 py-3 text-[14px] font-medium text-white transition-colors hover:bg-[#2348d4]">
                Probar la plataforma
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="px-6 py-20">
        <Reveal>
          <div className="mx-auto max-w-[1100px] overflow-hidden rounded-2xl px-6 py-12 sm:px-12 sm:py-16 relative border border-white/[0.04]" style={{ background: "linear-gradient(135deg, #0d1029, #110d20)" }}>
            {/* Animated accent line at top */}
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #2b59ff, #7c3aed, transparent)" }} />
            <div className="pointer-events-none absolute -top-20 -right-20 h-[300px] w-[300px] rounded-full bg-[#2b59ff] opacity-[0.07] blur-[100px]" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-[200px] w-[200px] rounded-full bg-[#7c3aed] opacity-[0.05] blur-[80px]" />
            <div className="relative flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-[clamp(1.4rem,2.5vw,2rem)] font-extrabold tracking-tight text-white" style={{ fontFamily: "var(--font-display)" }}>
                  ¿Listo para importar con más claridad?
                </h3>
                <p className="mt-2 text-[15px] text-[#6b7280]">Hablá con un especialista o probá la plataforma.</p>
              </div>
              <div className="flex gap-3 shrink-0">
                <a href="#contacto" className="rounded-md bg-white px-6 py-3 text-[14px] font-medium text-[#07111A] transition-colors hover:bg-[#dde1e8]">
                  Contacto
                </a>
                <Link href="/app/nueva" className="rounded-md border border-white/10 px-6 py-3 text-[14px] font-medium text-white transition-colors hover:bg-white/5">
                  Plataforma
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── CONTACTO ── */}
      <section id="contacto" className="border-t border-white/[0.04] px-6 py-28">
        <div className="mx-auto max-w-[1100px]">
          <div className="grid gap-16 lg:grid-cols-[1fr_400px]">
            <Reveal>
              <div>
                <p className="text-[13px] font-medium text-[#7c3aed]">Contacto</p>
                <h2 className="mt-4 text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-white" style={{ fontFamily: "var(--font-display)" }}>
                  Dejá tus datos y te contactamos.
                </h2>
                <div className="mt-8 space-y-3 text-[14px] text-[#555c6b]">
                  <p>inteligencia@e-comex.com</p>
                  <p>Buenos Aires, Argentina</p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <form className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input type="text" placeholder="Nombre" className="w-full rounded-md border border-white/[0.06] bg-transparent px-4 py-3 text-[14px] text-white outline-none placeholder:text-[#2a2e38] transition-colors focus:border-[#2b59ff]/40" />
                  <input type="text" placeholder="Empresa" className="w-full rounded-md border border-white/[0.06] bg-transparent px-4 py-3 text-[14px] text-white outline-none placeholder:text-[#2a2e38] transition-colors focus:border-[#2b59ff]/40" />
                </div>
                <input type="email" placeholder="Email" className="w-full rounded-md border border-white/[0.06] bg-transparent px-4 py-3 text-[14px] text-white outline-none placeholder:text-[#2a2e38] transition-colors focus:border-[#2b59ff]/40" />
                <textarea rows={3} placeholder="Mensaje" className="w-full resize-none rounded-md border border-white/[0.06] bg-transparent px-4 py-3 text-[14px] text-white outline-none placeholder:text-[#2a2e38] transition-colors focus:border-[#2b59ff]/40" />
                <button type="button" className="w-full rounded-md bg-white py-3 text-[14px] font-medium text-[#07111A] transition-colors hover:bg-[#dde1e8]">
                  Enviar
                </button>
              </form>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.04] px-6 py-8">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between text-[12px] text-[#2a2e38]">
          <span>© 2026 E-COMEX</span>
          <span>Buenos Aires, Argentina</span>
        </div>
      </footer>
    </div>
  );
}
