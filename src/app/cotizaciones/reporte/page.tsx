/* eslint-disable @typescript-eslint/no-explicit-any */
// Quote report page — dynamic Prisma JSON shapes require any casts.
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
import { Icon } from "@/components/ui/Icon";
import { can } from "@/lib/auth/permissions";
import { ExpertChannel } from "@/app/cotizaciones/reporte/ui/ExpertChannel";
import { DecisionActions } from "@/app/cotizaciones/reporte/ui/DecisionActions";

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
  const sessionUser = payload
    ? await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, email: true },
      })
    : null;

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

  const baselineQuotes = quote
    ? await prisma.quote.findMany({
        where: payload
          ? { userId: payload.sub, totalMaxUsd: { not: null } }
          : anonId
            ? { anonId, userId: null, totalMaxUsd: { not: null } }
            : undefined,
        orderBy: { createdAt: "desc" },
        take: 12,
        select: { id: true, totalMaxUsd: true },
      })
    : [];
  const baselineValues = baselineQuotes
    .filter((q) => q.id !== quote?.id && typeof q.totalMaxUsd === "number")
    .map((q) => Number(q.totalMaxUsd));
  const benchmarkAvg =
    baselineValues.length >= 3
      ? baselineValues.reduce((acc, x) => acc + x, 0) / baselineValues.length
      : null;
  const benchmarkDelta =
    benchmarkAvg != null && quote?.totalMaxUsd != null ? quote.totalMaxUsd - benchmarkAvg : null;
  const benchmarkDeltaPct =
    benchmarkAvg != null && benchmarkAvg > 0 && benchmarkDelta != null
      ? (benchmarkDelta / benchmarkAvg) * 100
      : null;

  const auditRows = quote?.id
    ? await prisma.auditLog.findMany({
        where: { quoteId: quote.id },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          createdAt: true,
          action: true,
          actorRole: true,
          payload: true,
        },
      })
    : [];

  const canValidate = can((sessionUser?.role as any) ?? "user", "quote:validate");
  const canComment = can((sessionUser?.role as any) ?? "user", "comment:write");

  return (
    <AppShell
      active="cotizaciones"
      title="Reporte"
      subtitle="Informe orientativo, listo para validar"
      right={
        <div className="flex items-center gap-2">
          <a
            href={pdfHref}
            className="inline-flex items-center gap-2 rounded-xl border border-subtle bg-[var(--surface)] px-4 py-2 text-xs font-bold text-strong transition-colors hover:bg-[var(--surface2)]"
          >
            <Icon name="download" size={18} className="text-white/85" />
            PDF
          </a>
          <ButtonLink href="/chat" variant="secondary" className="px-4 py-2 text-xs font-bold">
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
        <Icon name="chevron_right" size={16} className="text-muted/60" />
        <span className="font-bold text-strong">Reporte</span>
      </nav>

      <div className="mt-6 flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <SealVerified />
            <span className="text-sm font-medium text-muted">
              {quote?.id ? (
                <>
                  ID de reporte: <span className="font-bold text-strong">{quote.id}</span>
                </>
              ) : (
                <>Sin sesión: generá una cotización desde el análisis.</>
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
            <Icon name="calendar_today" size={18} className="text-white/90" />
          </ButtonLink>
          <ButtonLink href="/chat" variant="secondary" className="flex-1 px-6 py-2.5 md:flex-none">
            Hablar con asesor
            <Icon name="chat_bubble" size={18} className="text-white/90" />
          </ButtonLink>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone="primary" icon="directions_boat">
          Marítimo
        </Badge>
        <Badge tone="muted" icon="verified_user">
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

      <div className="mt-6">
        <div
          className="inline-flex items-center gap-1 rounded-xl border border-subtle bg-[var(--surface)] p-1"
          role="tablist"
        >
          {[
            { id: "overview", label: "Resumen", icon: "summarize", active: true },
            { id: "breakdown", label: "Desglose", icon: "receipt_long", active: false },
            { id: "trust", label: "Trust", icon: "verified_user", active: false },
          ].map((t) => (
            <span
              key={t.id}
              role="tab"
              aria-selected={t.active}
              className={[
                "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-black uppercase tracking-widest",
                t.active ? "bg-[var(--surface2)] text-strong" : "text-muted",
              ].join(" ")}
            >
              <Icon name={t.icon} size={16} className="text-current" />
              {t.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          <Card>
            <CardHeader
              eyebrow="Resumen ejecutivo"
              title="Qué sabemos y qué falta"
              icon="summarize"
              right={quality != null ? <ProgressRing value={quality} label="Calidad" /> : <SealVerified />}
            />
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="panel rounded-xl p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                    Total estimado
                  </div>
                  <div className="mt-2 text-2xl font-black tracking-tight text-strong">
                    {total}
                  </div>
                  <div className="mt-2 text-xs text-muted">
                    Rango orientativo. Se afina con peso/volumen y documentación final.
                  </div>
                </div>
                <div className="panel rounded-xl p-4">
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
                    <li key={x.k} className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                      <Icon name={x.icon} size={18} className="mt-0.5 text-white/80" />
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
                    <li key={x.title} className="rounded-xl border border-white/10 bg-white/5 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
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

          <Card>
            <CardHeader eyebrow="Desglose" title="Costos por módulo" icon="receipt_long" />
            <CardContent>
              {breakdown && typeof breakdown.totalMinUsd === "number" ? (
                <div className="mb-4 overflow-hidden rounded-2xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-background-deeper/40 text-[10px] font-black uppercase tracking-[0.2em] text-muted">
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
                      className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                            {c.label}
                          </div>
                          <div className={c.highlight ? "mt-2 text-xl font-black text-white" : "mt-2 text-lg font-black text-white"}>
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
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  No hay desglose disponible. Generá una cotización desde el análisis.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader eyebrow="Benchmark" title="Cost Benchmark" icon="signal_cellular_alt" />
            <CardContent>
              {benchmarkAvg != null && quote?.totalMaxUsd != null ? (
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-muted">Total actual</div>
                    <div className="mt-2 text-lg font-semibold text-white">{fmtUsd(quote.totalMaxUsd)}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-muted">Promedio histórico</div>
                    <div className="mt-2 text-lg font-semibold text-white">{fmtUsd(benchmarkAvg)}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-muted">Diferencia</div>
                    <div className={benchmarkDelta != null && benchmarkDelta <= 0 ? "mt-2 text-lg font-semibold text-emerald-300" : "mt-2 text-lg font-semibold text-amber-300"}>
                      {benchmarkDelta != null && benchmarkDelta > 0 ? "+" : ""}
                      {fmtUsd(benchmarkDelta ?? 0)}
                    </div>
                    <div className="text-xs text-muted">
                      {benchmarkDeltaPct != null ? `${benchmarkDeltaPct.toFixed(1)}% vs histórico` : "—"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-white/70">
                  Aún no hay historial suficiente para benchmark. Necesitás al menos 3 cotizaciones previas.
                </div>
              )}
            </CardContent>
          </Card>

          {quote?.id ? <ExpertChannel quoteId={quote.id} canComment={canComment} /> : null}
        </div>

        <div className="space-y-6 lg:col-span-4">
          <Card className="border-primary/30 lg:sticky lg:top-24">
            <CardHeader
              eyebrow="Siguiente paso"
              title="Validar con especialista"
              icon="handshake"
              right={<Badge tone="primary" icon="auto_awesome">Premium</Badge>}
            />
            <CardContent>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs leading-relaxed text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                Este reporte es <span className="font-bold text-white/80">orientativo</span>. Si querés operar,
                la consultoría paga valida clasificación, requisitos y riesgos.
              </div>
              <div className="mt-4 grid gap-3">
                <ButtonLink href="/chat" variant="secondary" className="w-full py-3">
                  Hablar con asesor
                  <Icon name="chat_bubble" size={18} className="text-white/90" />
                </ButtonLink>
                <ButtonLink href="/chat" variant="primary" className="w-full py-3">
                  Agendar consultoría
                  <Icon name="calendar_today" size={18} className="text-white/90" />
                </ButtonLink>
              </div>
              {quote?.id ? (
                <div className="mt-4">
                  <DecisionActions quoteId={quote.id} canValidate={canValidate} />
                </div>
              ) : null}
              <div className="mt-4 flex gap-3 rounded-lg border border-dashed border-white/10 bg-white/5 p-4">
                <Icon name="info" size={18} className="text-white/60" />
                <p className="text-[11px] italic leading-relaxed text-muted">
                  Un error en clasificación o requisitos puede generar sobrecostos, demoras o bloqueos.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader eyebrow="Trust & Compliance" title="Trazabilidad y cumplimiento" icon="verified_user" />
            <CardContent>
              <div className="space-y-2">
                {auditRows.length ? (
                  auditRows.map((row) => (
                    <div key={row.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center justify-between gap-2 text-[11px] text-white/60">
                        <span>{row.action}</span>
                        <span>{new Date(row.createdAt).toLocaleString("es-AR")}</span>
                      </div>
                      <div className="mt-1 text-xs text-white/75">
                        actor: {row.actorRole ?? "system"}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-white/15 bg-white/5 p-3 text-xs text-white/70">
                    Sin eventos de auditoría todavía para esta cotización.
                  </div>
                )}
              </div>
              <div className="mt-3 text-[11px] text-muted">
                Disclaimer técnico: los cálculos son orientativos hasta validación documental y normativa final.
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
          <ButtonLink href="/chat" variant="secondary" className="flex-1 py-3">
            Asesor
          </ButtonLink>
        </div>
      </div>
    </AppShell>
  );
}

