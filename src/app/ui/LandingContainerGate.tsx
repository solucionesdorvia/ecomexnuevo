import { BrandLogo } from "@/components/BrandLogo";

export default function LandingContainerGate() {
  const sourceCtas = [
    { label: "Pegar URL del producto", href: "/cotizar?source=url", icon: "link" },
    { label: "Subir imagen del producto", href: "/cotizar?source=image", icon: "add_a_photo" },
    { label: "Subir factura o proforma", href: "/cotizar?source=invoice", icon: "description" },
    { label: "Escribir descripcion libre", href: "/cotizar?source=text", icon: "edit_note" },
  ];

  const automationCards = [
    {
      icon: "search",
      title: "Analisis de producto",
      text: "Identificacion tecnica automatica para acelerar la evaluacion inicial.",
      tone: "primary",
    },
    {
      icon: "list_alt",
      title: "Clasificacion NCM",
      text: "Sugerencia NCM apoyada por la logica actual del motor de clasificacion.",
      tone: "accent",
    },
    {
      icon: "policy",
      title: "Requisitos normativos",
      text: "Validacion de intervenciones y controles para operar con menos riesgo.",
      tone: "primary",
    },
    {
      icon: "monetization_on",
      title: "Estimacion de costos",
      text: "Desglose de costo puesto en Argentina con supuestos transparentes.",
      tone: "accent",
    },
    {
      icon: "insert_chart",
      title: "Reportes y PDF",
      text: "Salida formal para compartir con equipo interno, socios o clientes.",
      tone: "primary",
    },
  ] as const;

  return (
    <div className="bg-app text-strong">
      <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-[color:color-mix(in_oklab,var(--bg)_76%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6">
          <div className="rounded-lg bg-white px-3 py-1.5 shadow-sm shadow-black/20">
            <BrandLogo className="h-6" priority />
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <a className="text-sm font-semibold text-slate-300 transition-colors hover:text-[var(--accent)]" href="#inicio">
              Inicio
            </a>
            <a className="text-sm font-semibold text-slate-300 transition-colors hover:text-[var(--accent)]" href="#problema">
              Problema
            </a>
            <a className="text-sm font-semibold text-slate-300 transition-colors hover:text-[var(--accent)]" href="#demo">
              Demo
            </a>
            <a className="text-sm font-semibold text-slate-300 transition-colors hover:text-[var(--accent)]" href="#plataforma">
              Plataforma
            </a>
            <a className="text-sm font-semibold text-slate-300 transition-colors hover:text-[var(--accent)]" href="#contacto">
              Contacto
            </a>
          </nav>
          <a
            href="/account"
            className="rounded-lg bg-[var(--primary)] px-6 py-2.5 text-sm font-extrabold text-white transition-all hover:brightness-110"
          >
            Ingresar
          </a>
        </div>
      </header>

      <section id="inicio" className="relative flex min-h-screen items-center overflow-hidden pt-20">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,12,25,0.45)_0%,rgba(7,12,25,0.92)_100%)]" />
          <img
            alt="Puerto con contenedores"
            className="h-full w-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1X-ayZ7V8zRr6mFvLpvAAjVC8G_6Ia0f0DLmGod1lCSEvqZtIDP_CzdaYTaoUCY-pc4lEg6WdINysjOEDa2pgFwVZNgBAvYOeEJxiXmPPzgEueauIPbuRIWNO6_xN0mhS0KtCHmX-HlfkVHBYeo9sX4-YnGBJg7U49_i2wqQh9naiBUOTiqZ-7nsZxDMM8C5-1cS6-I7pIUu6KjRGWA_Y0VBp35WQ5OO3alpBbHXVkHancKrFdnfnp5LGxcMNq_KCcQU0et_yq9bq"
          />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[color:color-mix(in_oklab,var(--accent)_26%,transparent)] bg-[color:color-mix(in_oklab,var(--accent)_12%,transparent)] px-3 py-1 text-xs font-black tracking-[0.16em] text-[var(--accent)] uppercase">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-80" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
              </span>
              Plataforma de analisis importador
            </div>

            <h1 className="text-5xl font-black leading-[1.06] tracking-tight text-white md:text-7xl">
              Inteligencia para importar <span className="text-[var(--primary)]">sin improvisar</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300 md:text-xl">
              Analiza productos, clasificacion NCM, requisitos y costos en minutos. E-COMEX unifica criterio tecnico y flujo operativo en una sola experiencia.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="/cotizar"
                className="rounded-lg bg-[var(--primary)] px-8 py-4 font-extrabold text-white transition-all hover:shadow-[0_0_20px_rgba(92,92,255,0.4)]"
              >
                Analizar producto
              </a>
              <a
                href="#demo"
                className="rounded-lg border border-white/15 bg-white/5 px-8 py-4 font-extrabold text-white backdrop-blur-sm transition-all hover:bg-white/10"
              >
                Ver como funciona
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="problema" className="relative py-24">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 md:flex-row">
          <div className="flex-1">
            <h2 className="text-3xl font-black leading-tight text-white md:text-4xl">
              Importar arranca con decisiones tecnicas complejas.
            </h2>
            <p className="mt-6 text-lg text-slate-400">
              La combinacion de normativa, clasificacion y estructura de costos genera incertidumbre operativa. E-COMEX ordena ese proceso y baja el riesgo desde el primer paso.
            </p>
            <div className="mt-8 space-y-6">
              <div className="rounded-xl border border-white/10 border-l-4 border-l-[var(--primary)] bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex gap-4">
                  <span className="material-symbols-outlined text-3xl text-[var(--primary)]">troubleshoot</span>
                  <div>
                    <h3 className="font-bold text-white">Clasificacion NCM con riesgo de error</h3>
                    <p className="text-sm text-slate-400">
                      Una mala partida afecta impuestos, permisos y rentabilidad final de la operacion.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 border-l-4 border-l-[var(--accent)] bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex gap-4">
                  <span className="material-symbols-outlined text-3xl text-[var(--accent)]">gavel</span>
                  <div>
                    <h3 className="font-bold text-white">Normativa e intervenciones cambiantes</h3>
                    <p className="text-sm text-slate-400">
                      Integrar requisitos regulatorios en tiempo real evita bloqueos y retrabajos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full flex-1">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-2">
              <img
                alt="Analisis de datos de comercio exterior"
                className="w-full rounded-xl"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC1LN6UNPZjYZRqn03myQVxZ3iEATG4BPxmBhUhhBW6cjhB2fAWPPfezRlsA9pZgSGm202rJvXVpywjdoZKdsgN_SkzSXmpXm9Ve8NEccKwOa2eOkUX540QYSApXD2y-i7whH0u0e1Iak-9kIdg0yV_KEAE0x3RSLLaLIz81Owk6Z2ddpoMJ-LLONKtZsGBqMrAvYzJkRjBOrGT2BCbkLRJwSHixBMfy20ruhlz83zjm_SFI4BPqGadgXdjVxAtY29LtWz-D7yhH3KT"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="demo" className="bg-primary/5 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-black text-white">Proba el flujo de analisis</h2>
          <p className="mt-3 text-slate-400">Elegi una fuente de entrada y empeza a cotizar con estructura real.</p>
          <div className="mt-12 rounded-2xl border border-[color:color-mix(in_oklab,var(--primary)_24%,transparent)] bg-white/5 p-8 text-left shadow-2xl">
            <div className="mb-6">
              <div className="mb-2 text-sm font-semibold text-slate-300">Entrada del producto</div>
              <textarea
                className="min-h-[120px] w-full rounded-lg border border-white/10 bg-[color:color-mix(in_oklab,var(--bg)_70%,transparent)] p-4 text-white placeholder:text-slate-500 focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
                placeholder="Pega un link, describe el producto o agrega detalles tecnicos..."
                readOnly
              />
            </div>

            <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-2">
              {sourceCtas.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-lg border-2 border-dashed border-white/10 px-4 py-4 text-slate-400 transition-colors hover:border-[var(--primary)]/50 hover:text-white"
                >
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  <span className="text-xs font-semibold uppercase tracking-wide">{item.label}</span>
                </a>
              ))}
            </div>

            <a
              href="/cotizar"
              className="inline-flex w-full items-center justify-center gap-3 rounded-lg bg-[var(--primary)] py-4 text-center font-extrabold text-white transition-all hover:brightness-110"
            >
              <span className="material-symbols-outlined">analytics</span>
              Iniciar analisis
            </a>
          </div>
        </div>
      </section>

      <section id="plataforma" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-black text-white md:text-4xl">E-COMEX automatiza el analisis importador</h2>
            <p className="mt-3 text-slate-400">Misma logica de negocio, presentada en un flujo claro y accionable.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-5">
            {automationCards.map((card) => (
              <div
                key={card.title}
                className="rounded-xl border border-white/10 bg-white/5 p-6 transition-transform duration-300 hover:-translate-y-1"
              >
                <div
                  className={[
                    "mb-6 flex h-12 w-12 items-center justify-center rounded-lg",
                    card.tone === "accent"
                      ? "bg-[color:color-mix(in_oklab,var(--accent)_20%,transparent)] text-[var(--accent)]"
                      : "bg-[color:color-mix(in_oklab,var(--primary)_22%,transparent)] text-[var(--primary)]",
                  ].join(" ")}
                >
                  <span className="material-symbols-outlined">{card.icon}</span>
                </div>
                <h3 className="mb-2 font-bold text-white">{card.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/5 bg-primary/5 py-24">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 md:flex-row">
          <div className="order-2 grid flex-1 grid-cols-2 gap-4 md:order-1">
            <div className="flex aspect-square flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
              <span className="mb-2 text-4xl font-black text-[var(--accent)]">20+</span>
              <span className="text-sm text-slate-400">Anios de experiencia</span>
            </div>
            <div className="flex aspect-square flex-col items-center justify-center rounded-2xl bg-[var(--primary)] p-6 text-center">
              <span className="mb-2 text-4xl font-black text-white">10k+</span>
              <span className="text-sm text-white/80">Operaciones analizadas</span>
            </div>
            <div className="flex aspect-square flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
              <span className="mb-2 text-4xl font-black text-white">99%</span>
              <span className="text-sm text-slate-400">Cumplimiento normativo</span>
            </div>
            <div className="flex aspect-square flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
              <span className="mb-2 text-4xl font-black text-white">50+</span>
              <span className="text-sm text-slate-400">Mercados cubiertos</span>
            </div>
          </div>
          <div className="order-1 flex-1 md:order-2">
            <h2 className="text-3xl font-black text-white">Experiencia real en comercio exterior, ahora digitalizada.</h2>
            <p className="mt-6 text-lg text-slate-400">
              El conocimiento operativo del equipo E-COMEX esta integrado en la plataforma para que planifiques mejor y tomes decisiones con evidencia.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                "Clasificacion arancelaria con criterio tecnico",
                "Planeamiento logistico con tiempos estimados",
                "Control de cumplimiento de punta a punta",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-slate-200">
                  <span className="material-symbols-outlined text-[var(--primary)]">check_circle</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-black text-white">Vista previa de la plataforma</h2>
            <p className="mt-3 text-slate-400">Modulos visuales para analisis, costos y clasificacion en una sola pantalla.</p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                title: "Interfaz de analisis",
                src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDS_y5rBqujwFF5ofx3JtU1wp1ZJsm0AKvDgMAvVVz-pXpyBE6m5ou_P-xGaHEqpsqKubvdJ2Pt2mxNEhqThW7vU8I8k6myrAXoZWv64GW8mA1xJ77HLK7cOuiunTCf2kTi2ta90zLVNSEqIGf_77qw-nK3rVi1iyqMPqfXV-rqfmP8sanz-Z9dSNq6xc0Im10r2a3Sl_nOro1fALRQK4wX9LTvdIkcBiQOlT6R5GaScHOyznPHvFVhYDK-fbStsT0sJowiSa3Dtnox",
              },
              {
                title: "Desglose de costos",
                src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDAraLmHABrTNsb1JrYaauWPJUT1Ui86llbD7_zE568-lhifCyEOC_0TbdhpdQ6MRbJ-7HQNCAJbnE1y70sp8-j1kbfbE4LY8MYg1MxjrbAxHSNfMviq8kBmobrNRj-Cf7Gu1iTwUlGgdx43FBaOyK_BBQDIc0C9HpjkPj8Cuu_jiKL6ONa16aV5wnha9KPRokt_os92no2N9KipuzEseu-Hfw0hTQyJzqFKFMKeF-lNr0at76-T9duoUCJCKiZ5o0DXjXYv0B_fGWJ",
              },
              {
                title: "Clasificacion NCM",
                src: "https://lh3.googleusercontent.com/aida-public/AB6AXuASUpbjm2lyIeZAmP2hKgNx0jCIAH3393PiWO1awWRKKjVKHSDGn41-MHlhxbbE09ati3c-bpfx8lbnGK8tqhctM9_NDUgXtle4FZC3Jhe9n24dTk4V5_byKc-2XlwajaW-1VxBzpRk7uZ4VTOPalzLAEX7ebYAFkjRPmuj-qx0BH538auFnXQCK3UEey-tXXXju-IOUfUqfpolpubyzobnjM-zcRTW8_KWPYxCDUARKzp_ILBxzWZIf1KMp8SuYH-wECL2zGpP4ni9",
              },
            ].map((preview) => (
              <div key={preview.title} className="group">
                <div className="mb-4 overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-colors group-hover:border-[var(--primary)]/40">
                  <img className="h-48 w-full object-cover opacity-85 transition-opacity group-hover:opacity-100" alt={preview.title} src={preview.src} />
                </div>
                <h3 className="text-center font-bold text-white">{preview.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contacto" className="relative overflow-hidden py-24">
        <div className="absolute inset-0 z-0 bg-primary/20" />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-[var(--accent)]/10 blur-[100px]" />
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-4xl font-black text-white">Empeza a analizar tus importaciones hoy</h2>
          <p className="mt-6 text-xl text-slate-300">
            Deja de estimar a ciegas. Trabaja con criterios tecnicos, costos claros y trazabilidad operativa.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a
              href="/cotizar"
              className="rounded-lg bg-[var(--primary)] px-10 py-4 font-extrabold text-white transition-all hover:shadow-[0_0_30px_rgba(92,92,255,0.6)]"
            >
              Probar plataforma
            </a>
            <a
              href="/account"
              className="rounded-lg border border-white/15 bg-white/5 px-10 py-4 font-extrabold text-white backdrop-blur-sm transition-all hover:bg-white/10"
            >
              Hablar con un asesor
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 bg-[var(--bg)] py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-4">
            <div>
              <div className="mb-6 w-fit rounded-lg bg-white px-3 py-1.5 shadow-sm">
                <BrandLogo className="h-6" />
              </div>
              <p className="text-sm leading-relaxed text-slate-500">
                Plataforma para analisis importador con automatizacion, criterio tecnico y foco en cumplimiento.
              </p>
            </div>
            <div>
              <h3 className="mb-6 font-bold text-white">Plataforma</h3>
              <ul className="space-y-4 text-sm text-slate-500">
                <li>
                  <a className="transition-colors hover:text-[var(--primary)]" href="#demo">
                    Como funciona
                  </a>
                </li>
                <li>
                  <a className="transition-colors hover:text-[var(--primary)]" href="/cotizar">
                    Cotizar
                  </a>
                </li>
                <li>
                  <a className="transition-colors hover:text-[var(--primary)]" href="/cotizaciones">
                    Reportes
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-6 font-bold text-white">Servicios</h3>
              <ul className="space-y-4 text-sm text-slate-500">
                <li>Clasificacion arancelaria</li>
                <li>Estrategia logistica</li>
                <li>Auditoria de cumplimiento</li>
              </ul>
            </div>
            <div>
              <h3 className="mb-6 font-bold text-white">Contacto</h3>
              <ul className="space-y-4 text-sm text-slate-500">
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[var(--primary)] text-lg">mail</span>
                  operador@ecomex.local
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[var(--primary)] text-lg">support_agent</span>
                  Soporte de plataforma
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-xs text-slate-600 md:flex-row">
            <p>? 2026 E-COMEX Platform. Todos los derechos reservados.</p>
            <div className="flex gap-6">
              <a className="transition-colors hover:text-white" href="#contacto">
                Privacidad
              </a>
              <a className="transition-colors hover:text-white" href="#contacto">
                Terminos
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

