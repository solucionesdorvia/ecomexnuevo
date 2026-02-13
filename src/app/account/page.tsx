import Link from "next/link";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Metric } from "@/components/ui/Metric";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SealVerified } from "@/components/ui/SealVerified";
import { TimelineStep } from "@/components/ui/TimelineStep";
import { AppShell } from "@/components/shell/AppShell";

export const runtime = "nodejs";

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function AccountPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ecomex_auth")?.value;
  const payload = token ? await verifyAuthToken(token) : null;

  if (!payload) {
    return (
      <AppShell
        active="account"
        title="Cuenta"
        subtitle="Opcional, para historial y seguimiento"
        right={
          <div className="flex items-center gap-2">
            <SealVerified />
            <ButtonLink href="/chat" variant="primary">
              Ir al chat
              <span className="material-symbols-outlined text-[18px]">bolt</span>
            </ButtonLink>
          </div>
        }
        maxWidth="1200px"
      >
        <Card className="border-white/10 bg-white/5">
          <CardHeader
            eyebrow="CONTROL ROOM"
            title="Cuenta (opcional)"
            icon="person"
            right={<Badge tone="muted" icon="lock">Sin sesión</Badge>}
          />
          <CardContent>
            <p className="max-w-2xl text-sm leading-7 text-muted">
              No necesitás cuenta para cotizar. Si querés, podés crear una para ver historial,
              wishlist y seguimiento.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/account/login"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-6 text-sm font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-white/10"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/account/register"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-primary/20 transition-transform active:scale-95"
              >
                Crear cuenta
              </Link>
              <Link
                href="/chat"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-6 text-sm font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-white/10"
              >
                Ir al chat
              </Link>
            </div>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const quotes = await prisma.quote.findMany({
    where: { userId: payload.sub },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const last = quotes.find((q) => q.totalMinUsd != null && q.totalMaxUsd != null) ?? null;
  const lastTitle =
    last && typeof (last.productJson as any)?.title === "string"
      ? (last.productJson as any).title
      : last?.userText ?? null;
  const lastTotal =
    last?.totalMinUsd != null && last?.totalMaxUsd != null
      ? `${fmtUsd(last.totalMinUsd)} – ${fmtUsd(last.totalMaxUsd)}`
      : null;
  const lastQuality =
    typeof (last?.quoteJson as any)?.quality === "number" && Number.isFinite((last?.quoteJson as any)?.quality)
      ? (last?.quoteJson as any)?.quality
      : null;

  return (
    <AppShell
      active="account"
      title="Tablero"
      subtitle="Control room operativo"
      right={
        <div className="flex items-center gap-2">
          <Badge tone="success" icon="wifi">
            En línea
          </Badge>
          <ButtonLink href="/chat" variant="primary">
            Nueva cotización
            <span className="material-symbols-outlined text-[18px]">bolt</span>
          </ButtonLink>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/90 transition-colors hover:bg-white/10"
            >
              Salir
            </button>
          </form>
        </div>
      }
      maxWidth="1200px"
    >
      <SectionHeader
        eyebrow="CONTROL ROOM"
        title="Tablero"
        subtitle="Estado operativo, historial y recordatorios. Todo en un solo panel."
        icon="dashboard"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="muted" icon="person">
              {payload.email}
            </Badge>
            {lastQuality != null ? (
              <ProgressRing value={lastQuality} label="Calidad" />
            ) : (
              <SealVerified />
            )}
          </div>
        }
      />

      <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Metric label="ETA estimada" value="35–55 días" icon="schedule" tone="primary" />
            <Metric label="Operación" value="Marítimo" icon="directions_boat" tone="muted" />
            <Metric label="Modo" value="Validación" icon="verified_user" tone="gold" />
          </div>

          <Card className="border-white/10 bg-white/5">
            <CardHeader
              eyebrow="OPERACIÓN ACTIVA"
              title="Próximo ciclo de importación"
              icon="sailing"
              right={<Badge tone="gold" icon="auto_awesome">Señal IA</Badge>}
            />
            <CardContent>
              <div className="text-xs leading-relaxed text-muted">
                Visualización orientativa. La consultoría valida requisitos, riesgos y
                documentación antes de ejecutar.
              </div>
              <div className="mt-5">
                <TimelineStep
                  title="Definición del producto"
                  subtitle="Modelo, precio, cantidad y restricciones operativas."
                  eta="HOY"
                  status="done"
                />
                <TimelineStep
                  title="Validación (consultoría)"
                  subtitle="Clasificación aduanera, intervenciones, documentación, riesgos."
                  eta="24–48h"
                  status="active"
                />
                <TimelineStep
                  title="Logística marítima"
                  subtitle="Consolidación, cierre de carga, tránsito y arribo."
                  eta="35–55d"
                  status="pending"
                  className="pb-0"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between px-2">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <span className="material-symbols-outlined text-primary">request_quote</span>
              Cotizaciones guardadas
            </h2>
            <Link
              href="/cotizaciones"
              className="text-xs font-black uppercase tracking-[0.2em] text-muted hover:text-white"
            >
              Ver biblioteca
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/20 text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                <tr>
                  <th className="px-6 py-4">Producto</th>
                  <th className="px-6 py-4">Precio est.</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {quotes.length ? (
                  quotes.map((q) => {
                    const productTitle =
                      typeof (q.productJson as any)?.title === "string"
                        ? (q.productJson as any).title
                        : q.userText;
                    const total =
                      q.totalMinUsd != null && q.totalMaxUsd != null
                        ? `${fmtUsd(q.totalMinUsd)} – ${fmtUsd(q.totalMaxUsd)}`
                        : "—";
                    const pdfHref = `/api/quote/pdf?mode=${encodeURIComponent(q.mode)}&id=${encodeURIComponent(q.id)}`;
                    return (
                      <tr key={q.id} className="transition-colors hover:bg-white/5">
                        <td className="px-6 py-4 font-medium">
                          {productTitle}
                          <div className="mt-1 text-[10px] text-muted">
                            {fmtDate(q.createdAt)} · {q.mode} · {q.stage}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-black text-gold">{total}</td>
                        <td className="px-6 py-4 text-right">
                          <a
                            href={pdfHref}
                            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/80 hover:border-white/20 hover:text-white"
                          >
                            <span className="material-symbols-outlined text-[16px]">download</span>
                            PDF
                          </a>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-6 py-6 text-sm text-muted" colSpan={3}>
                      Todavía no tenés cotizaciones guardadas. Creá una desde el chat.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-8">
          <Card className="border-white/10 bg-white/5">
            <CardHeader eyebrow="RECORDATORIOS" title="Acciones recomendadas" icon="task_alt" />
            <CardContent>
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                    Próximo paso
                  </div>
                  <div className="mt-1 text-sm font-extrabold text-white">
                    Validar requisitos y riesgos
                  </div>
                  <div className="mt-2 text-xs text-muted">
                    Es donde se evitan sobrecostos por clasificación y documentación.
                  </div>
                  <div className="mt-3 flex gap-2">
                    <ButtonLink href="/chat" variant="gold" className="px-4 py-2 text-xs font-black uppercase tracking-[0.2em]">
                      Asesor
                    </ButtonLink>
                    <ButtonLink href="/chat" variant="secondary" className="px-4 py-2 text-xs font-black uppercase tracking-[0.2em]">
                      Consultoría
                    </ButtonLink>
                  </div>
                </div>

                {last && (lastTitle || lastTotal) ? (
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                          Última cotización
                        </div>
                        <div className="mt-1 truncate text-sm font-extrabold text-white">
                          {lastTitle ?? "—"}
                        </div>
                        <div className="mt-2 text-xs text-muted">{lastTotal ?? "—"}</div>
                      </div>
                      {lastQuality != null ? <ProgressRing value={lastQuality} label="Calidad" /> : null}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Link
                        href={`/cotizaciones/reporte?quote=${encodeURIComponent(last.id)}&mode=${encodeURIComponent(last.mode)}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/80 hover:border-white/20 hover:text-white"
                      >
                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                        Reporte
                      </Link>
                      <Link
                        href="/chat"
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-primary/20 transition-transform active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[16px]">bolt</span>
                        Refinar
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <div className="glass-panel premium-glow rounded-2xl p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-gold">auto_awesome</span>
              <h3 className="text-lg font-bold">Asistente IA</h3>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
                <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                  Ahorro detectado
                </p>
                <p className="text-sm leading-relaxed text-white/90">
                  Optimizando la consolidación, podrías reducir un{" "}
                  <span className="font-bold text-white">12%</span> de costos logísticos en tu
                  próximo envío.
                </p>
              </div>
              <div className="rounded-xl border border-gold/20 bg-gold/10 p-4">
                <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-gold">
                  Alerta aduanera
                </p>
                <p className="text-sm leading-relaxed text-white/90">
                  Nuevas regulaciones para importación de electrónicos.{" "}
                  <span className="font-bold text-white">Revisar documentación.</span>
                </p>
              </div>
            </div>
          </div>

          <Card className="border-white/10 bg-white/5">
            <CardHeader eyebrow="DOCUMENTACIÓN" title="Carpeta operativa" icon="folder_open" />
            <CardContent>
              <div className="space-y-3">
                {[
                  {
                    icon: "picture_as_pdf",
                    color: "text-red-500",
                    title: "Factura Comercial (Invoice)",
                    meta: "PDF • Requerido",
                    action: "ver",
                  },
                  {
                    icon: "inventory_2",
                    color: "text-white/70",
                    title: "Lista de Empaque (Packing List)",
                    meta: "PDF/XLSX • Requerido",
                    action: "subir",
                  },
                  {
                    icon: "description",
                    color: "text-primary",
                    title: "Conocimiento de Embarque (BoL)",
                    meta: "PDF • Original",
                    action: "ver",
                  },
                ].map((d) => (
                  <div
                    key={d.title}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`material-symbols-outlined ${d.color}`}>{d.icon}</span>
                      <div>
                        <p className="text-sm font-extrabold">{d.title}</p>
                        <p className="text-[10px] text-muted">{d.meta}</p>
                      </div>
                    </div>
                    <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/80 hover:border-white/20 hover:text-white">
                      {d.action}
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

