"use client";

import Image from "next/image";
import { QuickLeadForm } from "./QuickLeadForm";
import { ContactForm } from "./ContactForm";
import { MobileContactBar } from "./MobileContactBar";

/**
 * Plantilla de landing por vertical (Etapa 1 del plan). Cada campaña de Google Ads
 * dirige a /vehiculos, /maquinaria o /bienes-de-capital: una página con el
 * vocabulario y el formulario propios del rubro, en lugar de llevar todo a la home.
 * Reusa el sistema de diseño del sitio (paleta P) y los componentes de contacto.
 */
export type Vertical = {
  slug: string;
  nav: string;
  eyebrow: string;
  titulo: string;
  intro: string;
  chips: string[];
  puntosTitulo: string;
  puntos: { t: string; d: string }[];
};

const P = {
  bg: "#07111A", bg2: "#0B1622",
  cyan: "#18C3D6", blue: "#2F80ED",
  t1: "#F5F7FA", t2: "#A7B3C2", t3: "#5A6577",
  border: "rgba(255,255,255,0.06)",
};

const WA_NUMBER = "5491126268316";
const WA_MSG = encodeURIComponent("Hola, quiero consultar sobre una importación.");

export function VerticalLanding({ v }: { v: Vertical }) {
  return (
    <div
      style={{ background: P.bg, color: P.t2, fontFamily: "var(--font-body, 'Inter', sans-serif)" }}
      className="antialiased pb-[84px] md:pb-0"
    >
      {/* Header */}
      <header className="sticky top-0 z-50 w-full pt-safe" style={{ background: `${P.bg}cc`, backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderBottom: `1px solid ${P.border}` }}>
        <div className="mx-auto flex min-h-14 max-w-[1200px] items-center justify-between px-4 sm:px-5 lg:px-8">
          <a href="/" aria-label="E-COMEX — Inicio" className="flex items-center">
            <Image src="/brand/ecomex-logo.png" alt="E-COMEX" width={577} height={77} className="h-7 w-auto brightness-0 invert" />
          </a>
          <div className="flex items-center gap-2">
            <a href="/cotizador" className="hidden rounded-lg px-4 py-2 text-[13px] font-medium transition-colors hover:text-white sm:inline-block" style={{ border: `1px solid ${P.border}`, color: P.t2 }}>
              Cotizador
            </a>
            <a href="#contacto" className="rounded-lg px-4 py-2 text-[13px] font-semibold text-[#030d18] transition-all hover:opacity-90" style={{ background: P.cyan }}>
              Consultar con un especialista
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-14 sm:px-5 lg:px-8 lg:pb-24 lg:pt-24">
        <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(1000px 500px at 80% -10%, ${P.blue}12, transparent 60%)` }} />
        <div className="relative mx-auto max-w-[1200px]">
          <div className="grid items-center gap-14 lg:grid-cols-[1fr_460px]">
            <div className="max-w-[600px]">
              <p className="text-[12px] font-semibold uppercase tracking-[0.15em]" style={{ color: P.cyan }}>{v.eyebrow}</p>
              <h1 className="mt-5 text-[clamp(2rem,4.8vw,3.25rem)] font-extrabold leading-[1.07] tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", color: P.t1 }}>
                {v.titulo}
              </h1>
              <p className="mt-6 text-[16px] leading-[1.75]" style={{ color: P.t2 }}>{v.intro}</p>
              <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
                {v.chips.map((c) => (
                  <div key={c} className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full" style={{ background: P.cyan }} />
                    <span className="text-[12px] font-medium tracking-wide" style={{ color: P.t3 }}>{c}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-10 lg:mt-0">
              <QuickLeadForm variant="hero" vertical={v.nav} />
            </div>
          </div>
        </div>
      </section>

      {/* Qué resolvemos */}
      <section className="px-5 py-20 lg:px-8 lg:py-24" style={{ background: P.bg2 }}>
        <div className="mx-auto max-w-[1200px]">
          <h2 className="max-w-[560px] text-[clamp(1.5rem,3vw,2.2rem)] font-extrabold leading-[1.12] tracking-[-0.02em]" style={{ fontFamily: "var(--font-display)", color: P.t1 }}>
            {v.puntosTitulo}
          </h2>
          <div className="mt-12 grid gap-3 sm:grid-cols-2">
            {v.puntos.map((p) => (
              <div key={p.t} className="group flex h-full flex-col rounded-xl p-6 transition-all duration-300 hover:bg-white/[0.02]" style={{ border: `1px solid ${P.border}`, background: P.bg }}>
                <div className="mb-4 h-[2px] w-6 transition-all duration-300 group-hover:w-10" style={{ background: `${P.cyan}55` }} />
                <h3 className="text-[14px] font-semibold" style={{ color: P.t1 }}>{p.t}</h3>
                <p className="mt-2 text-[13px] leading-[1.7]" style={{ color: P.t3 }}>{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contacto */}
      <section id="contacto" className="px-5 py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid gap-14 lg:grid-cols-[1fr_420px]">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.15em]" style={{ color: P.blue }}>Contacto</p>
              <h2 className="mt-4 text-[clamp(1.5rem,3vw,2.2rem)] font-extrabold leading-[1.12] tracking-[-0.02em]" style={{ fontFamily: "var(--font-display)", color: P.t1 }}>
                Contanos tu operación de {v.nav.toLowerCase()}
              </h2>
              <p className="mt-4" style={{ color: P.t2 }}>Dejá tus datos y un especialista se comunica con vos.</p>
              <div className="mt-8 space-y-3 text-[14px]" style={{ color: P.t3 }}>
                <p>info@e-comex.com.ar</p>
                <p>Av. Pte. Julio A. Roca 771, 6° Piso Of. 10 — CABA</p>
              </div>
            </div>
            <ContactForm />
          </div>
        </div>
      </section>

      {/* Barra móvil */}
      <MobileContactBar />

      {/* WhatsApp flotante */}
      <a
        href={`https://wa.me/${WA_NUMBER}?text=${WA_MSG}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar por WhatsApp"
        className="fixed bottom-24 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-[0_8px_30px_-6px_rgba(37,211,102,0.6)] transition-transform hover:scale-110 md:bottom-6 md:right-6"
        style={{ background: "#25D366" }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 text-white" aria-hidden>
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
        </svg>
      </a>

      {/* Footer */}
      <footer className="px-5 py-8 lg:px-8" style={{ borderTop: `1px solid ${P.border}` }}>
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 text-[12px] sm:flex-row" style={{ color: P.t3 }}>
          <span>© 2026 E-COMEX · Buenos Aires, Argentina</span>
          <div className="flex items-center gap-4">
            <a href="/" className="transition-colors hover:text-white" style={{ color: P.t3 }}>Inicio</a>
            <a href="/privacidad" className="transition-colors hover:text-white" style={{ color: P.t3 }}>Privacidad</a>
            <a href="/terminos" className="transition-colors hover:text-white" style={{ color: P.t3 }}>Términos</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
