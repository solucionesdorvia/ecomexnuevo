import Link from "next/link";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/shell/AppShell";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { SealVerified } from "@/components/ui/SealVerified";

export const runtime = "nodejs";

function safeMode(m: string | null) {
  return m === "budget" ? "budget" : "quote";
}

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function asStr(v: any) {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export default async function ReporteCotizacionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const id = typeof sp.quote === "string" ? sp.quote : undefined;
  const mode = safeMode(typeof sp.mode === "string" ? sp.mode : null);

  const cookieStore = await cookies();
  const anonId = cookieStore.get("ecomex_anon")?.value ?? null;
  const token = cookieStore.get("ecomex_auth")?.value ?? null;
  const payload = token ? await verifyAuthToken(token) : null;

  const where = id
    ? payload
      ? { id, userId: payload.sub, mode }
      : anonId
        ? { id, anonId, mode }
        : null
    : payload
      ? { userId: payload.sub, mode, totalMinUsd: { not: null }, totalMaxUsd: { not: null } }
      : anonId
        ? { anonId, mode, totalMinUsd: { not: null }, totalMaxUsd: { not: null } }
        : null;

  const quote = where
    ? await prisma.quote
        .findFirst({
          where: where as any,
          orderBy: { createdAt: "desc" },
        })
        .catch(() => null)
    : null;

  const pj: any = quote?.productJson ?? {};
  const qj: any = quote?.quoteJson ?? {};
  const title = asStr(pj?.title) ?? asStr(quote?.userText) ?? "Reporte de análisis";
  const ncm = asStr(pj?.ncm);
  const origin = asStr(pj?.origin);
  const shippingProfile = asStr(pj?.shippingProfile);
  const quality =
    typeof qj?.quality === "number" && Number.isFinite(qj.quality) ? qj.quality : null;

  const total =
    quote?.totalMinUsd != null && quote?.totalMaxUsd != null
      ? `${fmtUsd(quote.totalMinUsd)} – ${fmtUsd(quote.totalMaxUsd)}`
      : "—";

  const assumptions: Array<{
    id: string;
    label: string;
    value: string;
    source?: string;
    tone?: "muted" | "primary" | "gold" | "success";
  }> = Array.isArray(qj?.assumptions) ? qj.assumptions : [];

  const cards: Array<{ label: string; value: string; detail?: string; highlight?: boolean }> =
    Array.isArray(qj?.cards) ? qj.cards : [];

  const breakdown: any =
    qj?.breakdown && typeof qj.breakdown === "object" ? (qj.breakdown as any) : null;

  const pdfHref =
    quote?.id ? `/api/quote/pdf?mode=${encodeURIComponent(mode)}&id=${encodeURIComponent(quote.id)}` : `/api/quote/pdf?mode=${encodeURIComponent(mode)}`;

  return (
    <AppShell
      active="cotizaciones"
      title="Reporte"
      subtitle="Informe orientativo, listo para validar"
      right={
        <div className="flex items-center gap-2">
          <a
            href={pdfHref}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/90 transition-colors hover:bg-white/10"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            PDF
          </a>
          <ButtonLink href="/chat" variant="gold" className="px-4 py-2 text-xs font-black uppercase tracking-[0.2em]">
            Hablar con asesor
          </ButtonLink>
        </div>
      }
      maxWidth="1200px"
    >
      <nav className="flex items-center gap-2 text-xs text-muted">
        <Link className="hover:text-primary" href="/cotizaciones">
          Cotizaciones
        </Link>
        <span className="material-symbols-outlined text-[16px] text-muted/60">
          chevron_right
        </span>
        <span className="font-bold text-white">Reporte</span>
      </nav>

      <div className="mt-6 flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <SealVerified />
            <span className="text-sm font-medium text-muted">
              {quote?.id ? (
                <>
                  ID de reporte: <span className="font-bold text-white">{quote.id}</span>
                </>
              ) : (
                <>Sin sesión: generá una cotización en el chat.</>
              )}
            </span>
          </div>
          <h1 className="text-3xl font-black leading-none tracking-tight md:text-4xl">
            {title}
          </h1>
          <p className="text-sm text-muted">
            Reporte orientativo generado automáticamente. Para operar: validar clasificación, requisitos y
            riesgos con un especialista.
          </p>
        </div>

        <div className="flex w-full gap-3 md:w-auto">
          <ButtonLink href="/chat" variant="primary" className="flex-1 px-6 py-2.5 md:flex-none">
            Agendar consultoría
            <span className="material-symbols-outlined text-[18px]">event</span>
          </ButtonLink>
          <ButtonLink href="/chat" variant="gold" className="flex-1 px-6 py-2.5 md:flex-none">
            Hablar con asesor
            <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
          </ButtonLink>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone="primary" icon="directions_boat">
          Marítimo
        </Badge>
        <Badge tone="gold" icon="verified_user">
          Validación recomendada
        </Badge>
        {ncm ? (
          <Badge tone="muted" icon="tag">
            NCM {ncm}
          </Badge>
        ) : null}
        {origin ? (
          <Badge tone="muted" icon="public">
            Origen: {origin}
          </Badge>
        ) : null}
        {shippingProfile ? (
          <Badge tone="muted" icon="inventory_2">
            Perfil: {shippingProfile}
          </Badge>
        ) : null}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          <Card className="border-white/10 bg-white/5">
            <CardHeader
              eyebrow="Resumen ejecutivo"
              title="Qué sabemos y qué falta"
              icon="summarize"
              right={quality != null ? <ProgressRing value={quality} label="Calidad" /> : <SealVerified />}
            />
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                    Total estimado
                  </div>
                  <div className="mt-2 gold-gradient-text text-2xl font-black tracking-tight">
                    {total}
                  </div>
                  <div className="mt-2 text-xs text-muted">
                    Rango orientativo. Se afina con peso/volumen y documentación final.
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                    Señales / supuestos
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {assumptions.length ? (
                      assumptions.slice(0, 10).map((a) => (
                        <Badge key={a.id} tone={(a.tone as any) ?? "muted"} icon="bolt">
                          {a.label}: {a.value}
                        </Badge>
                      ))
                    ) : (
                      <div className="text-xs text-muted">
                        No hay supuestos estructurados. Recomendamos completar origen y perfil de
                        carga.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="border-white/10 bg-white/5">
              <CardHeader eyebrow="Requisitos" title="Checklist de validación" icon="gavel" />
              <CardContent>
                <ul className="space-y-3 text-sm">
                  {[
                    {
                      k: "Clasificación aduanera",
                      v: ncm ? "Detectada (verificar descripción técnica)" : "Pendiente (impacta tributos)",
                      tone: ncm ? "success" : "gold",
                      icon: "verified_user",
                    },
                    {
                      k: "Origen / documentación",
                      v: origin ? "Informado (validar incoterm y proveedor)" : "Pendiente (afina impuestos y riesgos)",
                      tone: origin ? "success" : "gold",
                      icon: "description",
                    },
                    {
                      k: "Peso/volumen",
                      v: shippingProfile ? "Perfil cargado (afina flete)" : "Pendiente (principal driver del flete)",
                      tone: shippingProfile ? "success" : "gold",
                      icon: "inventory_2",
                    },
                    {
                      k: "Intervenciones / permisos",
                      v: "Validar según rubro (técnico/regulatorio)",
                      tone: "muted",
                      icon: "policy",
                    },
                  ].map((x) => (
                    <li key={x.k} className="flex gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                      <span className="material-symbols-outlined text-primary">{x.icon}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-black uppercase tracking-[0.2em] text-muted">{x.k}</div>
                        <div className="mt-1 text-xs text-white/90">{x.v}</div>
                        <div className="mt-2">
                          <Badge tone={x.tone as any} icon="flag">
                            {x.tone === "success" ? "OK" : x.tone === "gold" ? "A confirmar" : "Variable"}
                          </Badge>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5">
              <CardHeader eyebrow="Riesgos" title="Puntos ciegos típicos" icon="warning" />
              <CardContent>
                <ul className="space-y-3 text-sm">
                  {[
                    {
                      title: "Clasificación incorrecta",
                      desc: "Puede cambiar alícuotas, requisitos e incluso bloquear la operación.",
                    },
                    {
                      title: "Documentación incompleta",
                      desc: "Facturas/packing/incoterm inconsistentes generan demoras y costos extra.",
                    },
                    {
                      title: "Peso/volumen subestimado",
                      desc: "El flete marítimo y los gastos portuarios pueden variar fuerte.",
                    },
                    {
                      title: "Condición fiscal / percepciones",
                      desc: "Impacta IVA/percepciones y el efectivo a inmovilizar.",
                    },
                  ].map((x) => (
                    <li key={x.title} className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-muted">
                        {x.title}
                      </div>
                      <div className="mt-1 text-xs leading-relaxed text-muted">{x.desc}</div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className="border-white/10 bg-white/5">
            <CardHeader eyebrow="Desglose" title="Costos por módulo" icon="receipt_long" />
            <CardContent>
              {breakdown && typeof breakdown.totalMinUsd === "number" ? (
                <div className="mb-4 overflow-hidden rounded-2xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-black/20 text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                      <tr>
                        <th className="px-4 py-3 text-left">Componente</th>
                        <th className="px-4 py-3 text-right">Min</th>
                        <th className="px-4 py-3 text-right">Max</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 bg-white/5">
                      {[
                        [
                          "FOB (producto)",
                          typeof breakdown.fobTotalMinUsd === "number"
                            ? breakdown.fobTotalMinUsd
                            : breakdown.fobTotalUsd,
                          typeof breakdown.fobTotalMaxUsd === "number"
                            ? breakdown.fobTotalMaxUsd
                            : breakdown.fobTotalUsd,
                        ],
                        ["Flete marítimo", breakdown.fleteMinUsd, breakdown.fleteMaxUsd],
                        ["Seguro", breakdown.seguroMinUsd, breakdown.seguroMaxUsd],
                        ["CIF (+seguro)", breakdown.cifPlusInsuranceMinUsd, breakdown.cifPlusInsuranceMaxUsd],
                        ["Derechos importación", breakdown.derechosImportacionMinUsd, breakdown.derechosImportacionMaxUsd],
                        ["Tasa estadística", breakdown.tasaEstadisticaMinUsd, breakdown.tasaEstadisticaMaxUsd],
                        ["IVA", breakdown.ivaMinUsd, breakdown.ivaMaxUsd],
                        ["IVA adicional", breakdown.ivaAdicionalMinUsd, breakdown.ivaAdicionalMaxUsd],
                        ["Impuestos internos", breakdown.impuestosInternosMinUsd, breakdown.impuestosInternosMaxUsd],
                        ["Impuestos (total)", breakdown.impuestosTotalMinUsd, breakdown.impuestosTotalMaxUsd],
                        ["Gestión / operativos", breakdown.gestionMinUsd, breakdown.gestionMaxUsd],
                        ["TOTAL", breakdown.totalMinUsd, breakdown.totalMaxUsd],
                      ]
                        .filter(([, a, b]) => typeof a === "number" && typeof b === "number")
                        .map(([label, a, b]) => (
                          <tr key={label as string}>
                            <td className="px-4 py-3 text-xs text-white/80">{label as string}</td>
                            <td className="px-4 py-3 text-right text-xs font-extrabold text-white">
                              {fmtUsd(a as number)}
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-extrabold text-white">
                              {fmtUsd(b as number)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {cards.length ? (
                <div className="space-y-3">
                  {cards.map((c, idx) => (
                    <div
                      key={`${c.label}-${idx}`}
                      className="rounded-xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                            {c.label}
                          </div>
                          <div className={c.highlight ? "mt-2 gold-gradient-text text-xl font-black" : "mt-2 text-lg font-black text-white"}>
                            {c.value}
                          </div>
                          {c.detail ? (
                            <div className="mt-2 text-xs leading-relaxed text-muted">{c.detail}</div>
                          ) : null}
                        </div>
                        {c.highlight ? <SealVerified /> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-muted">
                  No hay desglose disponible. Generá una cotización en el chat.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <Card className="border-primary/30 bg-white/5 lg:sticky lg:top-24">
            <CardHeader
              eyebrow="Siguiente paso"
              title="Validar con especialista"
              icon="handshake"
              right={<Badge tone="gold" icon="auto_awesome">Premium</Badge>}
            />
            <CardContent>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-xs leading-relaxed text-muted">
                Este reporte es <span className="font-bold text-white/80">orientativo</span>. Si querés operar,
                la consultoría paga valida clasificación, requisitos y riesgos.
              </div>
              <div className="mt-4 grid gap-3">
                <ButtonLink href="/chat" variant="gold" className="w-full py-3">
                  Hablar con asesor
                  <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
                </ButtonLink>
                <ButtonLink href="/chat" variant="primary" className="w-full py-3">
                  Agendar consultoría
                  <span className="material-symbols-outlined text-[18px]">event</span>
                </ButtonLink>
              </div>
              <div className="mt-4 flex gap-3 rounded-lg border border-dashed border-white/10 bg-white/5 p-4">
                <span className="material-symbols-outlined text-lg text-white/60">info</span>
                <p className="text-[11px] italic leading-relaxed text-muted">
                  Un error en clasificación o requisitos puede generar sobrecostos, demoras o bloqueos.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Spacer so the fixed mobile CTA doesn't cover content */}
      <div className="h-24 lg:hidden" />

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-background-deeper/70 p-4 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex w-full max-w-[1200px] items-center gap-3 px-2">
          <ButtonLink href="/chat" variant="primary" className="flex-1 py-3">
            Agendar
          </ButtonLink>
          <ButtonLink href="/chat" variant="gold" className="flex-1 py-3">
            Asesor
          </ButtonLink>
        </div>
      </div>
    </AppShell>
  );
}

