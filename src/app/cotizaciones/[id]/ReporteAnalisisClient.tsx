"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/components/ui/cn";

/* ───────────────────────── Tipos del payload ───────────────────────── */

export type AgencyTone = "blue" | "cyan" | "gold" | "green" | "violet";

export type ReporteAnalisisData = {
  id: string;
  reportCode: string; // ej. "#COMEX-8829-CN"
  mode: "quote" | "budget";
  stage: string;
  createdAtISO: string;
  pdfHref: string;
  whatsappHref: string;

  product: {
    title: string;
    subtitle?: string;
    imageUrl: string | null;
  };

  ncm: {
    code: string; // "8704.21.10.100V" | "—"
    description: string;
  };

  agencyTags: Array<{ name: string; tone: AgencyTone }>;

  cost: {
    arrivedUsd: number | null;
    label: string; // "Costo Estimado Arribado"
  };

  requirements: Array<{
    title: string;
    description: string;
    icon: string;
    accent: "amber" | "blue" | "green" | "violet" | "muted";
  }>;

  taxes: Array<{
    label: string;
    pct: number | null;
    highlight?: boolean;
  }>;
  taxTotalPct: number | null;
};

/* ───────────────────────── Utilidades de formato ───────────────────────── */

function fmtUsd(n: number | null) {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
    .format(n)
    .replace("US$", "USD");
}

