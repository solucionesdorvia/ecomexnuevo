import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export default function LandingContainerGate() {
  return (
    <div className="bg-app relative min-h-screen overflow-x-hidden text-strong">
      <div className="absolute inset-0 -z-10">
        <video
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260217_030345_246c0224-10a4-422c-b324-070b7c0eceda.mp4"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="aurora absolute inset-0 opacity-85" />
      </div>

      <header className="glass-nav sticky top-0 z-50 border-b border-subtle">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color:color-mix(in_oklab,var(--primary)_16%,transparent)] text-[var(--accent)]">
              <Icon name="dataset" size={18} />
            </span>
            <h2 className="text-lg font-extrabold tracking-tight text-strong">E-COMEX</h2>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            {["Plataforma", "Servicios", "Casos", "Recursos"].map((item) => (
              <a key={item} className="text-sm font-semibold text-muted transition-colors hover:text-strong" href="#producto">
                {item}
              </a>
            ))}
          </nav>

          <ButtonLink href="/account" variant="primary" className="px-5">
            Solicitar demo
          </ButtonLink>
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-16 pt-12 sm:px-6 lg:px-10 lg:pt-24">
        <section className="relative flex min-h-[66vh] items-center">
          <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
            <div className="panel-strong max-w-3xl p-6 sm:p-8 lg:p-10">
              <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-subtle bg-[var(--surface)] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
                Plataforma + Validación experta
              </div>
              <h1 className="text-balance text-[clamp(2rem,6vw,4.25rem)] font-black leading-[1.06] tracking-tight text-strong">
                Cotización inteligente para Comercio Exterior
              </h1>
              <p className="mt-5 max-w-2xl text-[clamp(0.96rem,1.9vw,1.15rem)] leading-relaxed text-muted">
                Automatizá clasificación, estimación de costos e impuestos y gestión de cotizaciones en un flujo auditable.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/account" variant="primary" className="px-7">
                  Solicitar demo
                </ButtonLink>
                <a
                  href="#producto"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-subtle bg-[var(--surface)] px-5 text-sm font-semibold text-strong transition-colors hover:bg-[var(--surface2)]"
                >
                  Ver cómo funciona
                </a>
              </div>
            </div>

            <div className="panel hidden p-5 lg:block">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Comex OS</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Flujos de cotización, validación experta y operación en una sola capa auditada.
              </p>
            </div>
          </div>
        </section>

        <section id="producto" className="grid gap-4 py-10 md:grid-cols-3">
          {[
            ["Clasificación asistida", "NCM sugerido con supuestos trazables y señales de riesgo."],
            ["Costeo operativo", "FOB, flete, impuestos y gestión en un rango explicado."],
            ["Cierre experto", "Validación final por operador antes de ejecutar operación."],
          ].map(([title, desc]) => (
            <article key={title} className="panel p-6">
              <h3 className="text-base font-extrabold tracking-tight text-strong">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{desc}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

