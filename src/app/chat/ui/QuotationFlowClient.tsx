"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/components/ui/cn";
import { InputSourceSelector } from "@/components/analysis/InputSourceSelector";
import { ProductSnapshot } from "@/components/analysis/ProductSnapshot";
import { NormalizedDescriptionPanel } from "@/components/analysis/NormalizedDescriptionPanel";
import { NcmClassificationPanel } from "@/components/analysis/NcmClassificationPanel";
import { RequirementsPanel } from "@/components/analysis/RequirementsPanel";
import { QuoteBreakdownPanel } from "@/components/analysis/QuoteBreakdownPanel";
import { LogisticsTimeline } from "@/components/analysis/LogisticsTimeline";
import { PdfPreviewPanel } from "@/components/analysis/PdfPreviewPanel";
import { QuoteActionsBar } from "@/components/analysis/QuoteActionsBar";
import { BrandLogo } from "@/components/BrandLogo";

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

export default function QuotationFlowClient({
  initialMode,
  initialSource = "url",
}: {
  initialMode: FlowMode;
  initialSource?: "url" | "image" | "invoice" | "text";
}) {
  const [mode, setMode] = useState<FlowMode>(initialMode);
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [data, setData] = useState<ServerResponse | null>(null);

  const [input, setInput] = useState("");
  const [sourceType, setSourceType] = useState<"url" | "image" | "invoice" | "text">(initialSource);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([]);
  const [qty, setQty] = useState<string>("");
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [origin, setOrigin] = useState("");
  const [shippingProfile, setShippingProfile] = useState<"" | "light" | "medium" | "heavy">("");
  const [budgetUsd, setBudgetUsd] = useState<string>("10000");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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
        : String(input || "").trim() ||
          (sourceType === "image" && imageFile
            ? `[SOURCE_IMAGE] ${imageFile.name}`
            : sourceType === "invoice" && invoiceFiles.length > 0
              ? `[SOURCE_INVOICE] ${invoiceFiles.map((f) => f.name).join(", ")}`
              : "");
    if (!baseText) return;
    if (mode === "quote" && sourceType === "invoice" && invoiceFiles.length === 0 && !String(input || "").trim()) {
      return;
    }

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

    const useInvoiceMultipart =
      mode === "quote" && sourceType === "invoice" && invoiceFiles.length > 0;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          ...(useInvoiceMultipart
            ? {}
            : { "content-type": "application/json" }),
          ...(anonIdRef.current ? { "x-ecomex-anon": anonIdRef.current } : {}),
        },
        credentials: "include",
        body: useInvoiceMultipart
          ? (() => {
              const fd = new FormData();
              fd.set("json", JSON.stringify({ mode, messages: nextMessages }));
              for (const f of invoiceFiles) fd.append("invoice", f);
              return fd;
            })()
          : JSON.stringify({
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
      if (useInvoiceMultipart) setInvoiceFiles([]);
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
              <div className="rounded-lg bg-white px-2 py-1 shadow-sm">
                <BrandLogo className="h-6" />
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
                    <InputSourceSelector
                      sourceType={sourceType}
                      onSourceTypeChange={setSourceType}
                      sourceValue={input}
                      onSourceValueChange={setInput}
                      onImageSelected={setImageFile}
                      onInvoiceFilesSelected={(files) => setInvoiceFiles(files ?? [])}
                    />
                    {imageFile ? (
                      <div className="text-xs text-muted">Imagen seleccionada: {imageFile.name}</div>
                    ) : null}
                    {invoiceFiles.length > 0 ? (
                      <ul className="list-inside list-disc text-xs text-muted">
                        {invoiceFiles.map((f) => (
                          <li key={`${f.name}-${f.size}`}>{f.name}</li>
                        ))}
                      </ul>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => setShowAdvanced((v) => !v)}
                      className="inline-flex items-center gap-2 rounded-lg border border-subtle bg-[var(--surface)] px-3 py-2 text-xs font-bold text-muted hover:text-strong"
                    >
                      <Icon name={showAdvanced ? "expand_less" : "expand_more"} size={16} className="text-current" />
                      {showAdvanced ? "Ocultar campos opcionales" : "Mostrar campos opcionales"}
                    </button>

                    {showAdvanced ? (
                      <div className="grid gap-3 md:grid-cols-4">
                        <div className="grid gap-2">
                          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                            Cantidad
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
                            Precio unitario USD
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
                            Origen
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
                            Perfil carga
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
                    ) : null}
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
                  className="space-y-4"
                >
                  <Card>
                    <CardHeader
                      eyebrow="RESUMEN"
                      title={data.productPreview?.title ?? data.analysis?.normalizedTitle ?? "Resultado del análisis"}
                      icon="summarize"
                      right={
                        <div className="flex items-center gap-2">
                          <RiskBadge flags={flags} />
                          <Badge tone="neutral" icon="schedule">
                            {timing}
                          </Badge>
                        </div>
                      }
                    />
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="panel rounded-xl p-4">
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">Total estimado</div>
                          <div className="mt-1 text-xl font-black text-[color:var(--color-gold)]">{total}</div>
                        </div>
                        <div className="panel rounded-xl p-4">
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">NCM</div>
                          <div className="mt-1 text-sm font-extrabold text-strong">{data.ncm ?? data.analysis?.ncm ?? "A validar"}</div>
                        </div>
                        <div className="panel rounded-xl p-4">
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">Origen</div>
                          <div className="mt-1 text-sm font-extrabold text-strong">{data.productPreview?.origin ?? "No informado"}</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <ButtonLink href={pdfHref} variant="secondary" size="sm">
                          <Icon name="download" size={14} className="text-current" />
                          PDF
                        </ButtonLink>
                        <button
                          type="button"
                          onClick={() => setShowDetails((v) => !v)}
                          className="inline-flex h-9 items-center gap-2 rounded-xl border border-subtle bg-[var(--surface)] px-3 text-xs font-extrabold uppercase tracking-[0.14em] text-muted hover:text-strong"
                        >
                          <Icon name={showDetails ? "expand_less" : "expand_more"} size={14} className="text-current" />
                          {showDetails ? "Ocultar detalles" : "Ver detalles"}
                        </button>
                      </div>
                    </CardContent>
                  </Card>

                  {showDetails ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader eyebrow="DETALLE" title="Costos principales" icon="receipt_long" />
                        <CardContent className="space-y-2">
                          {(data.cards ?? []).slice(0, 4).map((c) => (
                            <div key={c.label} className="flex items-start justify-between gap-3 rounded-xl border border-subtle bg-[var(--surface)] px-3 py-2">
                              <span className="text-xs text-muted">{c.label}</span>
                              <span className="text-xs font-bold text-strong">{c.value}</span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader eyebrow="DETALLE" title="Requisitos" icon="verified_user" />
                        <CardContent className="space-y-2">
                          {Array.isArray(data.analysis?.pcram?.interventions) && data.analysis!.pcram!.interventions!.length ? (
                            data.analysis!.pcram!.interventions!.slice(0, 4).map((x, i) => (
                              <div key={`${x}-${i}`} className="rounded-xl border border-subtle bg-[var(--surface)] px-3 py-2 text-xs text-muted">
                                {x}
                              </div>
                            ))
                          ) : (
                            <div className="rounded-xl border border-subtle bg-[var(--surface)] px-3 py-2 text-xs text-muted">
                              No hay requisitos adicionales para mostrar en este paso.
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-2">
                    <ProductSnapshot data={data} />
                    <NormalizedDescriptionPanel text={data.analysis?.normalizedTitle ?? data.productPreview?.title ?? ""} />
                    <NcmClassificationPanel data={data} />
                    <RequirementsPanel data={data} />
                    <QuoteBreakdownPanel data={data} />
                    <LogisticsTimeline data={data} />
                    <PdfPreviewPanel href={pdfHref} />
                    <Card>
                      <CardHeader eyebrow="ACCIONES" title="Quote actions" icon="checklist" />
                      <CardContent>
                        <QuoteActionsBar pdfHref={pdfHref} />
                      </CardContent>
                    </Card>
                  </div>
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
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">Acciones rápidas</div>
                <div className="mt-3 grid gap-2">
                  <ButtonLink href={pdfHref} variant="primary" className="h-11">
                    <Icon name="download" size={18} className="text-white/90" />
                    Descargar PDF
                  </ButtonLink>
                  <ButtonLink href="/cotizaciones" variant="secondary" className="h-11">
                    <Icon name="receipt_long" size={18} className="text-white/85" />
                    Ver reportes
                  </ButtonLink>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