function fmtPct(n: number | null) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(2)}%`;
}

const ACCENT_RING: Record<
  ReporteAnalisisData["requirements"][number]["accent"],
  string
> = {
  amber: "text-[var(--gold)] bg-[color:color-mix(in_oklab,var(--gold)_18%,transparent)] ring-[color:color-mix(in_oklab,var(--gold)_38%,transparent)]",
  blue: "text-[var(--blue)] bg-[color:color-mix(in_oklab,var(--blue)_16%,transparent)] ring-[color:color-mix(in_oklab,var(--blue)_38%,transparent)]",
  green: "text-[var(--green)] bg-[color:color-mix(in_oklab,var(--green)_18%,transparent)] ring-[color:color-mix(in_oklab,var(--green)_38%,transparent)]",
  violet: "text-[#a78bfa] bg-[rgba(167,139,250,0.16)] ring-[rgba(167,139,250,0.36)]",
  muted: "text-muted bg-[var(--surface-2)] ring-subtle",
};

const AGENCY_BADGE: Record<AgencyTone, string> = {
  blue: "border-[color:color-mix(in_oklab,var(--blue)_40%,transparent)] bg-[color:color-mix(in_oklab,var(--blue)_18%,transparent)] text-[color:color-mix(in_oklab,var(--blue)_82%,white_10%)]",
  cyan: "border-[color:color-mix(in_oklab,var(--cyan)_40%,transparent)] bg-[color:color-mix(in_oklab,var(--cyan)_16%,transparent)] text-[color:color-mix(in_oklab,var(--cyan)_82%,white_10%)]",
  gold: "border-[color:color-mix(in_oklab,var(--gold)_40%,transparent)] bg-[color:color-mix(in_oklab,var(--gold)_16%,transparent)] text-[color:color-mix(in_oklab,var(--gold)_88%,white_10%)]",
  green: "border-[color:color-mix(in_oklab,var(--green)_40%,transparent)] bg-[color:color-mix(in_oklab,var(--green)_16%,transparent)] text-[color:color-mix(in_oklab,var(--green)_82%,white_10%)]",
  violet: "border-[rgba(167,139,250,0.36)] bg-[rgba(167,139,250,0.14)] text-[#c4b5fd]",
};

/* ───────────────────────── Toast simple ───────────────────────── */

type Toast = { id: number; tone: "ok" | "error"; text: string };

function Toaster({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto rounded-xl border px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur",
            t.tone === "ok"
              ? "border-[color:color-mix(in_oklab,var(--green)_40%,transparent)] bg-[color:color-mix(in_oklab,var(--green)_18%,transparent)] text-[color:color-mix(in_oklab,var(--green)_88%,white_10%)]"
              : "border-red-400/40 bg-red-500/15 text-red-100"
          )}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── Componente principal ───────────────────────── */

export function ReporteAnalisisClient({ data }: { data: ReporteAnalisisData }) {
  const [stage, setStage] = useState(data.stage);
  const [requesting, setRequesting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  function pushToast(tone: Toast["tone"], text: string) {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, tone, text }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share({
          title: `Reporte E-COMEX ${data.reportCode}`,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      pushToast("ok", "Link del reporte copiado al portapapeles");
    } catch {
      pushToast("error", "No pudimos compartir el link, copialo manualmente.");
    }
  }

  async function handleRequestFormalQuote() {
    if (requesting) return;
    if (stage === "decision_requested") {
      pushToast("ok", "Ya solicitaste la cotización formal — te vamos a contactar.");
      return;
    }
    setRequesting(true);
    try {
      const r = await fetch(`/api/quotes/${encodeURIComponent(data.id)}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "send_expert" }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok === false) {
        pushToast("error", j?.error ?? "No pudimos registrar la solicitud.");
        return;
      }
      setStage("decision_requested");
      pushToast(
        "ok",
        "Solicitud enviada — un especialista te va a contactar en breve."
      );
    } catch {
      pushToast("error", "Error de red. Intentá nuevamente.");
    } finally {
      setRequesting(false);
    }
  }

  const requestSent = stage === "decision_requested";

  return (
    <>
      {/* Breadcrumb */}
      <nav
        aria-label="Migas de pan"
        className="mb-6 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted"
      >
        <Link
          href="/account"
          className="transition-colors hover:text-strong"
        >
          Tablero
        </Link>
        <Icon name="chevron_right" size={12} className="text-ink-faint" />
        <Link
          href="/cotizaciones"
          className="transition-colors hover:text-strong"
        >
          Cotizaciones
        </Link>
        <Icon name="chevron_right" size={12} className="text-ink-faint" />
        <span className="text-strong">Reporte de Análisis</span>
      </nav>

      {/* Hero */}
      <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="primary" icon="auto_awesome" className="!tracking-[0.18em]">
              Verificado por IA
            </Badge>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
              ID de Reporte:{" "}
              <span className="text-strong">{data.reportCode}</span>
            </span>
          </div>
          <h1 className="mt-4 text-display text-[clamp(2rem,5vw,3.25rem)] text-strong">
            {data.product.title}
          </h1>
          <p className="mt-3 max-w-[640px] text-sm leading-relaxed text-muted sm:text-base">
            {data.product.subtitle ??
              "Análisis Inteligente de Factibilidad de Importación generado por IA"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href={data.pdfHref}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-subtle bg-[var(--surface-2)] px-5 text-sm font-bold text-strong transition-colors hover:bg-[var(--surface-3)]"
          >
            <Icon name="download" size={16} />
            Exportar PDF
          </a>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-subtle bg-[var(--surface-2)] px-5 text-sm font-bold text-strong transition-colors hover:bg-[var(--surface-3)]"
          >
            <Icon name="link" size={16} />
            Compartir
          </button>
        </div>
      </header>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* ── Columna izquierda: card grande ── */}
        <Card className="overflow-hidden p-0">
          <div className="grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)]">
            {/* Imagen */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--surface-1)] md:aspect-auto md:h-full">
              {data.product.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={data.product.imageUrl}
                  alt={data.product.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-muted">
                  <Icon name="image" size={28} />
                </div>
              )}
              {/* Sello premium abajo-izquierda */}
              <div className="absolute bottom-3 left-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em]",
                    AGENCY_BADGE.gold
                  )}
                >
                  <Icon name="verified" size={12} />
                  Resultado Premium
                </span>
              </div>
              {/* Gradiente inferior para que el sello se lea */}
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
                style={{
                  background:
                    "linear-gradient(180deg, transparent, rgba(0,0,0,0.55))",
                }}
                aria-hidden
              />
            </div>

            {/* Info NCM + tags */}
            <div className="flex flex-col gap-5 p-6 md:p-8">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[color:color-mix(in_oklab,var(--blue)_82%,white_10%)]">
                  Clasificación NCM
                </div>
                <div className="mt-2 font-mono text-[clamp(1.6rem,3vw,2.25rem)] font-extrabold tracking-tight text-strong">
                  {data.ncm.code}
                </div>
                <p className="mt-2 max-w-[460px] text-sm leading-relaxed text-muted">
                  {data.ncm.description}
                </p>
              </div>

              {data.agencyTags.length > 0 ? (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                    Organismos involucrados
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {data.agencyTags.map((t) => (
                      <span
                        key={t.name}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em]",
                          AGENCY_BADGE[t.tone]
                        )}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: "currentColor" }}
                          aria-hidden
                        />
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </Card>

        {/* ── Columna derecha: costo + CTAs + disclaimer ── */}
        <div className="space-y-4">
          <Card variant="solid" className="p-0">
            <div className="border-b border-subtle p-6">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                {data.cost.label}
              </div>
              <div className="mt-2 text-display text-[clamp(1.8rem,3vw,2.4rem)] text-strong">
                {fmtUsd(data.cost.arrivedUsd)}
              </div>
            </div>
            <div className="space-y-3 p-6">
              <button
                type="button"
                onClick={handleRequestFormalQuote}
                disabled={requesting || requestSent}
                className={cn(
                  "relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl border px-5 text-[12px] font-extrabold uppercase tracking-[0.18em] shadow-[var(--glow-gold)] transition-all duration-150 active:translate-y-[1px] disabled:pointer-events-none disabled:opacity-70",
                  requestSent
                    ? "border-[color:color-mix(in_oklab,var(--green)_40%,transparent)] bg-[color:color-mix(in_oklab,var(--green)_24%,transparent)] text-[color:color-mix(in_oklab,var(--green)_92%,white_10%)]"
                    : "border-[color:color-mix(in_oklab,var(--gold)_56%,white_8%)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--gold)_88%,white_10%),var(--gold))] text-[#0a0e14] hover:brightness-110"
                )}
              >
                {requesting ? (
                  <>
                    <Icon name="refresh" size={14} className="animate-spin" />
                    Enviando…
                  </>
                ) : requestSent ? (
                  <>
                    <Icon name="check_circle" size={14} />
                    Solicitud enviada
                  </>
                ) : (
                  <>
                    <Icon name="receipt_long" size={14} />
                    Pedir Cotización Formal
                  </>
                )}
              </button>
              <a
                href={data.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-subtle bg-[var(--surface-2)] px-5 text-sm font-bold text-strong transition-colors hover:bg-[var(--surface-3)]"
              >
                <Icon name="chat_bubble" size={16} />
                Hablar con asesor
              </a>
            </div>
          </Card>

          <Card className="border border-subtle bg-[color:color-mix(in_oklab,var(--surface-2)_88%,transparent)]">
            <div className="flex items-start gap-3 p-5">
              <Icon name="info" size={16} className="mt-0.5 shrink-0 text-muted" />
              <p className="text-[12px] leading-relaxed text-muted">
                Este análisis ha sido generado por el motor de IA de E-COMEX.
                La clasificación NCM es sugerida y debe ser validada por un
                despachante de aduana matriculado antes de realizar la operación.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom row */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Requisitos */}
        <Card>
          <CardHeader
            eyebrow="Requisitos"
            title="Requisitos de Importación"
            icon="verified_user"
          />
          <CardContent className="space-y-3">
            {data.requirements.length ? (
              data.requirements.map((r, i) => (
                <div
                  key={`${r.title}-${i}`}
                  className="flex items-start gap-4 rounded-2xl border border-subtle bg-[var(--surface-1)]/40 p-4"
                >
                  <div
                    className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1",
                      ACCENT_RING[r.accent]
                    )}
                  >
                    <Icon name={r.icon} size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-strong">{r.title}</div>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                      {r.description}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-subtle bg-[var(--surface-1)]/40 px-4 py-6 text-center text-sm text-muted">
                Sin requisitos específicos detectados para esta clasificación.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estructura impositiva */}
        <Card>
          <CardHeader
            eyebrow="Tributos"
            title="Estructura Impositiva"
            icon="calculate"
          />
          <CardContent>
            <div className="overflow-hidden rounded-2xl border border-subtle">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--surface-1)] text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                    <th className="px-5 py-3 text-left">Tasa</th>
                    <th className="px-5 py-3 text-right">Porcentaje</th>
                  </tr>
                </thead>
                <tbody>
                  {data.taxes.map((t, i) => (
                    <tr
                      key={`${t.label}-${i}`}
                      className="border-t border-subtle"
                    >
                      <td className="px-5 py-3 text-strong">{t.label}</td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-strong">
                        {fmtPct(t.pct)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-[color:color-mix(in_oklab,var(--gold)_42%,transparent)] bg-[color:color-mix(in_oklab,var(--gold)_10%,transparent)]">
                    <td className="px-5 py-3 text-sm font-extrabold text-strong">
                      Total Estimado
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-base font-extrabold text-[color:color-mix(in_oklab,var(--gold)_92%,white_10%)]">
                      {fmtPct(data.taxTotalPct)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11.5px] italic text-muted">
              *Los valores son estimativos y pueden variar según la condición
              fiscal del importador.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Footer pequeño tipo el del mockup */}
      <footer className="mt-12 border-t border-subtle pt-6">
        <div className="flex flex-col items-center justify-between gap-3 text-[12px] text-muted sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-white/5 px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-strong">
              E-COMEX Argentina
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/" className="hover:text-strong">
              Términos y Condiciones
            </Link>
            <Link href="/" className="hover:text-strong">
              Privacidad
            </Link>
            <span>Soporte 24/7</span>
          </div>
          <div>
            © {new Date(data.createdAtISO).getFullYear()} E-COMEX S.A.
          </div>
        </div>
      </footer>

      <Toaster toasts={toasts} />
    </>
  );
}
