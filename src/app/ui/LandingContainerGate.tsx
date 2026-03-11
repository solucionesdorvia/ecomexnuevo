import ContainerVideo from "@/components/ContainerVideo";
import { BrandLogo } from "@/components/BrandLogo";

export default function LandingContainerGate() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[var(--bg)] text-[var(--text)]">
      <div className="absolute inset-0 -z-10">
        <ContainerVideo
          overlayClassName="bg-[linear-gradient(180deg,rgba(5,10,22,0.48)_0%,rgba(5,10,22,0.82)_70%,rgba(5,10,22,0.94)_100%)]"
          showMissingNotice
        />
      </div>
      <header className="fixed top-0 z-[100] w-full px-6 py-6 lg:px-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-[var(--border)] bg-[var(--surface)] px-8 py-3 shadow-2xl backdrop-blur-xl">
          <div className="rounded-lg bg-white px-3 py-1.5 shadow-sm">
            <BrandLogo className="h-7" priority />
          </div>
          <nav className="hidden items-center gap-12 md:flex">
            <a className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 transition-colors hover:text-white" href="#sistema">SISTEMA</a>
            <a className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 transition-colors hover:text-white" href="#consultoria">CONSULTORIA</a>
            <a className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 transition-colors hover:text-white" href="#nosotros">NOSOTROS</a>
          </nav>
          <div className="flex items-center gap-6">
            <a href="/account" className="rounded-full border border-[color:color-mix(in_oklab,var(--accent)_32%,transparent)] bg-[var(--primary)] px-6 py-2 text-[11px] font-black uppercase tracking-[0.15em] text-white shadow-[0_0_20px_rgba(111,92,255,0.4)] transition-all hover:brightness-110">
              CONTACTO
            </a>
          </div>
        </div>
      </header>

      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden pt-28 md:pt-36">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[color:color-mix(in_oklab,var(--bg)_80%,transparent)] via-transparent to-[var(--bg)]" />
          <div
            className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/stardust.png')" }}
          />
        </div>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-[600px] w-[600px] overflow-hidden rounded-full shadow-[0_0_100px_rgba(111,92,255,0.2),inset_0_0_60px_rgba(63,214,255,0.1)]">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#121c35] via-[#222d4a] to-[#050a16]" />
            <div
              className="absolute inset-0 opacity-40"
              style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/carbon-fibre.png')" }}
            />
            <div className="absolute inset-0 rounded-full border border-[color:color-mix(in_oklab,var(--primary)_30%,transparent)] shadow-[inset_0_0_80px_rgba(111,92,255,0.3)]" />
            <div className="absolute inset-0 opacity-20">
              <svg className="h-full w-full animate-pulse">
                <line stroke="var(--accent)" strokeWidth="0.5" x1="0" x2="100%" y1="50%" y2="50%" />
                <line stroke="var(--primary)" strokeWidth="0.5" x1="20%" x2="80%" y1="0" y2="100%" />
              </svg>
            </div>
          </div>
        </div>
        <div className="relative z-10 px-6 text-center">
          <h1 className="mx-auto mb-8 max-w-5xl text-5xl font-black leading-[1] tracking-tight uppercase md:text-8xl">
            EL NUCLEO INTELIGENTE <br /> DEL COMERCIO EXTERIOR
          </h1>
          <p className="mx-auto mb-14 max-w-2xl rounded bg-[color:color-mix(in_oklab,var(--bg)_78%,transparent)] p-2 text-lg font-light tracking-wide text-slate-400 backdrop-blur-sm md:text-xl">
            La fusion definitiva entre algoritmos de alta precision y consultoria experta para dominar la cadena de suministro global.
          </p>
          <div className="flex flex-col items-center justify-center gap-8 sm:flex-row">
            <a href="/cotizar" className="rounded-full border border-[color:color-mix(in_oklab,var(--accent)_30%,transparent)] bg-[var(--primary)] px-10 py-5 text-sm font-black tracking-widest uppercase text-white shadow-[0_0_30px_rgba(111,92,255,0.5)] transition-all hover:scale-105">
              Cotizar Operacion
            </a>
            <a href="/account" className="rounded-full border border-[var(--border)] bg-white/5 px-10 py-5 text-sm font-black tracking-widest uppercase text-white backdrop-blur-md transition-all hover:bg-white/10">
              Explorar Ecosistema
            </a>
          </div>
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-2 text-left md:grid-cols-4">
            {[
              ["URL de producto", "/cotizar?source=url", "link"],
              ["Imagen de producto", "/cotizar?source=image", "image"],
              ["Factura / Proforma", "/cotizar?source=invoice", "description"],
              ["Descripci?n libre", "/cotizar?source=text", "edit_note"],
            ].map(([label, href, icon]) => (
              <a key={label} href={href} className="inline-flex items-center gap-2 rounded-xl border border-subtle bg-[var(--surface)] px-3 py-2 text-xs font-bold text-muted hover:text-strong">
                <span className="material-symbols-outlined text-sm">{icon}</span>
                {label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="sistema" className="relative px-6 py-32 lg:px-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-20">
            <h2 className="mb-6 text-4xl font-black tracking-tight text-white uppercase md:text-5xl">
              Complejidad <span className="text-[var(--accent)]">Resuelta.</span>
            </h2>
            <div className="h-1 w-20 bg-[var(--primary)]" />
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              ["travel_explore", "Visibilidad Estelar", "Trazabilidad granular en tiempo real para cada activo en transito global mediante nodos inteligentes."],
              ["shield_with_heart", "Protocolos Blindados", "Validacion automatica bajo estandares normativos internacionales con certificacion instantanea."],
              ["auto_awesome", "Navegacion Predictiva", "Algoritmos de eficiencia logistica que anticipan cuellos de botella antes de que ocurran."],
            ].map(([icon, title, text]) => (
              <div key={title} className="group border border-[var(--border)] bg-[var(--surface)] p-12 backdrop-blur-xl transition-all hover:border-[color:color-mix(in_oklab,var(--accent)_40%,transparent)]">
                <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-[color:color-mix(in_oklab,var(--primary)_10%,transparent)] text-[var(--accent)]">
                  <span className="material-symbols-outlined text-4xl">{icon}</span>
                </div>
                <h3 className="mb-4 text-2xl font-bold text-white">{title}</h3>
                <p className="font-light leading-relaxed text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#060c1d] px-6 py-32 lg:px-20">
        <svg className="pointer-events-none absolute top-1/2 left-0 h-1 w-full opacity-20" preserveAspectRatio="none">
          <path d="M0 10 Q 250 80, 500 10 T 1000 10" fill="none" stroke="var(--primary)" strokeWidth="2" />
        </svg>
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="mb-24 text-center">
            <h2 className="mb-4 text-4xl font-black tracking-[0.2em] text-white uppercase">Flujo de Inteligencia</h2>
            <p className="text-xs font-bold tracking-widest text-[var(--primary)]">SISTEMA INTEGRADO DE PROCESAMIENTO</p>
          </div>
          <div className="relative grid grid-cols-1 gap-16 md:grid-cols-3 md:gap-4">
            {[
              ["cloud_upload", "Carga", "Ingesta de datos multicanal con procesamiento avanzado."],
              ["analytics", "Calculo", "Motor de liquidacion y proyeccion de costos operativos."],
              ["verified", "Validacion", "Certificacion experta Nivel Senior para cada operacion."],
            ].map(([icon, title, text]) => (
              <div key={title} className="flex flex-col items-center text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[color:color-mix(in_oklab,var(--primary)_40%,transparent)] bg-[var(--surface)] backdrop-blur-xl">
                  <span className="material-symbols-outlined text-3xl text-[var(--primary)]">{icon}</span>
                </div>
                <h4 className="mb-2 text-xl font-bold text-white">{title}</h4>
                <p className="max-w-[200px] text-sm text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="consultoria" className="px-6 py-32 lg:px-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 items-center gap-20 lg:grid-cols-2">
            <div>
              <h2 className="mb-10 text-4xl leading-tight font-black text-white md:text-5xl">
                Control Maestro de <br />
                <span className="text-[var(--accent)]">Operaciones Globales</span>
              </h2>
              <div className="space-y-6">
                <div className="flex gap-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 backdrop-blur-xl">
                  <span className="material-symbols-outlined text-3xl text-[var(--primary)]">insights</span>
                  <div>
                    <h5 className="mb-1 text-lg font-bold text-white">Analytics de Alta Frecuencia</h5>
                    <p className="text-sm text-slate-400">Monitoreo de KPI&apos;s criticos con refresco en milisegundos.</p>
                  </div>
                </div>
                <div className="flex gap-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 backdrop-blur-xl">
                  <span className="material-symbols-outlined text-3xl text-[var(--accent)]">hub</span>
                  <div>
                    <h5 className="mb-1 text-lg font-bold text-white">Interconexion Aduanera</h5>
                    <p className="text-sm text-slate-400">Puente digital directo con principales terminales portuarias.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute -inset-4 rounded-full bg-[color:color-mix(in_oklab,var(--primary)_20%,transparent)] opacity-30 blur-3xl" />
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface)] shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-[var(--border)] bg-[color:color-mix(in_oklab,var(--bg)_80%,transparent)] px-6 py-4">
                  <div className="flex gap-2">
                    <div className="h-3 w-3 rounded-full bg-[var(--primary)]" />
                    <div className="h-3 w-3 rounded-full bg-[var(--accent)]" />
                  </div>
                  <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">TERMINAL_CORE_v2.0</div>
                </div>
                <div className="aspect-video p-8">
                  <div className="grid h-full grid-cols-12 gap-6">
                    <div className="col-span-8 flex flex-col gap-6">
                      <div className="h-32 rounded-lg border border-[color:color-mix(in_oklab,var(--primary)_20%,transparent)] bg-[color:color-mix(in_oklab,var(--primary)_10%,transparent)] p-4">
                        <div className="flex h-full items-end justify-between">
                          <div className="h-full w-4 bg-[color:color-mix(in_oklab,var(--primary)_40%,transparent)]" />
                          <div className="h-2/3 w-4 bg-[color:color-mix(in_oklab,var(--primary)_40%,transparent)]" />
                          <div className="h-4/5 w-4 bg-[var(--accent)]" />
                          <div className="h-1/2 w-4 bg-[color:color-mix(in_oklab,var(--primary)_40%,transparent)]" />
                          <div className="h-full w-4 bg-[color:color-mix(in_oklab,var(--primary)_40%,transparent)]" />
                        </div>
                      </div>
                      <div className="flex h-20 items-center gap-4 rounded-lg border border-[color:color-mix(in_oklab,var(--accent)_20%,transparent)] bg-[color:color-mix(in_oklab,var(--accent)_5%,transparent)] px-6">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
                          <div className="h-full w-3/4 bg-[var(--accent)]" />
                        </div>
                      </div>
                    </div>
                    <div className="col-span-4 rounded-lg border border-[var(--border)] bg-slate-800/20 p-4">
                      <div className="space-y-4">
                        <div className="h-3 w-3/4 bg-slate-700" />
                        <div className="h-3 w-1/2 bg-slate-700" />
                        <div className="flex h-24 w-full items-center justify-center border-2 border-dashed border-[color:color-mix(in_oklab,var(--primary)_20%,transparent)]">
                          <span className="material-symbols-outlined text-[var(--primary)]">radar</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="nosotros" className="border-y border-[var(--border)] bg-[var(--bg)] px-6 py-32 lg:px-20">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-xl">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="flex flex-col justify-center p-16 lg:p-24">
              <span className="mb-6 block text-xs font-black tracking-[0.4em] text-[var(--accent)] uppercase">Elite Consulting</span>
              <h2 className="mb-8 text-4xl leading-tight font-black text-white md:text-5xl">
                Poder Tecnologico. <br />
                <span className="font-light italic text-slate-400">Criterio Humano.</span>
              </h2>
              <p className="mb-12 text-lg leading-relaxed font-light text-slate-400">
                Nuestra plataforma no reemplaza el juicio experto; lo potencia. Consultores senior validan cada operacion critica, garantizando seguridad juridica y eficiencia financiera en un entorno global de alta volatilidad.
              </p>
              <a href="/account" className="group flex w-fit items-center gap-4 text-sm font-black tracking-widest uppercase text-white">
                <span className="border-b-2 border-[var(--primary)] pb-1 transition-all group-hover:pr-4">CONOCER EXPERTOS</span>
                <span className="material-symbols-outlined text-[var(--accent)]">arrow_forward</span>
              </a>
            </div>
            <div className="relative min-h-[500px]">
              <img
                alt="Expert Consulting"
                className="absolute inset-0 h-full w-full object-cover brightness-75 grayscale transition-all duration-1000 hover:grayscale-0"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDkMGY-hjX2O8KNilvwqanxVheCzK41ztgAsHzeVDXUlUC41sfoKtf2DoGVx8p7_xHzOvnB8l0HmbZam3FaZ0CUTjcTGbvHva5sxygXs76uAia3gLVUZ_CMX5Q-JBygDWRpRNmw-awHPhAItMNrZBSKYqK1ao3875ac8R1Mn9AYVLS3YhzBbZc9NNyMBNvCv-Tj0dmL-cId5A00mZqpWTgM79SwJIQYf6-AjrxpEvDYuRtNKztKaD0GRXxORpcboZWq42YEYRXVaCBo"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg)] via-[color:color-mix(in_oklab,var(--bg)_40%,transparent)] to-transparent" />
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] bg-[var(--bg)] px-6 pt-24 pb-12 lg:px-20">
        <div className="mx-auto mb-20 grid max-w-7xl grid-cols-1 gap-20 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="mb-8 w-fit rounded-lg bg-white px-3 py-2 shadow-sm">
              <BrandLogo className="h-8" />
            </div>
            <p className="max-w-sm text-lg leading-relaxed font-light text-slate-500">
              Liderando la vanguardia del comercio internacional a traves de inteligencia tecnologica y vision humana.
            </p>
          </div>
          <div>
            <h6 className="mb-8 text-xs font-black tracking-[0.3em] text-white uppercase">Plataforma</h6>
            <ul className="space-y-4 text-sm font-medium text-slate-500">
              <li><a className="transition-colors hover:text-[var(--primary)]" href="#sistema">Sistema Planet Core</a></li>
              <li><a className="transition-colors hover:text-[var(--primary)]" href="#sistema">Nodos Logisticos</a></li>
              <li><a className="transition-colors hover:text-[var(--primary)]" href="#sistema">Seguridad</a></li>
            </ul>
          </div>
          <div>
            <h6 className="mb-8 text-xs font-black tracking-[0.3em] text-white uppercase">Empresa</h6>
            <ul className="space-y-4 text-sm font-medium text-slate-500">
              <li><a className="transition-colors hover:text-[var(--primary)]" href="#nosotros">Nuestra Mision</a></li>
              <li><a className="transition-colors hover:text-[var(--primary)]" href="/account">Contacto</a></li>
              <li><a className="transition-colors hover:text-[var(--primary)]" href="#nosotros">Legal</a></li>
            </ul>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 border-t border-[var(--border)] pt-12 md:flex-row">
          <p className="text-[10px] font-bold tracking-widest text-slate-700 uppercase">? 2024 E-COMEX Trade Intelligence. Space-Tech Commerce Architecture.</p>
          <div className="flex gap-10">
            <a className="text-[10px] font-bold tracking-widest text-slate-700 uppercase transition-colors hover:text-slate-400" href="#nosotros">Terminos de Servicio</a>
            <a className="text-[10px] font-bold tracking-widest text-slate-700 uppercase transition-colors hover:text-slate-400" href="#nosotros">Privacidad</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

