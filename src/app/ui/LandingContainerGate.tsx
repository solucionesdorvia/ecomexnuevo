"use client";

import Image from "next/image";
import Link from "next/link";
import { Outfit } from "next/font/google";
import {
  ArrowRight,
  Check,
  X,
  ChartLineUp,
  FileText,
  GlobeHemisphereWest,
  CurrencyCircleDollar,
  Truck,
  UsersThree,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-landing",
});

/* ── Scroll reveal (transform + opacity only) ── */
function R({
  children,
  cl = "",
  d = 0,
}: {
  children: React.ReactNode;
  cl?: string;
  d?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const reduce = useReducedMotion();
  const visible = reduce === true || inView;
  useEffect(() => {
    if (reduce === true) return;
    const el = ref.current;
    if (!el) return;
    const o = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setInView(true);
          o.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    o.observe(el);
    return () => o.disconnect();
  }, [reduce]);
  return (
    <div
      ref={ref}
      className={cl}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(16px)",
        transition:
          reduce === true
            ? "none"
            : `opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1) ${d}ms, transform 0.65s cubic-bezier(0.16, 1, 0.3, 1) ${d}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* Zinc / slate neutrals + single accent (cyan); CTAs use same hue family, no purple glow */
const P = {
  bg: "#080c10",
  bg2: "#0c1118",
  panel: "#111820",
  ink: "#eef2f7",
  ink2: "#9aa8b8",
  ink3: "#5c6b7d",
  border: "rgba(148, 163, 184, 0.12)",
  borderIn: "rgba(255,255,255,0.08)",
  accent: "#22c1c8",
  accentDim: "rgba(34, 193, 200, 0.14)",
  cta: "#1d6fd4",
  gold: "#c9a227",
};

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [
    ["#servicios", "Servicios"],
    ["#como", "Cómo trabajamos"],
    ["#plataforma", "Plataforma"],
    ["#contacto", "Contacto"],
  ];

  return (
    <nav
      className={`fixed top-0 z-40 w-full transition-[background,border-color,box-shadow] duration-300 ${
        scrolled
          ? "border-b shadow-[0_12px_40px_-24px_rgba(0,0,0,0.5)]"
          : "border-b border-transparent"
      }`}
      style={{
        background: scrolled ? "rgba(8,12,16,0.78)" : "transparent",
        borderColor: scrolled ? P.border : "transparent",
        backdropFilter: scrolled ? "blur(20px) saturate(1.15)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(20px) saturate(1.15)" : "none",
        boxShadow: scrolled ? "inset 0 1px 0 0 rgba(255,255,255,0.04)" : undefined,
      }}
    >
      <div className="mx-auto flex h-[3.75rem] max-w-[1400px] items-center justify-between px-5 lg:px-10">
        <Image
          src="/brand/ecomex-logo.png"
          alt="E-COMEX"
          width={132}
          height={20}
          className="h-5 w-auto brightness-0 invert"
          priority
        />

        <div className="hidden items-center gap-9 md:flex">
          {links.map(([h, l]) => (
            <a
              key={l}
              href={h}
              className="text-[13px] tracking-wide text-[#9aa8b8] transition-colors hover:text-[#eef2f7]"
            >
              {l}
            </a>
          ))}
          <a
            href="#contacto"
            className="rounded-xl px-5 py-2.5 text-[13px] font-medium text-white transition-[transform,background-color,border-color] active:scale-[0.98]"
            style={{
              background: P.cta,
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.12)",
            }}
          >
            Hablar con un especialista
          </a>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-[#9aa8b8] md:hidden"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path
              d={
                menuOpen
                  ? "M6 6l12 12M6 18L18 6"
                  : "M4 6h16M4 12h16M4 18h16"
              }
            />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div
          className="border-t px-5 pb-6 pt-4 md:hidden"
          style={{
            borderColor: P.border,
            background: "rgba(8,12,16,0.96)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div className="flex flex-col gap-4">
            {links.map(([h, l]) => (
              <a
                key={l}
                href={h}
                onClick={() => setMenuOpen(false)}
                className="text-[14px] text-[#9aa8b8]"
              >
                {l}
              </a>
            ))}
            <a
              href="#contacto"
              onClick={() => setMenuOpen(false)}
              className="mt-2 rounded-xl py-3 text-center text-[14px] font-medium text-white active:scale-[0.99]"
              style={{ background: P.cta }}
            >
              Hablar con un especialista
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

function KineticStrip() {
  const items = [
    "Clasificación NCM",
    "Landed cost",
    "Regulaciones",
    "Documentación",
    "Operaciones en vivo",
  ];
  const reduce = useReducedMotion();
  const segment = `${items.join("       ·       ")}       ·       `;
  return (
    <div
      className="relative overflow-hidden border-y py-2.5"
      style={{
        borderColor: P.border,
        background: "rgba(12,17,24,0.6)",
      }}
    >
      <div
        className={`flex w-max text-[11px] font-medium uppercase tracking-[0.2em] ${reduce ? "" : "landing-marquee-track"}`}
        style={{ color: P.ink3 }}
        aria-hidden
      >
        <span className="shrink-0 whitespace-nowrap px-6">{segment}</span>
        <span className="shrink-0 whitespace-nowrap px-6">{segment}</span>
      </div>
    </div>
  );
}

function HeroCopy() {
  const reduce = useReducedMotion();
  const spring = { type: "spring" as const, stiffness: 100, damping: 22 };
  const stagger = {
    visible: {
      transition: { staggerChildren: reduce ? 0 : 0.07, delayChildren: reduce ? 0 : 0.05 },
    },
  };
  const item = {
    hidden: reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: reduce ? { duration: 0 } : spring,
    },
  };

  return (
    <motion.div
      className="max-w-xl lg:max-w-none lg:pr-8"
      initial="hidden"
      animate="visible"
      variants={stagger}
    >
      <motion.div variants={item}>
        <div
          className="inline-flex items-center gap-2.5 rounded-full px-3.5 py-1.5"
          style={{
            border: `1px solid ${P.border}`,
            background: `${P.bg2}ee`,
            boxShadow: `inset 0 1px 0 0 ${P.borderIn}`,
          }}
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{
              background: P.accent,
              boxShadow: `0 0 0 3px ${P.accentDim}`,
            }}
          />
          <span
            className="text-[11px] font-medium tracking-wide"
            style={{ color: P.ink3 }}
          >
            Más de veinte años en comercio exterior
          </span>
        </div>
      </motion.div>

      <motion.h1
        variants={item}
        className="mt-7 text-[clamp(2.1rem,4vw,3.1rem)] font-semibold leading-[1.08] tracking-[-0.035em]"
        style={{ color: P.ink }}
      >
        Operá importaciones con datos claros y criterio técnico
      </motion.h1>

      <motion.p
        variants={item}
        className="mt-5 max-w-[52ch] text-[15px] leading-relaxed"
        style={{ color: P.ink2 }}
      >
        Unimos consultoría y software para ordenar clasificación arancelaria,
        costos puestos en destino, normativa y seguimiento operativo. Menos
        idas y vueltas, más decisiones con respaldo.
      </motion.p>

      <motion.div variants={item} className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
        <a
          href="#contacto"
          className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-center text-[14px] font-medium text-white transition-[transform,opacity] active:scale-[0.98]"
          style={{
            background: P.cta,
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.1)",
          }}
        >
          Coordinar una llamada
          <ArrowRight className="h-4 w-4 opacity-90" weight="bold" />
        </a>
        <a
          href="#como"
          className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-center text-[14px] font-medium transition-colors hover:text-[#eef2f7] active:scale-[0.98]"
          style={{
            border: `1px solid ${P.border}`,
            color: P.ink2,
            boxShadow: `inset 0 1px 0 0 ${P.borderIn}`,
          }}
        >
          Ver el proceso
        </a>
      </motion.div>

      <motion.div
        variants={item}
        className="mt-12 flex flex-wrap gap-x-10 gap-y-3 border-t pt-8"
        style={{ borderColor: P.border }}
      >
        {(
          [
            ["Análisis estructurado", ChartLineUp],
            ["Documentos en un solo lugar", FileText],
            ["Costos trazables", CurrencyCircleDollar],
          ] as const
        ).map(([label, Icon]) => (
          <div key={label} className="flex items-center gap-2.5">
            <Icon className="h-4 w-4 shrink-0" style={{ color: P.accent }} weight="duotone" />
            <span className="text-[12px] font-medium tracking-wide" style={{ color: P.ink3 }}>
              {label}
            </span>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

export default function LandingContainerGate() {
  return (
    <div
      className={`${outfit.variable} antialiased`}
      style={{
        background: P.bg,
        color: P.ink2,
        fontFamily: "var(--font-landing), ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {/* Grain: fixed, non-interactive, isolated layer */}
      <div
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.035]"
        aria-hidden
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10">
        <Navbar />
        <KineticStrip />

        {/* HERO — asymmetric split, min dynamic viewport */}
        <section className="relative overflow-hidden px-5 pb-24 pt-24 lg:px-10 lg:pt-28">
          <iframe
            src="/hero-3d.html"
            className="pointer-events-none absolute inset-0 h-full min-h-[100dvh] w-full border-0"
            style={{ opacity: 0.45 }}
            loading="lazy"
            title=""
          />
          <div
            className="pointer-events-none absolute inset-0 min-h-[100dvh]"
            style={{
              background: `linear-gradient(105deg, ${P.bg}f2 0%, ${P.bg}d8 38%, ${P.bg}aa 62%, ${P.bg}e8 100%)`,
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.4]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
              backgroundSize: "56px 56px",
              maskImage:
                "radial-gradient(ellipse 90% 70% at 18% 20%, black 12%, transparent 72%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 90% 70% at 18% 20%, black 12%, transparent 72%)",
            }}
          />

          <div className="relative mx-auto grid max-w-[1400px] min-h-[min(100dvh,920px)] items-center gap-14 lg:grid-cols-[minmax(0,1.12fr)_minmax(300px,0.88fr)] lg:gap-6">
            <div className="lg:py-6">
              <HeroCopy />
            </div>

            <div className="relative lg:-mr-4 lg:justify-self-end">
              <div
                className="absolute -left-8 top-1/2 hidden h-[72%] w-px -translate-y-1/2 lg:block"
                style={{
                  background: `linear-gradient(180deg, transparent, ${P.accent}55, transparent)`,
                }}
              />
              <div
                className="relative max-w-[440px] overflow-hidden rounded-[1.35rem]"
                style={{
                  background: P.panel,
                  border: `1px solid ${P.border}`,
                  boxShadow:
                    "0 32px 80px -40px rgba(0,0,0,0.75), inset 0 1px 0 0 rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="flex items-center border-b px-4 py-2.5"
                  style={{
                    borderColor: P.border,
                    background: "rgba(8,12,16,0.65)",
                  }}
                >
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  </div>
                  <div
                    className="mx-auto flex items-center gap-2 rounded-lg px-3 py-1"
                    style={{ background: P.bg, border: `1px solid ${P.border}` }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: P.accent }}
                    />
                    <span className="font-mono text-[10px]" style={{ color: P.ink3 }}>
                      app.e-comex / operación
                    </span>
                  </div>
                </div>
                <div className="flex">
                  <div
                    className="hidden w-11 shrink-0 flex-col items-center gap-3 border-r py-4 sm:flex"
                    style={{ borderColor: P.border }}
                  >
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-5 w-5 rounded-md"
                        style={{
                          background: i === 0 ? P.accentDim : "rgba(17,24,32,0.9)",
                          border: `1px solid ${P.border}`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex flex-1 flex-col gap-4 p-5">
                    <div
                      className="flex items-center gap-3 rounded-xl p-3"
                      style={{
                        background: P.bg,
                        border: `1px solid ${P.border}`,
                      }}
                    >
                      <div
                        className="h-9 w-9 shrink-0 rounded-lg"
                        style={{
                          background: "rgba(17,24,32,1)",
                          border: `1px solid ${P.border}`,
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div
                          className="h-2.5 max-w-[9rem] rounded"
                          style={{ background: "rgba(17,24,32,1)" }}
                        />
                        <div
                          className="mt-1.5 h-2 max-w-[5rem] rounded"
                          style={{ background: "rgba(17,24,32,0.7)" }}
                        />
                      </div>
                      <span
                        className="shrink-0 rounded-md px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide"
                        style={{
                          background: P.accentDim,
                          color: P.accent,
                          border: `1px solid rgba(34,193,200,0.25)`,
                        }}
                      >
                        Listo
                      </span>
                    </div>
                    <div
                      className="flex items-center justify-between rounded-xl px-4 py-2.5"
                      style={{
                        background: P.bg,
                        border: `1px solid ${P.border}`,
                      }}
                    >
                      <span className="text-[10px] uppercase tracking-wider" style={{ color: P.ink3 }}>
                        Posición NCM
                      </span>
                      <span className="font-mono text-[13px] font-semibold tabular-nums" style={{ color: P.ink }}>
                        8703.23.10
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        ["FOB", "USD 2.418"],
                        ["Flete", "USD 672"],
                        ["Aranceles", "USD 1.903"],
                      ].map(([l, v]) => (
                        <div
                          key={l}
                          className="rounded-xl p-2.5"
                          style={{
                            background: P.bg,
                            border: `1px solid ${P.border}`,
                          }}
                        >
                          <p
                            className="text-[7px] font-semibold uppercase tracking-wider"
                            style={{ color: P.ink3 }}
                          >
                            {l}
                          </p>
                          <p
                            className="mt-1 font-mono text-[12px] font-semibold tabular-nums"
                            style={{ color: P.ink }}
                          >
                            {v}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div
                      className="rounded-xl p-3.5"
                      style={{
                        background: P.bg,
                        borderLeft: `2px solid ${P.gold}`,
                        border: `1px solid ${P.border}`,
                        borderLeftWidth: 2,
                        borderLeftColor: P.gold,
                      }}
                    >
                      <p
                        className="text-[7px] font-semibold uppercase tracking-wider"
                        style={{ color: P.ink3 }}
                      >
                        Total estimado puesto
                      </p>
                      <p
                        className="mt-1 text-[17px] font-semibold tabular-nums tracking-tight"
                        style={{ color: P.gold }}
                      >
                        USD 6.837
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PROBLEMA — dividers, no four equal promo cards */}
        <section className="border-t px-5 py-24 lg:px-10" style={{ borderColor: P.border, background: P.bg2 }}>
          <div className="mx-auto max-w-[1400px]">
            <R>
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: P.accent }}
              >
                Fricción habitual
              </p>
              <h2
                className="mt-4 max-w-[34rem] text-[clamp(1.45rem,2.6vw,2.05rem)] font-semibold leading-[1.15] tracking-[-0.028em]"
                style={{ color: P.ink }}
              >
                El cuello de botella no es el puerto: es la información mal ordenada.
              </h2>
            </R>
            <div className="mt-14 divide-y rounded-2xl overflow-hidden" style={{ border: `1px solid ${P.border}` }}>
              {[
                [
                  "Datos en silos",
                  "Correos, planillas y chats que no conversan entre sí.",
                ],
                [
                  "Tareas repetidas",
                  "Misma carga administrativa en cada embarque.",
                ],
                [
                  "Costos opacos",
                  "Difícil saber qué componente mueve el precio final.",
                ],
                [
                  "Poca trazabilidad",
                  "Sin una línea de tiempo clara entre compra y recepción.",
                ],
              ].map(([t, d], i) => (
                <R key={t} d={i * 50}>
                  <div
                    className="grid gap-4 px-5 py-6 sm:grid-cols-[220px_1fr] sm:items-start sm:px-8 sm:py-7"
                    style={{ background: i % 2 === 0 ? "rgba(8,12,16,0.35)" : "transparent" }}
                  >
                    <h3 className="text-[14px] font-semibold" style={{ color: P.ink }}>
                      {t}
                    </h3>
                    <p className="text-[13px] leading-relaxed" style={{ color: P.ink3 }}>
                      {d}
                    </p>
                  </div>
                </R>
              ))}
            </div>
          </div>
        </section>

        {/* SOLUCIÓN + métricas */}
        <section className="px-5 py-24 lg:px-10">
          <div className="mx-auto grid max-w-[1400px] gap-16 lg:grid-cols-2 lg:items-center">
            <R>
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: P.cta }}
              >
                Qué hacemos distinto
              </p>
              <h2
                className="mt-4 text-[clamp(1.45rem,2.6vw,2.05rem)] font-semibold leading-[1.15] tracking-[-0.028em]"
                style={{ color: P.ink }}
              >
                Consultores que trabajan sobre una plataforma hecha para importar a Argentina
              </h2>
              <p className="mt-5 max-w-[52ch] text-[15px] leading-relaxed" style={{ color: P.ink2 }}>
                Modelamos cada operación con el mismo rigor de despacho y dejamos registro en
                sistema: clasificación, requisitos, números y documentos quedan vinculados.
              </p>
            </R>
            <R d={80}>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["+41%", "Menos tiempo en tareas administrativas recurrentes"],
                  ["97,3%", "Operaciones con costo desglosado antes de comprar"],
                  ["2m 48s", "Promedio de primer análisis automático"],
                  ["22", "Especialistas en comercio exterior y sistemas"],
                ].map(([n, l]) => (
                  <div
                    key={l}
                    className="rounded-2xl p-6 transition-transform active:scale-[0.99]"
                    style={{
                      background: P.bg2,
                      border: `1px solid ${P.border}`,
                      boxShadow: `inset 0 1px 0 0 ${P.borderIn}`,
                    }}
                  >
                    <p className="font-mono text-[22px] font-semibold tabular-nums tracking-tight" style={{ color: P.ink }}>
                      {n}
                    </p>
                    <p className="mt-2 text-[11px] leading-snug" style={{ color: P.ink3 }}>
                      {l}
                    </p>
                  </div>
                ))}
              </div>
            </R>
          </div>
        </section>

        {/* SERVICIOS — bento (no 3 equal columns) */}
        <section id="servicios" className="border-t px-5 py-24 lg:px-10" style={{ borderColor: P.border, background: P.bg2 }}>
          <div className="mx-auto max-w-[1400px]">
            <R>
              <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                <div>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-[0.22em]"
                    style={{ color: P.accent }}
                  >
                    Alcance
                  </p>
                  <h2
                    className="mt-3 max-w-[28rem] text-[clamp(1.45rem,2.6vw,2.05rem)] font-semibold leading-[1.15] tracking-[-0.028em]"
                    style={{ color: P.ink }}
                  >
                    Cubrimos la cadena completa de una importación
                  </h2>
                </div>
                <p className="max-w-[20rem] text-[13px] leading-relaxed lg:text-right" style={{ color: P.ink3 }}>
                  Cada bloque se conecta con el siguiente: menos retrabajo y más continuidad entre
                  áreas.
                </p>
              </div>
            </R>

            <div className="mt-12 grid auto-rows-fr gap-3 md:grid-cols-4 md:grid-rows-2">
              {[
                {
                  t: "Clasificación de productos",
                  d: "Viabilidad técnica y posición arancelaria antes de comprometer compra.",
                  span: "md:col-span-2 md:row-span-2",
                  icon: GlobeHemisphereWest,
                },
                {
                  t: "Regulaciones",
                  d: "Intervenciones, permisos y plazos anticipados.",
                  span: "md:col-span-2",
                  icon: FileText,
                },
                {
                  t: "Costos y landed cost",
                  d: "FOB, flete, tributos y gastos locales en un solo cálculo.",
                  span: "md:col-span-1",
                  icon: CurrencyCircleDollar,
                },
                {
                  t: "Logística",
                  d: "Rutas, tiempos y modalidades alineadas al producto.",
                  span: "md:col-span-1",
                  icon: Truck,
                },
                {
                  t: "Documentación",
                  d: "Versiones centralizadas y listas para auditoría.",
                  span: "md:col-span-2",
                  icon: FileText,
                },
                {
                  t: "Acompañamiento",
                  d: "Seguimiento con especialistas en operaciones recurrentes.",
                  span: "md:col-span-2",
                  icon: UsersThree,
                },
              ].map((s, i) => {
                const Ico = s.icon;
                return (
                  <R key={s.t} d={i * 40}>
                    <div
                      className={`group flex h-full min-h-[140px] flex-col rounded-2xl p-6 transition-[transform] active:scale-[0.99] ${s.span}`}
                      style={{
                        background: P.bg,
                        border: `1px solid ${P.border}`,
                        boxShadow: `inset 0 1px 0 0 ${P.borderIn}`,
                      }}
                    >
                      <Ico
                        className="h-5 w-5 shrink-0 opacity-80 transition-opacity group-hover:opacity-100"
                        style={{ color: P.accent }}
                        weight="duotone"
                      />
                      <h3 className="mt-4 text-[14px] font-semibold" style={{ color: P.ink }}>
                        {s.t}
                      </h3>
                      <p className="mt-2 flex-1 text-[13px] leading-relaxed" style={{ color: P.ink3 }}>
                        {s.d}
                      </p>
                    </div>
                  </R>
                );
              })}
            </div>
          </div>
        </section>

        {/* CÓMO — vertical rail, not four equal circles */}
        <section id="como" className="px-5 py-24 lg:px-10">
          <div className="mx-auto max-w-[1400px]">
            <R>
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: P.cta }}
              >
                Cómo trabajamos
              </p>
              <h2
                className="mt-3 max-w-[24rem] text-[clamp(1.45rem,2.6vw,2.05rem)] font-semibold leading-[1.15] tracking-[-0.028em]"
                style={{ color: P.ink }}
              >
                Cuatro etapas, una sola línea de trabajo
              </h2>
            </R>

            <div className="relative mx-auto mt-14 max-w-3xl">
              <div
                className="absolute left-[15px] top-3 bottom-3 w-px md:left-5"
                style={{
                  background: `linear-gradient(180deg, ${P.accent}66, ${P.cta}44, transparent)`,
                }}
              />
              <div className="space-y-10">
                {[
                  {
                    n: "01",
                    t: "Diagnóstico de operación",
                    d: "Relevamos producto, origen, volumen y restricciones específicas.",
                  },
                  {
                    n: "02",
                    t: "Ingesta y análisis",
                    d: "Cruzamos datos normativos y comerciales en la plataforma.",
                  },
                  {
                    n: "03",
                    t: "Modelo en sistema",
                    d: "Estructuramos costos, checklist documental y responsables.",
                  },
                  {
                    n: "04",
                    t: "Ejecución con reporting",
                    d: "Seguimiento con estados y exportación para tu equipo interno.",
                  },
                ].map((s, i) => (
                  <R key={s.n} d={i * 70}>
                    <div className="relative flex gap-6 md:gap-10">
                      <div
                        className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-bold md:h-11 md:w-11"
                        style={{
                          background: P.bg2,
                          border: `2px solid ${i % 2 === 0 ? P.accent : P.cta}`,
                          color: i % 2 === 0 ? P.accent : P.cta,
                          boxShadow: `inset 0 1px 0 0 ${P.borderIn}`,
                        }}
                      >
                        {s.n}
                      </div>
                      <div className="pb-2 pt-0.5">
                        <h3 className="text-[15px] font-semibold" style={{ color: P.ink }}>
                          {s.t}
                        </h3>
                        <p className="mt-2 max-w-[48ch] text-[13px] leading-relaxed" style={{ color: P.ink3 }}>
                          {s.d}
                        </p>
                      </div>
                    </div>
                  </R>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* PLATAFORMA — asymmetric: wide + stack */}
        <section id="plataforma" className="border-t px-5 py-24 lg:px-10" style={{ borderColor: P.border, background: P.bg2 }}>
          <div className="mx-auto max-w-[1400px]">
            <R>
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: P.accent }}
              >
                Plataforma
              </p>
              <h2
                className="mt-3 max-w-[32rem] text-[clamp(1.45rem,2.6vw,2.05rem)] font-semibold leading-[1.15] tracking-[-0.028em]"
                style={{ color: P.ink }}
              >
                Software que refuerza el criterio del equipo, no lo reemplaza
              </h2>
            </R>

            <R d={90}>
              <div className="mt-12 grid gap-3 md:grid-cols-3 md:grid-rows-2">
                <div
                  className="flex min-h-[200px] flex-col justify-end rounded-2xl p-7 md:col-span-2 md:row-span-2"
                  style={{
                    background: P.bg,
                    border: `1px solid ${P.border}`,
                    boxShadow: `inset 0 1px 0 0 ${P.borderIn}`,
                  }}
                >
                  <ChartLineUp className="h-6 w-6" style={{ color: P.accent }} weight="duotone" />
                  <h3 className="mt-6 text-[16px] font-semibold" style={{ color: P.ink }}>
                    Tablero de operaciones
                  </h3>
                  <p className="mt-2 max-w-[42ch] text-[14px] leading-relaxed" style={{ color: P.ink3 }}>
                    Vista consolidada de embarques, alertas y variaciones de costo con filtros por
                    proveedor y familia de producto.
                  </p>
                </div>
                <div
                  className="rounded-2xl p-6"
                  style={{
                    background: P.bg,
                    border: `1px solid ${P.border}`,
                    boxShadow: `inset 0 1px 0 0 ${P.borderIn}`,
                  }}
                >
                  <h3 className="text-[14px] font-semibold" style={{ color: P.ink }}>
                    Motor de análisis
                  </h3>
                  <p className="mt-2 text-[13px] leading-relaxed" style={{ color: P.ink3 }}>
                    Clasificación, normativa y costos en minutos, con trazabilidad de fuentes.
                  </p>
                </div>
                <div
                  className="rounded-2xl p-6"
                  style={{
                    background: P.bg,
                    border: `1px solid ${P.border}`,
                    boxShadow: `inset 0 1px 0 0 ${P.borderIn}`,
                  }}
                >
                  <h3 className="text-[14px] font-semibold" style={{ color: P.ink }}>
                    Reportes exportables
                  </h3>
                  <p className="mt-2 text-[13px] leading-relaxed" style={{ color: P.ink3 }}>
                    PDF listos para compras, finanzas o comité de importaciones.
                  </p>
                </div>
              </div>
            </R>

            <R d={140}>
              <Link
                href="/app/nueva"
                className="mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[14px] font-medium text-white transition-[transform] active:scale-[0.98]"
                style={{
                  background: P.cta,
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.1)",
                }}
              >
                Ingresar al flujo nuevo
                <ArrowRight className="h-4 w-4" weight="bold" />
              </Link>
            </R>
          </div>
        </section>

        {/* ANTES / DESPUÉS */}
        <section className="px-5 py-24 lg:px-10">
          <div className="mx-auto max-w-[880px]">
            <R>
              <h2
                className="text-[clamp(1.45rem,2.6vw,2.05rem)] font-semibold leading-[1.15] tracking-[-0.028em] lg:max-w-[20rem]"
                style={{ color: P.ink }}
              >
                De reacción a planificación
              </h2>
            </R>
            <R d={70}>
              <div
                className="mt-10 grid overflow-hidden rounded-2xl md:grid-cols-2"
                style={{ border: `1px solid ${P.border}` }}
              >
                <div className="p-8 md:p-10" style={{ background: P.bg }}>
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                    style={{ color: P.ink3 }}
                  >
                    Situación típica
                  </p>
                  <ul className="mt-6 space-y-4">
                    {["Documentos duplicados", "Poca previsibilidad de costo", "Gestión a apagafuegos"].map((t) => (
                      <li key={t} className="flex items-start gap-3 text-[14px]" style={{ color: P.ink2 }}>
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400/70" weight="bold" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-8 md:p-10" style={{ background: P.panel }}>
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                    style={{ color: P.accent }}
                  >
                    Con E-COMEX
                  </p>
                  <ul className="mt-6 space-y-4">
                    {["Datos en un solo flujo", "Costos desglosados y comparables", "Alertas antes del problema"].map((t) => (
                      <li key={t} className="flex items-start gap-3 text-[14px]" style={{ color: P.ink }}>
                        <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: P.accent }} weight="bold" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </R>
          </div>
        </section>

        {/* PERFILES — 2+1 grid, not three equal */}
        <section className="border-t px-5 py-24 lg:px-10" style={{ borderColor: P.border, background: P.bg2 }}>
          <div className="mx-auto max-w-[1400px]">
            <R>
              <h2
                className="max-w-[26rem] text-[clamp(1.45rem,2.6vw,2.05rem)] font-semibold leading-[1.15] tracking-[-0.028em]"
                style={{ color: P.ink }}
              >
                Pensado para equipos que viven del comercio internacional
              </h2>
              <p className="mt-4 max-w-[40ch] text-[14px] leading-relaxed" style={{ color: P.ink3 }}>
                Misma plataforma, distintos roles: compras, comex y dirección ven la misma verdad
                operativa.
              </p>
            </R>
            <div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-12">
              <R>
                <div
                  className="flex h-full flex-col rounded-2xl p-8 lg:col-span-5"
                  style={{
                    background: P.bg,
                    border: `1px solid ${P.border}`,
                    boxShadow: `inset 0 1px 0 0 ${P.borderIn}`,
                  }}
                >
                  <h3 className="text-[16px] font-semibold" style={{ color: P.ink }}>
                    Importadores directos
                  </h3>
                  <p className="mt-3 text-[13px] leading-relaxed" style={{ color: P.ink3 }}>
                    Profundizá márgenes con visibilidad de costo por SKU y por proveedor.
                  </p>
                </div>
              </R>
              <R d={50}>
                <div
                  className="flex h-full flex-col rounded-2xl p-8 lg:col-span-4"
                  style={{
                    background: P.bg,
                    border: `1px solid ${P.border}`,
                    boxShadow: `inset 0 1px 0 0 ${P.borderIn}`,
                  }}
                >
                  <h3 className="text-[16px] font-semibold" style={{ color: P.ink }}>
                    Casas comerciales
                  </h3>
                  <p className="mt-3 text-[13px] leading-relaxed" style={{ color: P.ink3 }}>
                    Catálogos heterogéneos con plantillas reutilizables y control de versiones.
                  </p>
                </div>
              </R>
              <R d={100}>
                <div
                  className="flex h-full flex-col rounded-2xl p-8 lg:col-span-3"
                  style={{
                    background: P.bg,
                    border: `1px solid ${P.border}`,
                    boxShadow: `inset 0 1px 0 0 ${P.borderIn}`,
                  }}
                >
                  <h3 className="text-[16px] font-semibold" style={{ color: P.ink }}>
                    Compras corporativas
                  </h3>
                  <p className="mt-3 text-[13px] leading-relaxed" style={{ color: P.ink3 }}>
                    Reportes listos para validar con finanzas y auditoría interna.
                  </p>
                </div>
              </R>
            </div>
          </div>
        </section>

        {/* CTA — left-weighted, not centered slab */}
        <section className="relative overflow-hidden border-t px-5 py-24 lg:px-10" style={{ borderColor: P.border }}>
          <div
            className="pointer-events-none absolute right-0 top-1/2 h-[min(420px,70vw)] w-[min(420px,70vw)] -translate-y-1/2 translate-x-1/4 rounded-full opacity-[0.07]"
            style={{ background: P.cta }}
          />
          <div className="relative mx-auto grid max-w-[1400px] gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <R>
              <h2
                className="text-[clamp(1.55rem,3vw,2.35rem)] font-semibold leading-[1.1] tracking-[-0.03em]"
                style={{ color: P.ink }}
              >
                Pasá de estimaciones a números defendibles
              </h2>
              <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed" style={{ color: P.ink2 }}>
                Agendá una conversación técnica o probá el flujo de nueva operación en la app.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href="#contacto"
                  className="inline-flex items-center justify-center rounded-xl px-7 py-3.5 text-center text-[14px] font-medium text-white active:scale-[0.98]"
                  style={{
                    background: P.cta,
                    border: "1px solid rgba(255,255,255,0.08)",
                    boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.1)",
                  }}
                >
                  Coordinar una llamada
                </a>
                <Link
                  href="/app/nueva"
                  className="inline-flex items-center justify-center rounded-xl px-7 py-3.5 text-center text-[14px] font-medium active:scale-[0.98]"
                  style={{
                    border: `1px solid ${P.border}`,
                    color: P.ink2,
                    boxShadow: `inset 0 1px 0 0 ${P.borderIn}`,
                  }}
                >
                  Abrir nueva operación
                </Link>
              </div>
            </R>
            <div className="hidden lg:block" aria-hidden />
          </div>
        </section>

        {/* CONTACTO — labels above fields */}
        <section id="contacto" className="border-t px-5 py-24 lg:px-10" style={{ borderColor: P.border, background: P.bg2 }}>
          <div className="mx-auto grid max-w-[1400px] gap-14 lg:grid-cols-[1fr_minmax(280px,400px)] lg:gap-20">
            <R>
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: P.cta }}
              >
                Contacto
              </p>
              <h2
                className="mt-3 text-[clamp(1.45rem,2.6vw,2.05rem)] font-semibold leading-[1.15] tracking-[-0.028em]"
                style={{ color: P.ink }}
              >
                Evaluamos tu próxima operación sin compromiso inicial
              </h2>
              <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed" style={{ color: P.ink2 }}>
                Contanos origen, producto y volumen aproximado. Respondemos con próximos pasos
                concretos.
              </p>
              <div className="mt-8 space-y-2 text-[14px]" style={{ color: P.ink3 }}>
                <p>inteligencia@e-comex.com</p>
                <p>Buenos Aires, Argentina</p>
              </div>
            </R>
            <R d={80}>
              <form className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="lc-name" className="text-[12px] font-medium" style={{ color: P.ink3 }}>
                      Nombre
                    </label>
                    <input
                      id="lc-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      className="w-full rounded-xl px-4 py-3 text-[14px] outline-none transition-[border-color] focus:border-[rgba(34,193,200,0.35)]"
                      style={{
                        background: P.bg,
                        border: `1px solid ${P.border}`,
                        color: P.ink,
                        boxShadow: `inset 0 1px 0 0 ${P.borderIn}`,
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="lc-company" className="text-[12px] font-medium" style={{ color: P.ink3 }}>
                      Empresa
                    </label>
                    <input
                      id="lc-company"
                      name="company"
                      type="text"
                      autoComplete="organization"
                      className="w-full rounded-xl px-4 py-3 text-[14px] outline-none transition-[border-color] focus:border-[rgba(34,193,200,0.35)]"
                      style={{
                        background: P.bg,
                        border: `1px solid ${P.border}`,
                        color: P.ink,
                        boxShadow: `inset 0 1px 0 0 ${P.borderIn}`,
                      }}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="lc-email" className="text-[12px] font-medium" style={{ color: P.ink3 }}>
                    Correo electrónico
                  </label>
                  <input
                    id="lc-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    className="w-full rounded-xl px-4 py-3 text-[14px] outline-none transition-[border-color] focus:border-[rgba(34,193,200,0.35)]"
                    style={{
                      background: P.bg,
                      border: `1px solid ${P.border}`,
                      color: P.ink,
                      boxShadow: `inset 0 1px 0 0 ${P.borderIn}`,
                    }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="lc-msg" className="text-[12px] font-medium" style={{ color: P.ink3 }}>
                    Mensaje
                  </label>
                  <textarea
                    id="lc-msg"
                    name="message"
                    rows={4}
                    className="w-full resize-none rounded-xl px-4 py-3 text-[14px] outline-none transition-[border-color] focus:border-[rgba(34,193,200,0.35)]"
                    style={{
                      background: P.bg,
                      border: `1px solid ${P.border}`,
                      color: P.ink,
                      boxShadow: `inset 0 1px 0 0 ${P.borderIn}`,
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="w-full rounded-xl py-3.5 text-[14px] font-medium text-white transition-[transform] active:scale-[0.99]"
                  style={{
                    background: P.cta,
                    border: "1px solid rgba(255,255,255,0.08)",
                    boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.1)",
                  }}
                >
                  Enviar consulta
                </button>
              </form>
            </R>
          </div>
        </section>

        <footer
          className="border-t px-5 py-9 lg:px-10"
          style={{ borderColor: P.border }}
        >
          <div
            className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 text-[12px] sm:flex-row"
            style={{ color: P.ink3 }}
          >
            <span>© 2026 E-COMEX</span>
            <span>Buenos Aires, Argentina</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
