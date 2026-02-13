"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ContainerVideo from "@/components/ContainerVideo";
import { ButtonLink } from "@/components/ui/Button";

type Phase = "closed" | "opening" | "open";

function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

export default function LandingContainerGate() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [phase, setPhase] = useState<Phase>("closed");

  const isClosed = phase === "closed";
  const isOpening = phase === "opening";
  const isOpen = phase === "open";

  const headline = useMemo(
    () => "Abrimos el costo real de importar a Argentina.",
    []
  );

  useEffect(() => {
    // Ensure first impression is “not looping”.
    const v = videoRef.current;
    if (!v) return;
    try {
      v.pause();
      v.currentTime = 0;
    } catch {
      // ignore
    }
  }, []);

  async function openContainer() {
    const v = videoRef.current;
    setPhase("opening");
    if (!v) {
      setPhase("open");
      return;
    }
    try {
      v.currentTime = 0;
      // muted => should be allowed
      await v.play();
    } catch {
      // Fallback: still reveal content
      setPhase("open");
    }
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background text-white">
      {/* Full-viewport container video */}
      <div className="fixed inset-0 z-0">
        {/* When the container is opened, we switch to the app texture background (not the last video frame). */}
        {/* While closed/opening, keep a neutral dark backing so the app texture doesn't show "before" the container. */}
        <div className={classNames("absolute inset-0", isOpen ? "app-background" : "bg-black")} />

        <ContainerVideo
          videoRef={videoRef}
          autoPlay={false}
          loop={false}
          muted
          preload="auto"
          className={classNames("opacity-100", isOpen && "hidden")}
          overlayClassName={classNames(
            // Keep the container clearly visible on first load.
            // We only need a very subtle overlay while it's closed/opening.
            isOpen ? "opacity-0" : "bg-black/10"
          )}
          showMissingNotice
          onEnded={() => {
            // Freeze on last frame and reveal content.
            setPhase("open");
          }}
        />
        <div className="pointer-events-none absolute left-0 top-0 h-full w-1 bg-primary/40 glow-line" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1 bg-primary/40 glow-line" />
      </div>

      {/* Closed state: only welcome + open action */}
      {isClosed || isOpening ? (
        <button
          type="button"
          aria-label="Abrir container"
          disabled={isOpening}
          onClick={() => void openContainer()}
          onKeyDown={(e) => {
            if (isOpening) return;
            if (e.key === "Enter" || e.key === " ") void openContainer();
          }}
          className="absolute inset-0 z-10 cursor-pointer bg-transparent outline-none"
        />
      ) : null}

      {/* Open state: everything “inside the container” */}
      {isOpen ? (
        <div className="relative z-10 flex h-full w-full flex-col">
          <header className="glass-nav sticky top-0 z-20 px-6 py-4">
            <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined text-white">
                    rocket_launch
                  </span>
                </div>
                <div className="text-xl font-bold tracking-tight">
                  E‑COMEX <span className="font-black text-primary">IA</span>
                </div>
                <nav className="hidden items-center gap-6 md:flex">
                  <a
                    className="text-sm font-medium text-muted transition-colors hover:text-white"
                    href="#como-funciona"
                  >
                    Cómo funciona
                  </a>
                  <a
                    className="text-sm font-medium text-muted transition-colors hover:text-white"
                    href="#por-que"
                  >
                    Por qué E‑Comex
                  </a>
                  <Link
                    className="text-sm font-medium text-muted transition-colors hover:text-white"
                    href="/account"
                  >
                    Tablero
                  </Link>
                </nav>
              </div>

              <div className="flex items-center gap-3">
                <ButtonLink href="/chat" variant="primary">
                  Cotizá ahora
                </ButtonLink>
              </div>
            </div>
          </header>

          <main className="no-scrollbar flex-1 overflow-y-auto px-6 py-10">
            <div className="mx-auto w-full max-w-[1200px] space-y-10">
              <section className="glass-panel rounded-xl p-6 shadow-2xl">
                <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
                  <div className="max-w-2xl">
                    <h2 className="mt-4 text-balance text-4xl font-black tracking-tight md:text-5xl">
                      {headline}
                    </h2>
                    <p className="mt-3 text-pretty text-base leading-7 text-muted md:text-lg">
                      Pegás un link o describís un producto. El chat te devuelve
                      una estimación completa con explicación y tiempos. Para
                      decidir con seguridad, el paso final es validarlo con un
                      especialista (consultoría paga).
                    </p>
                  </div>

                  <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
                    <ButtonLink href="/chat" variant="primary" className="h-12 px-6">
                      <span className="material-symbols-outlined text-[18px]">
                        smart_toy
                      </span>
                      Cotizá ahora
                    </ButtonLink>
                    <ButtonLink
                      href="/chat?mode=budget"
                      variant="secondary"
                      className="h-12 px-6"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        tune
                      </span>
                      Importar con presupuesto
                    </ButtonLink>
                    <ButtonLink
                      href="/tendencias"
                      variant="secondary"
                      className="h-12 px-6"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        trending_up
                      </span>
                      Ver señales
                    </ButtonLink>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {[
                    {
                      title: "Cotización dentro del chat",
                      desc: "Tarjetas estructuradas: producto, flete, impuestos AR, gestión, total y tiempos.",
                      icon: "calculate",
                    },
                    {
                      title: "Explicación inteligente",
                      desc: "Entendés por qué pagás cada costo y qué variables pesan más en el total.",
                      icon: "psychology",
                    },
                    {
                      title: "Contacto solo al final",
                      desc: "La consultoría paga es el paso final: validación profesional antes de decidir.",
                      icon: "verified_user",
                    },
                  ].map((x) => (
                    <div
                      key={x.title}
                      className="rounded-xl border border-white/10 bg-white/5 p-5"
                    >
                      <div className="flex items-center gap-2 text-primary">
                        <span className="material-symbols-outlined">{x.icon}</span>
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted">
                          E‑COMEX IA
                        </div>
                      </div>
                      <div className="mt-3 text-lg font-bold tracking-tight text-white">
                        {x.title}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-muted">
                        {x.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section id="como-funciona" className="grid gap-6 md:grid-cols-3">
                {[
                  {
                    k: "1",
                    title: "Pegás link o describís el producto",
                    desc: "Alibaba, 1688 u otro proveedor. También podés venir con un presupuesto objetivo.",
                  },
                  {
                    k: "2",
                    title: "Scraper autenticado + normalización",
                    desc: "Leemos la data real del producto (cuando está disponible) y la dejamos lista para cálculo y clasificación.",
                  },
                  {
                    k: "3",
                    title: "Estimación + explicación + validación profesional",
                    desc: "Tarjetas con cada costo, total y tiempos. Luego, validación con especialista para evitar errores costosos.",
                  },
                ].map((s) => (
                  <div key={s.k} className="glass-panel rounded-xl p-6">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted">
                      Paso {s.k}
                    </div>
                    <div className="mt-2 text-lg font-bold tracking-tight">
                      {s.title}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-muted">{s.desc}</div>
                  </div>
                ))}
              </section>

              <section id="por-que" className="glass-panel rounded-xl p-8">
                <div className="text-sm font-bold tracking-tight text-white">
                  No es una landing con formulario. Es un producto.
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">
                  E‑Comex está pensado como plataforma SaaS: chat con estados, scraper
                  autenticado con manejo de sesión, componentes reutilizables y backend
                  listo para integrar APIs/partners. El objetivo es que el usuario
                  entienda el costo real y decida con validación profesional.
                </p>
              </section>

              <footer className="pb-6 text-xs text-muted">
                © {new Date().getFullYear()} E‑COMEX. Revolucionando el Comercio Global.
              </footer>
            </div>
          </main>
        </div>
      ) : null}
    </div>
  );
}

