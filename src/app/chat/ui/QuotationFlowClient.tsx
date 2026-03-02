"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/components/ui/cn";

type FlowMode = "quote" | "budget";

type QuoteCard = {
  label:
    | "Producto"
    | "Flete internacional"
    | "Impuestos argentinos"
    | "Gestión / despacho"
    | "Total puesto en Argentina"
    | "Tiempos estimados";
  value: string;
  detail?: string;
  highlight?: boolean;
};

type QuoteBreakdown = {
  qty: number;
  totalMinUsd: number;
  totalMaxUsd: number;
  fobTotalUsd: number;
  fleteMinUsd: number;
  fleteMaxUsd: number;
  seguroMinUsd: number;
  seguroMaxUsd: number;
  impuestosTotalMinUsd: number;
  impuestosTotalMaxUsd: number;
  gestionMinUsd: number;
  gestionMaxUsd: number;
};

type ServerResponse = {
  assistantMessage: string;
  cards?: QuoteCard[];
  productPreview?: {
    title?: string;
    imageUrl?: string;
    imageUrls?: string[];
    sourceUrl?: string;
    fobUsd?: number;
    currency?: string;
    price?: {
      type: string;
      min: number | null;
      max: number | null;
      currency: string;
      unit: string;
    };
    quantity?: number;
    origin?: string;
    supplier?: string;
    category?: string;
  };
  ncm?: string;
  quality?: number;
  assumptions?: Array<{
    id: string;
    label: string;
    value: string;
    source: "pcram" | "user" | "scraper" | "estimate";
    tone?: "muted" | "primary" | "gold" | "success";
  }>;
  breakdown?: QuoteBreakdown;
  analysis?: {
    stage?: string;
    normalizedTitle?: string;
    ncm?: string;
    ncmMeta?: { source?: string; confidence?: number | null; ambiguous?: boolean };
    pcram?: {
      title?: string;
      breadcrumbs?: string[];
      unit?: string;
      interventions?: string[];
      reclassifications?: Array<{ label: string; href: string }>;
    };
    timing?: { route?: string; minDays?: number; maxDays?: number };
    totals?: { totalMinUsd: number; totalMaxUsd: number };
    flags?: string[];
    quality?: number;
    questions?: string[];
  };
  requestContact?: boolean;
};

type Msg = { role: "user" | "assistant"; content: string };

