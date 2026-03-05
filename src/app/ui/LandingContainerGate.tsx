import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export default function LandingContainerGate() {
  return (
    <div className="bg-app relative min-h-screen overflow-x-hidden text-strong">
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('/container-poster.svg')",
        }}
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(160deg,rgba(4,8,20,0.76)_0%,rgba(4,8,20,0.9)_38%,rgba(4,8,20,0.96)_100%)]" />
      <div className="aurora absolute inset-0 -z-10 opacity-80" />
      <div className="grid-overlay absolute inset-0 -z-10 opacity-30" />

      <header className="sticky top-0 z-50 border-b border-subtle bg-[color:color-mix(in_oklab,var(--bg)_72%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:color-mix(in_oklab,var(--primary)_16%,transparent)] text-[var(--accent)]">
              <Icon name="dataset" size={18} />
            </span>
            <h2 className="text-lg font-extrabold tracking-tight text-strong">E-COMEX</h2>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            {["Plataforma", "Servicios", "Casos", "Recursos"].map((item) => (
              <a
                key={item}
                className="text-sm font-semibold text-muted transition-colors hover:text-strong"
                href="#producto"
              >
                {item}
              </a>
            ))}
          </nav>

          <ButtonLink href="/account" variant="primary" className="px-5">
            Solicitar demo
          </ButtonLink>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-16 pt-10 sm:px-6 lg:px-10 lg:pt-16">
        <section className="relative overflow-hidden rounded-[28px] border border-subtle bg-[color:color-mix(in_oklab,var(--surface2)_54%,transparent)] p-6 shadow-[var(--shadowGlow)] sm:p-8 lg:p-10">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[color:color-mix(in_oklab,var(--accent)_26%,transparent)] blur-3xl" />
          <div className="absolute -bottom-14 left-1/3 h-40 w-40 rounded-full bg-[color:color-mix(in_oklab,var(--primary)_38%,transparent)] blur-3xl" />

          <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
            <div className="space-y-6">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-subtle bg-[var(--surface)] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
                Plataforma + Validación experta
              </div>

              <h1 className="max-w-4xl text-balance text-[clamp(2.05rem,6.5vw,5rem)] font-black leading-[0.98] tracking-[-0.03em] text-white">
                Cotización inteligente para Comercio Exterior
              </h1>

              <p className="max-w-2xl text-[clamp(1rem,1.8vw,1.2rem)] leading-relaxed text-white/78">
                Automatizá clasificación, estimación de costos e impuestos y gestión de cotizaciones en un flujo auditable.
              </p>

              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/account" variant="primary" size="lg" className="px-8">
                  Solicitar demo
                </ButtonLink>
                <a
                  href="#producto"
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-subtle bg-[var(--surface)] px-6 text-sm font-semibold text-strong transition-colors hover:bg-[var(--surface2)]"
                >
                  Ver cómo funciona
                </a>
              </div>
            </div>

            <aside className="panel-strong grid gap-3 p-5">
              {[
                ["Procesamiento", "< 90s", "bolt"],
                ["Cobertura", "NCM + impuestos", "verified"],
                ["Validación", "Experto humano", "support_agent"],
              ].map(([label, value, icon]) => (
                <div key={label} className="rounded-xl border border-subtle bg-[var(--surface)] px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{label}</span>
                    <Icon name={icon} size={16} className="text-[var(--accent)]" />
                  </div>
                  <div className="mt-1 text-base font-extrabold tracking-tight text-strong">{value}</div>
                </div>
              ))}
            </aside>
          </div>
        </section>

        <section id="producto" className="mt-8 grid gap-4 md:grid-cols-3">
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

