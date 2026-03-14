import ContainerVideo from "@/components/ContainerVideo";
import { BrandLogo } from "@/components/BrandLogo";

export default function LandingContainerGate() {
  return (
    <div className="bg-app text-strong">
      <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-[color:color-mix(in_oklab,var(--bg)_76%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6">
          <div className="rounded-lg bg-white px-3 py-1.5 shadow-sm shadow-black/20">
            <BrandLogo className="h-6" priority />
          </div>
          <nav className="hidden items-center gap-7 md:flex">
            <a className="text-sm font-semibold text-slate-300 transition-colors hover:text-[var(--accent)]" href="#hero">
              Inicio
            </a>
            <a className="text-sm font-semibold text-slate-300 transition-colors hover:text-[var(--accent)]" href="#que-es">
              Que es
            </a>
            <a className="text-sm font-semibold text-slate-300 transition-colors hover:text-[var(--accent)]" href="#como-funciona">
              Como funciona
            </a>
            <a className="text-sm font-semibold text-slate-300 transition-colors hover:text-[var(--accent)]" href="#servicios">
              Servicios
            </a>
            <a className="text-sm font-semibold text-slate-300 transition-colors hover:text-[var(--accent)]" href="#contacto">
              Contacto
            </a>
          </nav>
          <a
            href="#contacto"
            className="rounded-lg bg-[var(--primary)] px-6 py-2.5 text-sm font-extrabold text-white transition-all hover:brightness-110"
          >
            Hablar con un especialista
          </a>
        </div>
      </header>

      <section id="hero" className="relative flex min-h-screen items-center overflow-hidden pt-20">
        <div className="absolute inset-0 z-0">
          <ContainerVideo
            overlayClassName="bg-[linear-gradient(180deg,rgba(7,12,25,0.4)_0%,rgba(7,12,25,0.92)_100%)]"
            showMissingNotice
          />
        </div>
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-black leading-[1.06] tracking-tight text-white md:text-7xl">
              Experiencia real en comercio exterior, potenciada con tecnologia.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300 md:text-xl">
              Acompanamos a importadores y empresas con servicios profesionales para clasificar productos, validar requisitos regulatorios y estructurar costos de importacion.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
              E-COMEX combina experiencia operativa en mercado exterior con herramientas digitales para tomar mejores decisiones antes de cerrar una compra.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="#servicios"
                className="rounded-lg bg-[var(--primary)] px-8 py-4 font-extrabold text-white transition-all hover:shadow-[0_0_20px_rgba(92,92,255,0.4)]"
              >
                Conocer servicios
              </a>
              <a
                href="#que-es"
                className="rounded-lg border border-white/15 bg-white/5 px-8 py-4 font-extrabold text-white backdrop-blur-sm transition-all hover:bg-white/10"
              >
                Conocer E-COMEX
              </a>
            </div>
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="mb-2 text-xs font-black uppercase tracking-[0.15em] text-slate-300">
                Plataforma (adicional opcional)
              </div>
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  readOnly
                  value="Pega un link de producto o subi una imagen para comenzar el analisis."
                  className="h-11 flex-1 rounded-lg border border-white/10 bg-[color:color-mix(in_oklab,var(--bg)_72%,transparent)] px-3 text-sm text-slate-200"
                />
                <div className="flex gap-2">
                  <a className="rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-200" href="#contacto">
                    URL
                  </a>
                  <a className="rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-200" href="#contacto">
                    Imagen
                  </a>
                  <a className="rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-200" href="#contacto">
                    Factura / Proforma
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="que-es" className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-black text-white md:text-4xl">Que es E-COMEX</h2>
          <div className="mt-8 space-y-5 text-lg leading-relaxed text-slate-300">
            <p>
              E-COMEX es un equipo especializado en comercio exterior que combina experiencia profesional con herramientas tecnologicas para analizar productos antes de importarlos.
            </p>
            <p>
              Brindamos servicios de clasificacion arancelaria, analisis regulatorio y estimacion de costos para evaluar operaciones de importacion de forma rapida y estructurada.
            </p>
            <p>
              La plataforma nace como un complemento de nuestra experiencia en comercio internacional para ayudar a empresas, importadores y operadores a tomar decisiones mas informadas.
            </p>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="bg-primary/5 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-black text-white md:text-4xl">Como funciona</h2>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            {[
              {
                title: "1. Cargas un producto",
                text: "Podes iniciar el analisis de distintas maneras:",
                details: [
                  "pegando un link de producto",
                  "subiendo una imagen",
                  "cargando una factura o proforma",
                  "describiendo el producto manualmente",
                ],
                icon: "upload_file",
              },
              {
                title: "2. El sistema analiza el producto",
                text: "E-COMEX procesa la informacion disponible y extrae datos relevantes como:",
                details: [
                  "titulo del producto",
                  "descripcion tecnica",
                  "imagenes",
                  "precio estimado",
                  "proveedor o fuente",
                ],
                note: "Esta informacion se organiza para iniciar el analisis de importacion.",
                icon: "search",
              },
              {
                title: "3. Clasificacion arancelaria",
                text: "La plataforma sugiere una posicion arancelaria (NCM) en base a la descripcion del producto y diferentes fuentes de informacion.",
                note: "Ademas identifica posibles requisitos regulatorios, organismos involucrados y normativas aplicables.",
                icon: "rule",
              },
              {
                title: "4. Cotizacion estimada",
                text: "El sistema genera una estimacion del costo de importacion considerando:",
                details: [
                  "impuestos",
                  "logistica internacional",
                  "costos operativos",
                  "tiempos estimados de operacion",
                ],
                note: "Esto permite evaluar la viabilidad de la operacion antes de realizar la compra.",
                icon: "calculate",
              },
            ].map((step) => (
              <div key={step.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[color:color-mix(in_oklab,var(--primary)_22%,transparent)] text-[var(--primary)]">
                  <span className="material-symbols-outlined">{step.icon}</span>
                </div>
                <h3 className="text-xl font-extrabold text-white">{step.title}</h3>
                <p className="mt-3 text-slate-400">{step.text}</p>
                {"details" in step && Array.isArray(step.details) ? (
                  <ul className="mt-3 space-y-1 text-sm text-slate-300">
                    {step.details.map((d) => (
                      <li key={d}>- {d}</li>
                    ))}
                  </ul>
                ) : null}
                {"note" in step && step.note ? <p className="mt-3 text-sm text-slate-300">{step.note}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="plataforma" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-black text-white md:text-4xl">Plataforma de cotizacion instantanea</h2>
          <p className="mx-auto mt-4 max-w-4xl text-center text-lg text-slate-300">
            Nuestra plataforma es un adicional para acelerar el analisis tecnico de productos.
          </p>
          <p className="mt-3 text-center text-slate-400">
            Podes probarla para obtener una primera cotizacion estimada y luego avanzar con acompanamiento profesional de nuestro equipo.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
            {[
              ["Cotizacion instantanea", "Carga un link, imagen o documento y obtene una estimacion inicial del producto.", "search"],
              ["Pre-clasificacion NCM", "Recibi una sugerencia de posicion arancelaria para acelerar la evaluacion.", "list_alt"],
              ["Alertas regulatorias", "Visualiza requisitos y organismos que podrian aplicar a la importacion.", "policy"],
              ["Estimacion de costos", "Obtene una primera aproximacion de impuestos, logistica y costos asociados.", "monetization_on"],
              ["Reporte para revision", "Genera un resumen para revisarlo con un especialista de E-COMEX.", "insert_chart"],
            ].map(([title, text, icon]) => (
              <div key={title} className="rounded-xl border border-white/10 bg-white/5 p-5">
                <span className="material-symbols-outlined text-[var(--accent)]">{icon}</span>
                <h3 className="mt-3 font-extrabold text-white">{title}</h3>
                <p className="mt-2 text-sm text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="bg-primary/5 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-black text-white md:text-4xl">Demo del sistema</h2>
          <p className="mt-3 text-center text-slate-400">
            La plataforma E-COMEX permite visualizar cada operacion de forma estructurada.
          </p>
          <p className="mt-2 text-center text-slate-400">
            El sistema integra distintos modulos de analisis para evaluar un producto antes de importar.
          </p>
          <p className="mt-6 text-center text-sm font-black uppercase tracking-[0.12em] text-slate-300">
            Modulos principales
          </p>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
            {[
              "Analisis de producto",
              "Clasificacion NCM",
              "Desglose de costos",
              "Panel operador",
              "Reporte PDF",
            ].map((title) => (
              <div key={title} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="mb-3 h-32 rounded-lg bg-[linear-gradient(140deg,color-mix(in_oklab,var(--primary)_28%,transparent),color-mix(in_oklab,var(--accent)_28%,transparent))]" />
                <h3 className="text-center text-sm font-extrabold text-white">{title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="panel-operador" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl font-black text-white md:text-4xl">Panel operador</h2>
          <p className="mt-4 text-lg text-slate-400">
            E-COMEX tambien incorpora herramientas pensadas para operadores y consultores de comercio exterior.
          </p>
          <p className="mt-2 text-lg text-slate-400">
            El panel operador permite generar presupuestos de importacion de forma automatizada y estructurada.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              "Carga de Excel con estructuras de costos",
              "Carga de fotos o facturas",
              "Generacion automatica de presupuestos",
              "Ajustes manuales",
              "Exportacion de reportes en PDF",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                <span className="material-symbols-outlined text-[var(--primary)]">check_circle</span>
                <span className="text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="servicios" className="bg-primary/5 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl font-black text-white md:text-4xl">Servicios E-COMEX</h2>
          <p className="mt-4 text-lg text-slate-400">
            E-COMEX cuenta con un equipo de especialistas que asesora operaciones de comercio exterior de punta a punta.
          </p>
          <p className="mt-6 text-sm font-black uppercase tracking-[0.12em] text-slate-300">Nuestros servicios incluyen:</p>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              "Clasificacion arancelaria",
              "Logistica internacional inteligente",
              "Desarrollo de proveedores y productos",
              "Consultoria en comercio exterior",
              "Analisis de costos de importacion y exportacion",
            ].map((service) => (
              <div key={service} className="rounded-xl border border-white/10 bg-white/5 p-4 text-slate-200">
                {service}
              </div>
            ))}
          </div>
          <p className="mt-8 text-slate-400">
            La combinacion de experiencia profesional y herramientas tecnologicas permite optimizar cada operacion y reducir riesgos antes de importar.
          </p>
        </div>
      </section>

      <section id="diferencial" className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-black text-white md:text-4xl">Diferencial</h2>
          <div className="mt-10 overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-2 bg-white/5 text-sm font-black uppercase tracking-[0.12em] text-slate-300">
              <div className="border-r border-white/10 p-4 text-center">Metodo tradicional</div>
              <div className="p-4 text-center">E-COMEX</div>
            </div>
            {[
              ["Consultas manuales", "Analisis automatizado"],
              ["Dias de analisis", "Minutos"],
              ["Estimaciones informales", "Reportes estructurados"],
            ].map(([left, right]) => (
              <div key={left} className="grid grid-cols-2 border-t border-white/10 bg-[color:color-mix(in_oklab,var(--bg)_72%,transparent)]">
                <div className="border-r border-white/10 p-4 text-slate-400">{left}</div>
                <div className="p-4 font-semibold text-slate-100">{right}</div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-slate-400">
            E-COMEX permite analizar operaciones con mayor velocidad, estructura y claridad.
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 z-0 bg-primary/20" />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-[var(--accent)]/10 blur-[100px]" />
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-4xl font-black text-white">Experiencia profesional + plataforma cuando la necesites.</h2>
          <p className="mt-6 text-xl text-slate-300">
            Nuestro equipo te acompana en cada etapa y, si queres, podes probar nuestra cotizacion instantanea como primer paso.
          </p>
          <a
            href="#plataforma"
            className="mt-10 inline-flex rounded-lg bg-[var(--primary)] px-10 py-4 font-extrabold text-white transition-all hover:shadow-[0_0_30px_rgba(92,92,255,0.6)]"
          >
            Proba la cotizacion instantanea
          </a>
        </div>
      </section>

      <section id="contacto" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl font-black text-white md:text-4xl">Contacto</h2>
          <p className="mt-4 text-lg text-slate-400">Queres conocer mas sobre E-COMEX o evaluar una operacion?</p>
          <p className="mt-1 text-slate-400">Dejanos tus datos y nos pondremos en contacto.</p>
          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <form className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="grid gap-4">
                <label className="grid gap-1 text-sm text-slate-300">
                  Nombre
                  <input className="h-11 rounded-lg border border-white/10 bg-[var(--surface)] px-3 text-sm text-white" />
                </label>
                <label className="grid gap-1 text-sm text-slate-300">
                  Empresa
                  <input className="h-11 rounded-lg border border-white/10 bg-[var(--surface)] px-3 text-sm text-white" />
                </label>
                <label className="grid gap-1 text-sm text-slate-300">
                  Email
                  <input type="email" className="h-11 rounded-lg border border-white/10 bg-[var(--surface)] px-3 text-sm text-white" />
                </label>
                <label className="grid gap-1 text-sm text-slate-300">
                  Consulta
                  <textarea className="min-h-[120px] rounded-lg border border-white/10 bg-[var(--surface)] p-3 text-sm text-white" />
                </label>
                <button type="button" className="rounded-lg bg-[var(--primary)] py-3 font-bold text-white">
                  Enviar consulta
                </button>
              </div>
            </form>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-xl font-extrabold text-white">Datos de contacto</h3>
              <div className="mt-6 space-y-4 text-slate-300">
                <p className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[var(--primary)]">location_on</span>
                  Av. Comercio Exterior 123
                </p>
                <p className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[var(--primary)]">location_city</span>
                  Buenos Aires, Argentina
                </p>
                <p className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[var(--primary)]">call</span>
                  +54 11 5555-0000
                </p>
                <p className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[var(--primary)]">mail</span>
                  inteligencia@e-comex.com
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 bg-[var(--bg)] py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 grid grid-cols-1 gap-10 md:grid-cols-6">
            <div className="md:col-span-2">
              <div className="mb-6 w-fit rounded-lg bg-white px-3 py-1.5 shadow-sm">
                <BrandLogo className="h-6" />
              </div>
              <p className="text-sm leading-relaxed text-slate-500">
                E-COMEX combina tecnologia y experiencia profesional para mejorar la toma de decisiones en operaciones de comercio exterior.
              </p>
            </div>
            <div>
              <h3 className="mb-4 font-bold text-white">Nosotros</h3>
              <a className="block py-1 text-sm text-slate-500 hover:text-white" href="#que-es">
                Que es E-COMEX
              </a>
              <a className="block py-1 text-sm text-slate-500 hover:text-white" href="#diferencial">
                Diferencial
              </a>
            </div>
            <div>
              <h3 className="mb-4 font-bold text-white">Servicios</h3>
              <a className="block py-1 text-sm text-slate-500 hover:text-white" href="#servicios">
                Consultoria
              </a>
              <a className="block py-1 text-sm text-slate-500 hover:text-white" href="#panel-operador">
                Panel operador
              </a>
            </div>
            <div>
              <h3 className="mb-4 font-bold text-white">Plataforma</h3>
              <a className="block py-1 text-sm text-slate-500 hover:text-white" href="#plataforma">
                Modulos
              </a>
              <a className="block py-1 text-sm text-slate-500 hover:text-white" href="#demo">
                Demo
              </a>
              <a className="block py-1 text-sm text-slate-500 hover:text-white" href="#contacto">
                Contacto
              </a>
            </div>
            <div>
              <h3 className="mb-4 font-bold text-white">Contacto</h3>
              <a className="block py-1 text-sm text-slate-500 hover:text-white" href="#contacto">
                Formulario
              </a>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-xs text-slate-600 md:flex-row">
            <p>? 2026 E-COMEX. Todos los derechos reservados.</p>
            <div className="flex gap-6">
              <a className="transition-colors hover:text-white" href="#contacto">
                Instagram
              </a>
              <a className="transition-colors hover:text-white" href="#contacto">
                LinkedIn
              </a>
              <a className="transition-colors hover:text-white" href="#contacto">
                X
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