function getOrCreateAnonId() {
  try {
    const key = "ecomex_anon_id";
    const existing = window.localStorage.getItem(key);
    if (existing && existing.length >= 12) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? (crypto as any).randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random()
            .toString(16)
            .slice(2)}`;
    window.localStorage.setItem(key, id);
    return id;
  } catch {
    return null;
  }
}

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtUsdRange(a: number, b: number) {
  return `${fmtUsd(a)} – ${fmtUsd(b)}`;
}

function InlineRichText({ text }: { text: string }) {
  const lines = String(text || "").split("\n");
  return (
    <div className="space-y-2 text-sm leading-7 text-white/85">
      {lines
        .map((l) => l.trimEnd())
        .filter((l, idx, arr) => !(l === "" && arr[idx - 1] === ""))
        .map((line, i) => {
          const isBullet = /^\s*-\s+/.test(line);
          return (
            <div key={i} className={cn(isBullet && "pl-4 text-white/80")}>
              {isBullet ? (
                <span className="-ml-4 mr-2 inline-block align-middle text-white/40">•</span>
              ) : null}
              <span className="whitespace-pre-wrap">{line.replace(/^\s*-\s+/, "")}</span>
            </div>
          );
        })}
    </div>
  );
}

function RiskBadge({ flags }: { flags: string[] }) {
  const f = new Set(flags);
  if (f.has("ncm_missing")) {
    return (
      <Badge tone="muted" icon="priority_high">
        Riesgo: NCM pendiente
      </Badge>
    );
  }
  if (f.has("ncm_ambiguous")) {
    return (
      <Badge tone="muted" icon="help">
        Riesgo: clasificación ambigua
      </Badge>
    );
  }
  if (f.has("pcram_unavailable")) {
    return (
      <Badge tone="muted" icon="wifi_off">
        Riesgo: PCRAM no disponible
      </Badge>
    );
  }
  return (
    <Badge tone="success" icon="verified_user">
      Riesgo: bajo (estimación)
    </Badge>
  );
}

export default function QuotationFlowClient({ initialMode }: { initialMode: FlowMode }) {
  const [mode, setMode] = useState<FlowMode>(initialMode);
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [data, setData] = useState<ServerResponse | null>(null);

  const [input, setInput] = useState("");
  const [qty, setQty] = useState<string>("");
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [origin, setOrigin] = useState("");
  const [shippingProfile, setShippingProfile] = useState<"" | "light" | "medium" | "heavy">("");
  const [budgetUsd, setBudgetUsd] = useState<string>("10000");

  const anonIdRef = useRef<string | null>(null);

  useEffect(() => {
    anonIdRef.current = getOrCreateAnonId();
  }, []);

  const pdfHref = useMemo(() => `/api/quote/pdf?mode=${encodeURIComponent(mode)}`, [mode]);

  const total = useMemo(() => {
    const b = data?.breakdown;
    if (b && typeof b.totalMinUsd === "number" && typeof b.totalMaxUsd === "number") {
      return fmtUsdRange(b.totalMinUsd, b.totalMaxUsd);
    }
    const t = data?.analysis?.totals;
    if (t && typeof t.totalMinUsd === "number" && typeof t.totalMaxUsd === "number") {
      return fmtUsdRange(t.totalMinUsd, t.totalMaxUsd);
    }
    const card = (data?.cards ?? []).find((c) => c.label === "Total puesto en Argentina");
    return card?.value ?? "—";
  }, [data]);

  const flags = useMemo(() => (Array.isArray(data?.analysis?.flags) ? data!.analysis!.flags! : []), [data]);

  const timing = useMemo(() => {
    const t = data?.analysis?.timing;
    if (t?.minDays && t?.maxDays) return `${t.minDays}–${t.maxDays} días`;
    const card = (data?.cards ?? []).find((c) => c.label === "Tiempos estimados");
    return card?.value ?? "—";
  }, [data]);

  async function submit() {
    if (pending) return;

    const baseText =
      mode === "budget"
        ? `Presupuesto: USD ${String(budgetUsd || "").trim()}`
        : String(input || "").trim();
    if (!baseText) return;

    const extra: string[] = [];
    const q = Number(String(qty || "").replace(/[^\d]/g, ""));
    const p = Number(String(unitPrice || "").replace(/[^\d.,]/g, "").replace(",", "."));
    if (mode === "quote") {
      if (Number.isFinite(q) && q > 0) extra.push(`Cantidad: ${q}`);
      if (Number.isFinite(p) && p > 0) extra.push(`Precio: USD ${p}`);
      if (origin.trim()) extra.push(`Origen: ${origin.trim()}`);
      if (shippingProfile) {
        extra.push(
          `Perfil carga: ${shippingProfile === "light" ? "liviana" : shippingProfile === "heavy" ? "pesada" : "media"}`
        );
      }
    }

    const userText = extra.length ? `${baseText}\n${extra.join("\n")}` : baseText;
    const nextMessages: Msg[] = [...messages, { role: "user", content: userText }];
    setMessages(nextMessages);
    setPending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(anonIdRef.current ? { "x-ecomex-anon": anonIdRef.current } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          mode,
          messages: nextMessages,
        }),
      });

      const json = (await res.json()) as ServerResponse;
      if (!res.ok) {
        throw new Error(json?.assistantMessage || "No se pudo procesar la solicitud.");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: json.assistantMessage }]);
      setData(json);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error inesperado. Reintentá.";
      setData({
        assistantMessage: msg,
        analysis: { stage: "error" },
      });
    } finally {
      setPending(false);
    }
  }

  const showSystemRequest =
    Boolean(data?.assistantMessage) &&
    (String(data?.analysis?.stage ?? "").startsWith("needs") || data?.requestContact === true);

  return (
    <div className="bg-app aurora min-h-[100dvh] text-strong">
      <header className="glass-nav sticky top-0 z-30 border-b border-subtle">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon name="dataset" size={18} className="text-current" />
              </div>
              <div className="flex flex-col leading-tight">
                <div className="text-sm font-extrabold tracking-tight">
                  E‑COMEX <span className="font-black text-primary">IA</span>
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                  Análisis de importación
                </div>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-subtle bg-[var(--surface)] p-1 text-[10px] sm:text-xs">
              <button
                type="button"
                className={cn(
                  "rounded-lg px-3 py-2 font-black uppercase tracking-wider text-muted transition-colors hover:text-strong",
                  mode === "quote" && "bg-[var(--surface2)] text-strong"
                )}
                onClick={() => {
                  setMode("quote");
                  setData(null);
                  setMessages([]);
                }}
              >
                Cotizar
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-lg px-3 py-2 font-black uppercase tracking-wider text-muted transition-colors hover:text-strong",
                  mode === "budget" && "bg-[var(--surface2)] text-strong"
                )}
                onClick={() => {
                  setMode("budget");
                  setData(null);
                  setMessages([]);
                }}
              >
                Presupuesto
              </button>
            </div>
            <ButtonLink href="/cotizaciones" variant="secondary" className="hidden sm:inline-flex">
              <Icon name="receipt_long" size={18} className="text-white/85" />
              Reportes
            </ButtonLink>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1280px] px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-6">
            <Card>
              <CardHeader
                eyebrow="ENTRADA"
                title={mode === "quote" ? "Detectar producto y disparar análisis" : "Estimación por presupuesto"}
                icon={mode === "quote" ? "open_in_new" : "tune"}
                right={
                  pending ? (
                    <Badge tone="muted" icon="bolt">
                      Procesando
                    </Badge>
                  ) : (
                    <Badge tone="primary" icon="calculate">
                      Sistema listo
                    </Badge>
                  )
                }
              />
              <CardContent className="space-y-4">
                {mode === "quote" ? (
                  <>
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Pegá el link del proveedor o describí el producto (marca, material, uso, modelo)."
                      className="min-h-[96px] w-full resize-none rounded-2xl border border-subtle bg-[var(--surface)] px-4 py-3 text-sm text-strong outline-none placeholder:text-muted/70 focus:border-[color:color-mix(in_oklab,var(--primary)_42%,white_8%)] focus:ring-2 focus:ring-[var(--ring)]"
                    />

                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="grid gap-2">
                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                          Cantidad (opcional)
                        </div>
                        <input
                          value={qty}
                          onChange={(e) => setQty(e.target.value)}
                          inputMode="numeric"
                          placeholder="100"
                          className="w-full rounded-xl border border-subtle bg-[var(--surface)] px-3 py-2.5 text-sm text-strong outline-none placeholder:text-muted/70 focus:border-[color:color-mix(in_oklab,var(--primary)_42%,white_8%)] focus:ring-2 focus:ring-[var(--ring)]"
                        />
                      </div>
                      <div className="grid gap-2">
                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                          Precio unitario USD (opcional)
                        </div>
                        <input
                          value={unitPrice}
                          onChange={(e) => setUnitPrice(e.target.value)}
                          inputMode="decimal"
                          placeholder="12.50"
                          className="w-full rounded-xl border border-subtle bg-[var(--surface)] px-3 py-2.5 text-sm text-strong outline-none placeholder:text-muted/70 focus:border-[color:color-mix(in_oklab,var(--primary)_42%,white_8%)] focus:ring-2 focus:ring-[var(--ring)]"
                        />
                      </div>
                      <div className="grid gap-2">
                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                          Origen (opcional)
                        </div>
                        <input
                          value={origin}
                          onChange={(e) => setOrigin(e.target.value)}
                          placeholder="China"
                          className="w-full rounded-xl border border-subtle bg-[var(--surface)] px-3 py-2.5 text-sm text-strong outline-none placeholder:text-muted/70 focus:border-[color:color-mix(in_oklab,var(--primary)_42%,white_8%)] focus:ring-2 focus:ring-[var(--ring)]"
                        />
                      </div>
                      <div className="grid gap-2">
                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                          Perfil carga (opcional)
                        </div>
                        <select
                          value={shippingProfile}
                          onChange={(e) => setShippingProfile(e.target.value as any)}
                          className="w-full rounded-xl border border-subtle bg-[var(--surface)] px-3 py-2.5 text-sm text-strong outline-none focus:border-[color:color-mix(in_oklab,var(--primary)_42%,white_8%)] focus:ring-2 focus:ring-[var(--ring)]"
                        >
                          <option value="">Auto</option>
                          <option value="light">Liviana</option>
                          <option value="medium">Media</option>
                          <option value="heavy">Pesada</option>
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-2">
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                        Presupuesto (USD)
                      </div>
                      <input
                        value={budgetUsd}
                        onChange={(e) => setBudgetUsd(e.target.value)}
                        inputMode="numeric"
                        placeholder="10000"
                      className="w-full rounded-xl border border-subtle bg-[var(--surface)] px-4 py-3 text-sm text-strong outline-none placeholder:text-muted/70 focus:border-[color:color-mix(in_oklab,var(--primary)_42%,white_8%)] focus:ring-2 focus:ring-[var(--ring)]"
                      />
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                      <div className="text-xs leading-relaxed text-muted">
                        El sistema propone rangos y tipos de producto “importables” para ese presupuesto, con foco en
                        minimizar fricción aduanera.
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <Icon name="verified_user" size={16} className="text-white/70" />
                    Salida estructurada (no conversación): producto → NCM → requisitos → costos → timing.
                  </div>
                  <div className="flex gap-2">
                    <Button
                      disabled={pending}
                      onClick={() => void submit()}
                      className="h-11 px-6"
                    >
                      <Icon name="bolt" size={18} className="text-white/90" />
                      {pending ? "Analizando…" : "Analizar"}
                    </Button>
                    <ButtonLink href={pdfHref} variant="secondary" className="h-11 px-5">
                      <Icon name="download" size={18} className="text-white/85" />
                      PDF
                    </ButtonLink>
                  </div>
                </div>
              </CardContent>
            </Card>

            <AnimatePresence initial={false}>
              {showSystemRequest ? (
                <motion.div
                  key="system"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  <Card className="border-white/10 bg-white/5">
                    <CardHeader
                      eyebrow="SISTEMA"
                      title="Entrada adicional requerida"
                      icon="support_agent"
                      right={
                        <Badge tone="muted" icon="help">
                          Acción requerida
                        </Badge>
                      }
                    />
                    <CardContent>
                      <InlineRichText text={data?.assistantMessage ?? ""} />
                    </CardContent>
                  </Card>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {pending ? (
                <motion.div
                  key="pending"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="grid gap-4 md:grid-cols-2"
                >
                  {["Producto", "Clasificación", "Requisitos", "Costos"].map((t) => (
                    <div
                      key={t}
                      className="glass-panel rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    >
                      <div className="h-3 w-28 animate-pulse rounded bg-white/10" />
                      <div className="mt-4 h-7 w-3/4 animate-pulse rounded bg-white/10" />
                      <div className="mt-3 h-3 w-5/6 animate-pulse rounded bg-white/10" />
                    </div>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {data && !pending ? (
                <motion.div
                  key="output"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.24, ease: "easeOut" }}
                  className="space-y-6"
                >
                  <div className="grid gap-6 md:grid-cols-12">
                    <div className="md:col-span-7">
                      <Card className="border-white/10 bg-white/5">
                        <CardHeader
                          eyebrow="PRODUCTO"
                          title={data.productPreview?.title ?? data.analysis?.normalizedTitle ?? "Producto detectado"}
                          icon="inventory_2"
                          right={
                            data.productPreview?.sourceUrl ? (
                              <a
                                href={data.productPreview.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/80 hover:bg-white/10"
                              >
                                <Icon name="open_in_new" size={14} className="text-white/70" />
                                Fuente
                              </a>
                            ) : (
                              <Badge tone="muted" icon="link">
                                Sin URL
                              </Badge>
                            )
                          }
                        />
                        <CardContent className="space-y-4">
                          <div className="flex items-start gap-4">
                            <div className="h-20 w-20 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                              {data.productPreview?.imageUrl ? (
                                <img
                                  src={data.productPreview.imageUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-white/50">
                                  <Icon name="image" size={22} className="text-white/40" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-black uppercase tracking-[0.22em] text-muted">
                                Descripción normalizada
                              </div>
                              <div className="mt-2 text-sm font-extrabold tracking-tight text-white/95">
                                {data.analysis?.normalizedTitle ?? "—"}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {data.productPreview?.origin ? (
                                  <Badge tone="muted" icon="public">
                                    Origen: {data.productPreview.origin}
                                  </Badge>
                                ) : null}
                                {typeof data.productPreview?.quantity === "number" ? (
                                  <Badge tone="muted" icon="tag">
                                    Cantidad: {data.productPreview.quantity}
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="md:col-span-5 space-y-6">
                      <Card className="border-white/10 bg-white/5">
                        <CardHeader
                          eyebrow="CLASIFICACIÓN"
                          title="NCM + confianza"
                          icon="gavel"
                          right={
                            typeof data.analysis?.ncmMeta?.confidence === "number" ? (
                              <Badge tone="primary" icon="psychology">
                                Confianza {Math.round((data.analysis!.ncmMeta!.confidence as number) * 100)}%
                              </Badge>
                            ) : (
                              <Badge tone="muted" icon="help">
                                Confianza —
                              </Badge>
                            )
                          }
                        />
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-2xl font-black tracking-tight text-white">
                              {data.ncm ?? data.analysis?.ncm ?? "—"}
                            </div>
                            <div className="text-xs font-bold uppercase tracking-widest text-muted">
                              {data.analysis?.ncmMeta?.source ? `Fuente: ${data.analysis.ncmMeta.source}` : "Fuente: —"}
                            </div>
                          </div>

                          {data.analysis?.pcram?.title ? (
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                              {data.analysis.pcram.title}
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>

                      <Card className="border-white/10 bg-white/5">
                        <CardHeader
                          eyebrow="REQUISITOS"
                          title="Intervenciones / regulaciones"
                          icon="verified_user"
                          right={
                            Array.isArray(data.analysis?.pcram?.interventions) &&
                            data.analysis!.pcram!.interventions!.length ? (
                              <Badge tone="success" icon="check_circle">
                                Detectado
                              </Badge>
                            ) : (
                              <Badge tone="muted" icon="help">
                                A confirmar
                              </Badge>
                            )
                          }
                        />
                        <CardContent className="space-y-3">
                          {Array.isArray(data.analysis?.pcram?.interventions) &&
                          data.analysis!.pcram!.interventions!.length ? (
                            <div className="grid gap-2">
                              {data.analysis!.pcram!.interventions!.slice(0, 10).map((x, i) => (
                                <div
                                  key={`${x}-${i}`}
                                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                                >
                                  {x}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm leading-7 text-muted">
                              Sin señales oficiales aún para este caso. El sistema puede pedir datos técnicos para
                              resolver NCM y requisitos.
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <Card className="border-white/10 bg-white/5">
                    <CardHeader
                      eyebrow="COSTOS"
                      title="Desglose (cards) + trazabilidad"
                      icon="receipt_long"
                      right={
                        data.cards?.length ? (
                          <a
                            href={pdfHref}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/90 transition-colors hover:bg-white/10"
                          >
                            <Icon name="download" size={18} className="text-white/85" />
                            PDF
                          </a>
                        ) : null
                      }
                    />
                    <CardContent className="space-y-4">
                      {Array.isArray(data.cards) && data.cards.length ? (
                        <div className="grid gap-3 md:grid-cols-3">
                          {data.cards.map((c) => (
                            <div
                              key={c.label}
                              className={cn(
                                "rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
                                c.highlight && "border-primary/25 bg-primary/10"
                              )}
                            >
                              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                                {c.label}
                              </div>
                              <div
                                className={cn(
                                  "mt-2 text-lg font-black tracking-tight text-white",
                                  c.label === "Total puesto en Argentina" && "wow-total text-[color:var(--color-gold)]"
                                )}
                              >
                                {c.value}
                              </div>
                              {c.detail ? (
                                <div className="mt-2 text-xs leading-relaxed text-muted">{c.detail}</div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm leading-7 text-muted">Todavía no hay desglose para mostrar.</div>
                      )}

                      {data.breakdown ? (
                        <div className="grid gap-3 md:grid-cols-4">
                          {[
                            { k: "FOB", v: fmtUsd(data.breakdown.fobTotalUsd) },
                            { k: "Flete", v: fmtUsdRange(data.breakdown.fleteMinUsd, data.breakdown.fleteMaxUsd) },
                            { k: "Impuestos", v: fmtUsdRange(data.breakdown.impuestosTotalMinUsd, data.breakdown.impuestosTotalMaxUsd) },
                            { k: "Gestión", v: fmtUsdRange(data.breakdown.gestionMinUsd, data.breakdown.gestionMaxUsd) },
                          ].map((x) => (
                            <div
                              key={x.k}
                              className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                            >
                              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                                {x.k}
                              </div>
                              <div className="mt-2 text-sm font-extrabold text-white/90">{x.v}</div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>

                  <Card className="border-white/10 bg-white/5">
                    <CardHeader eyebrow="LOGÍSTICA" title="Timing y próxima acción" icon="directions_boat" />
                    <CardContent className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                          Tiempo estimado
                        </div>
                        <div className="mt-2 text-sm font-extrabold text-white/90">{timing}</div>
                        <div className="mt-2 text-xs leading-relaxed text-muted">
                          Incluye origen, consolidación, tránsito y aduana (rango típico).
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                          Próximo paso
                        </div>
                        <div className="mt-2 text-sm font-extrabold text-white/90">
                          Afinar supuestos
                        </div>
                        <div className="mt-2 text-xs leading-relaxed text-muted">
                          Origen + perfil de carga + ficha técnica reducen error de impuestos y flete.
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                          Exportación
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <ButtonLink href={pdfHref} variant="secondary" className="h-10 px-4 text-xs">
                            <Icon name="download" size={16} className="text-white/85" />
                            PDF
                          </ButtonLink>
                          <ButtonLink href="/cotizaciones" variant="secondary" className="h-10 px-4 text-xs">
                            <Icon name="open_in_new" size={16} className="text-white/85" />
                            Reporte
                          </ButtonLink>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <aside className="lg:sticky lg:top-24">
            <div className="space-y-4">
              <div className="glass-panel rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                      Total estimado
                    </div>
                    <div className="mt-2 text-2xl font-black tracking-tight text-[color:var(--color-gold)]">
                      {total}
                    </div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <Icon name="calculate" size={18} className="text-white/80" />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <RiskBadge flags={flags} />
                  <Badge tone="muted" icon="directions_boat">
                    Timing: {timing}
                  </Badge>
                </div>
              </div>

              <div className="glass-panel rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                  Acciones
                </div>
                <div className="mt-3 grid gap-2">
                  <ButtonLink href={pdfHref} variant="primary" className="h-11">
                    <Icon name="download" size={18} className="text-white/90" />
                    Descargar PDF profesional
                  </ButtonLink>
                  <ButtonLink href="/account" variant="secondary" className="h-11">
                    <Icon name="dashboard" size={18} className="text-white/85" />
                    Ver historial / tablero
                  </ButtonLink>
                  <ButtonLink href="/interno" variant="secondary" className="h-11">
                    <Icon name="support_agent" size={18} className="text-white/85" />
                    Panel Operador
                  </ButtonLink>
                </div>
                <div className="mt-3 text-xs leading-relaxed text-muted">
                  El sistema entrega una estimación orientativa. La validación final (NCM/requisitos) se afina con datos
                  técnicos y documentación.
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

