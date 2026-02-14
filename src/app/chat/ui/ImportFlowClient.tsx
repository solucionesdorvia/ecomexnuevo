"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Metric } from "@/components/ui/Metric";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { SealVerified } from "@/components/ui/SealVerified";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/components/ui/cn";

type ChatMode = "quote" | "budget";
type Role = "user" | "assistant";

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
  nextHint?: string;
  requestContact?: boolean;
};

type Message = {
  id: string;
  role: Role;
  content: string;
  ts: number;
};

type ModuleKey =
  | "entry"
  | "product"
  | "normalized"
  | "classification"
  | "requirements"
  | "costs"
  | "timeline"
  | "pdf";

type ModuleState = "idle" | "processing" | "ready" | "attention";

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

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

function pickCard(cards: QuoteCard[] | null, label: QuoteCard["label"]) {
  return (cards ?? []).find((c) => c.label === label) ?? null;
}

function prefersReducedMotion() {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  } catch {
    return false;
  }
}

function FlowModule({
  state,
  title,
  eyebrow,
  icon,
  right,
  children,
}: {
  state: ModuleState;
  title: string;
  eyebrow?: string;
  icon?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const reduced = typeof window !== "undefined" ? prefersReducedMotion() : true;
  const pulse =
    state === "processing" && !reduced
      ? { boxShadow: ["0 0 0 rgba(15,73,189,0.0)", "0 0 22px rgba(15,73,189,0.18)", "0 0 0 rgba(15,73,189,0.0)"] }
      : undefined;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
      animate={{
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        ...(pulse ? pulse : {}),
      }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      <Card className="module-surface">
        <CardHeader
          eyebrow={eyebrow}
          title={title}
          icon={icon}
          right={
            <div className="flex items-center gap-2">
              {state === "processing" ? (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                  <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-primary" />
                  Procesando
                </div>
              ) : state === "attention" ? (
                <Badge tone="muted" icon="info">
                  Requiere dato
                </Badge>
              ) : state === "ready" ? (
                <Badge tone="success" icon="check_circle">
                  Listo
                </Badge>
              ) : (
                <Badge tone="muted" icon="hourglass_empty">
                  En espera
                </Badge>
              )}
              {right}
            </div>
          }
        />
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  );
}

function InputArea({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");
  return (
    <div className="grid gap-3">
      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
            Entrada
          </div>
          <div className="hidden items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted md:flex">
            <span className="material-symbols-outlined text-[14px]">link</span>
            Link o descripción
          </div>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit(text);
              setText("");
            }
          }}
          placeholder="Pegá un link (Alibaba, 1688, Amazon) o describí el producto. Ej: “auto elevador eléctrico 3T, USD 4.180, x1”."
          className="mt-3 h-24 w-full resize-none rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-muted/60 outline-none focus:border-primary/50"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted">
            Enter envía • Shift+Enter nueva línea
          </div>
          <Button
            variant="primary"
            disabled={pending || text.trim().length < 4}
            onClick={() => {
              onSubmit(text);
              setText("");
            }}
            className="h-10"
          >
            Iniciar análisis
            <span className="material-symbols-outlined text-[18px]">bolt</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ImportFlowClient({ initialMode }: { initialMode: ChatMode }) {
  const [mode, setMode] = useState<ChatMode>(initialMode);
  const [pending, setPending] = useState(false);

  // We still talk to the backend as a conversation (state machine),
  // but the UI is rendered as an analysis flow (modules), not chat bubbles.
  const [messages, setMessages] = useState<Message[]>([]);
  const [assistantNote, setAssistantNote] = useState<string | null>(null);

  const [productPreview, setProductPreview] = useState<ServerResponse["productPreview"] | null>(
    null
  );
  const [cards, setCards] = useState<QuoteCard[] | null>(null);
  const [ncm, setNcm] = useState<string | null>(null);
  const [quality, setQuality] = useState<number | null>(null);

  const anonIdRef = useRef<string | null>(null);
  const [anonId, setAnonId] = useState<string | null>(null);

  useEffect(() => {
    const v = getOrCreateAnonId();
    anonIdRef.current = v;
    setAnonId(v);
  }, []);

  useEffect(() => {
    // Keep a minimal assistant note in history so the backend can infer stage.
    if (messages.length) return;
    const seed =
      mode === "budget"
        ? "Modo presupuesto: definí un presupuesto en USD y restricciones."
        : "Modo cotización: pegá un link o describí el producto.";
    setMessages([{ id: uid(), role: "assistant", content: seed, ts: Date.now() }]);
  }, [mode, messages.length]);

  const pdfHref = useMemo(() => {
    const base = `/api/quote/pdf?mode=${encodeURIComponent(mode)}`;
    return anonId ? `${base}&anon=${encodeURIComponent(anonId)}` : base;
  }, [anonId, mode]);

  const summaryTotal = useMemo(() => pickCard(cards, "Total puesto en Argentina")?.value ?? "—", [cards]);
  const summaryTiming = useMemo(() => pickCard(cards, "Tiempos estimados")?.value ?? "—", [cards]);
  const summaryImpuestos = useMemo(
    () => pickCard(cards, "Impuestos argentinos")?.value ?? "—",
    [cards]
  );

  const hasQuote = Boolean((cards ?? []).length);

  const moduleStates = useMemo<Record<ModuleKey, ModuleState>>(() => {
    const base: Record<ModuleKey, ModuleState> = {
      entry: "ready",
      product: productPreview ? "ready" : pending ? "processing" : "idle",
      normalized: productPreview ? "ready" : pending ? "processing" : "idle",
      classification: ncm || quality != null ? "ready" : pending ? "processing" : "idle",
      requirements: pending ? "processing" : productPreview ? "attention" : "idle",
      costs: hasQuote ? "ready" : assistantNote ? "attention" : pending ? "processing" : "idle",
      timeline: hasQuote ? "ready" : pending ? "processing" : "idle",
      pdf: hasQuote ? "ready" : "idle",
    };
    return base;
  }, [assistantNote, hasQuote, ncm, pending, productPreview, quality]);

  async function sendUserInput(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    setPending(true);
    setAssistantNote(null);
    setCards(null);
    setNcm(null);
    setQuality(null);

    const userMsg: Message = { id: uid(), role: "user", content: trimmed, ts: Date.now() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);

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
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const json = (await res.json()) as ServerResponse;
      if (!res.ok) throw new Error(json?.assistantMessage || "Error procesando la solicitud.");

      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "assistant", content: json.assistantMessage, ts: Date.now() },
      ]);

      setAssistantNote(json.assistantMessage || null);
      if (json.productPreview) setProductPreview(json.productPreview);
      if (json.cards?.length) setCards(json.cards);
      if (typeof json.ncm === "string" && json.ncm.trim()) setNcm(json.ncm.trim());
      if (typeof json.quality === "number" && Number.isFinite(json.quality)) setQuality(json.quality);
    } catch (e) {
      setAssistantNote(e instanceof Error ? e.message : "Error inesperado.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-[100dvh] infra-surface text-white selection:bg-primary/30">
      <div className="pointer-events-none fixed inset-0 infra-grid-overlay" />

      <header className="glass-nav sticky top-0 z-30 border-b border-white/5">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
              <span className="material-symbols-outlined text-primary">local_shipping</span>
            </div>
            <div className="min-w-0">
              <div className="text-base font-black tracking-tight">E‑COMEX</div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                Infraestructura de importación
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-emerald-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300 md:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Sistema en línea
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1 text-[10px] font-black uppercase tracking-[0.2em]">
              <button
                type="button"
                className={cn(
                  "rounded-md px-3 py-2 text-muted transition-colors hover:text-white",
                  mode === "quote" && "bg-white/10 text-white"
                )}
                onClick={() => {
                  setMode("quote");
                  setProductPreview(null);
                  setCards(null);
                  setAssistantNote(null);
                  setMessages([]);
                }}
              >
                Cotización
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-md px-3 py-2 text-muted transition-colors hover:text-white",
                  mode === "budget" && "bg-white/10 text-white"
                )}
                onClick={() => {
                  setMode("budget");
                  setProductPreview(null);
                  setCards(null);
                  setAssistantNote(null);
                  setMessages([]);
                }}
              >
                Presupuesto
              </button>
            </div>
            <ButtonLink href={pdfHref} variant="secondary" className="h-10 px-4">
              Reporte
              <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            </ButtonLink>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-[72px_minmax(0,1fr)_420px]">
        {/* Left minimal navigation */}
        <aside className="hidden lg:block">
          <div className="sticky top-[92px] grid gap-2">
            {[
              { href: "/", icon: "home", label: "Inicio" },
              { href: "/chat", icon: "bolt", label: "Análisis" },
              { href: "/cotizaciones", icon: "receipt_long", label: "Reportes" },
              { href: "/tendencias", icon: "trending_up", label: "Señales" },
              { href: "/account", icon: "person", label: "Cuenta" },
            ].map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="group flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted transition-colors hover:bg-white/10 hover:text-white"
                aria-label={n.label}
              >
                <span className="material-symbols-outlined">{n.icon}</span>
              </Link>
            ))}
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                Transporte
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs font-extrabold">
                <span className="material-symbols-outlined text-primary text-[18px]">
                  directions_boat
                </span>
                Marítimo
              </div>
            </div>
          </div>
        </aside>

        {/* Center analysis flow */}
        <main className="space-y-4">
          <FlowModule
            state={moduleStates.entry}
            title="Entrada"
            eyebrow="Operación"
            icon="input"
            right={<SealVerified label="Motor" />}
          >
            <InputArea pending={pending} onSubmit={sendUserInput} />
          </FlowModule>

          <AnimatePresence initial={false}>
            <FlowModule
              key="product"
              state={moduleStates.product}
              title="Producto detectado"
              eyebrow="Fuente"
              icon="deployed_code"
            >
              {!productPreview && pending ? (
                <div className="grid gap-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : productPreview ? (
                <div className="grid gap-4 md:grid-cols-[140px_minmax(0,1fr)]">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    {productPreview.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={productPreview.imageUrl}
                        alt={productPreview.title || "Producto"}
                        className="h-28 w-full rounded-lg object-contain"
                      />
                    ) : (
                      <div className="flex h-28 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-xs text-muted">
                        Sin imagen
                      </div>
                    )}
                    <div className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                      Proveedor
                    </div>
                    <div className="mt-1 truncate text-xs font-extrabold text-white">
                      {productPreview.supplier || "—"}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-black tracking-tight text-white">
                      {productPreview.title || "Producto"}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {productPreview.category ? (
                        <Badge tone="muted" icon="category">
                          {productPreview.category}
                        </Badge>
                      ) : null}
                      {productPreview.origin ? (
                        <Badge tone="muted" icon="flag">
                          {productPreview.origin}
                        </Badge>
                      ) : null}
                      {typeof productPreview.fobUsd === "number" ? (
                        <Badge tone="primary" icon="attach_money">
                          FOB detectado
                        </Badge>
                      ) : null}
                      {typeof productPreview.quantity === "number" ? (
                        <Badge tone="muted" icon="numbers">
                          Cantidad {productPreview.quantity}
                        </Badge>
                      ) : null}
                    </div>
                    {productPreview.sourceUrl ? (
                      <div className="mt-3 text-xs text-muted">
                        <a
                          className="underline decoration-white/20 underline-offset-4 hover:text-white"
                          href={productPreview.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Ver fuente
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted">Esperando entrada.</div>
              )}
            </FlowModule>

            <FlowModule
              key="normalized"
              state={moduleStates.normalized}
              title="Descripción normalizada"
              eyebrow="Normalización"
              icon="tune"
            >
              {productPreview ? (
                <div className="text-sm leading-7 text-muted">
                  {productPreview.title ? (
                    <>
                      <span className="text-white/90">Nombre:</span> {productPreview.title}
                      <br />
                    </>
                  ) : null}
                  <span className="text-white/90">Estructura:</span> categoría → uso → unidad → proveedor.
                  <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3 text-xs">
                    Este bloque está listo para integrarse con un normalizador del backend (atributos,
                    materiales, medidas, compatibilidades).
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted">—</div>
              )}
            </FlowModule>

            <FlowModule
              key="classification"
              state={moduleStates.classification}
              title="Clasificación aduanera (NCM)"
              eyebrow="Arancel"
              icon="gavel"
              right={
                quality != null ? (
                  <div className="flex items-center gap-2">
                    <ProgressRing value={Math.max(0, Math.min(100, Math.round(quality * 100)))} />
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                      Calidad
                    </div>
                  </div>
                ) : null
              }
            >
              {ncm ? (
                <div className="grid gap-3">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-muted">
                    Código
                  </div>
                  <div className="text-2xl font-black tracking-tight text-white">{ncm}</div>
                  <div className="text-sm leading-7 text-muted">
                    Se valida con datos técnicos, origen y uso. Si el proveedor está bloqueando la
                    página, puede requerir confirmación manual.
                  </div>
                </div>
              ) : pending ? (
                <div className="grid gap-3">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <div className="text-sm text-muted">Se determinará a partir del contenido y/o preguntas mínimas.</div>
              )}
            </FlowModule>

            <FlowModule
              key="requirements"
              state={moduleStates.requirements}
              title="Requisitos e intervenciones"
              eyebrow="Regulatorio"
              icon="fact_check"
            >
              <div className="grid gap-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                    Señales de riesgo
                  </div>
                  <div className="mt-2 text-sm font-extrabold text-white">
                    {productPreview ? "Pendiente de verificación" : "—"}
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-muted">
                    Este módulo queda fijo y se completa con el backend (certificaciones,
                    restricciones, usados, etiquetado, etc).
                  </div>
                </div>
                {assistantNote ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                      Solicitud del sistema
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-white/90">
                      {assistantNote}
                    </div>
                  </div>
                ) : null}
              </div>
            </FlowModule>

            <FlowModule
              key="costs"
              state={moduleStates.costs}
              title="Costos y desglose"
              eyebrow="Landed cost"
              icon="receipt_long"
              right={hasQuote ? <SealVerified label="Reporte listo" /> : null}
            >
              {hasQuote ? (
                <div className="grid gap-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <Metric label="Total" value={summaryTotal} tone="gold" icon="paid" />
                    <Metric label="Impuestos" value={summaryImpuestos} tone="primary" icon="account_balance" />
                    <Metric label="Timing" value={summaryTiming} tone="muted" icon="schedule" />
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                      Componentes
                    </div>
                    <div className="mt-3 grid gap-2">
                      {(cards ?? []).map((c, idx) => (
                        <div
                          key={`${c.label}-${idx}`}
                          className="flex items-start justify-between gap-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                        >
                          <div className="text-xs font-extrabold text-white">{c.label}</div>
                          <div className={cn("text-xs font-black", c.highlight ? "gold-gradient-text" : "text-muted")}>
                            {c.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : pending ? (
                <div className="grid gap-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                <div className="text-sm text-muted">
                  Este módulo se materializa cuando el sistema tiene precio/cantidad y clasificación suficiente.
                </div>
              )}
            </FlowModule>

            <FlowModule
              key="timeline"
              state={moduleStates.timeline}
              title="Timeline & logística"
              eyebrow="Operación"
              icon="timeline"
            >
              {hasQuote ? (
                <div className="grid gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                      Estimación
                    </div>
                    <div className="mt-2 text-lg font-black tracking-tight text-white">
                      {summaryTiming}
                    </div>
                    <div className="mt-2 text-xs leading-relaxed text-muted">
                      Incluye tránsito marítimo + ventanas operativas. Se ajusta con puerto, consolidación y temporada.
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                      Próxima salida (estimada)
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="text-sm font-extrabold text-white">12–18 días</div>
                      <Badge tone="muted" icon="science">
                        Simulado
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted">—</div>
              )}
            </FlowModule>

            {hasQuote ? (
              <FlowModule
                key="pdf"
                state={moduleStates.pdf}
                title="Reporte (PDF)"
                eyebrow="Materialización"
                icon="picture_as_pdf"
                right={
                  <ButtonLink href={pdfHref} variant="secondary" className="h-9 px-3 text-xs">
                    Abrir
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  </ButtonLink>
                }
              >
                <div className="grid gap-3">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-2">
                    <div className="aspect-[297/210] w-full overflow-hidden rounded-lg bg-black/40">
                      <iframe
                        title="Reporte PDF"
                        src={pdfHref}
                        className="h-full w-full"
                      />
                    </div>
                  </div>
                  <div className="text-xs leading-relaxed text-muted">
                    El PDF es la salida final del análisis. Se actualiza con los mismos supuestos de esta operación.
                  </div>
                </div>
              </FlowModule>
            ) : null}
          </AnimatePresence>
        </main>

        {/* Right sticky summary */}
        <aside className="lg:block">
          <div className="sticky top-[92px] space-y-4">
            <Card className="module-surface">
              <CardHeader eyebrow="Resumen" title="Costo puesto en Argentina" icon="paid" right={<SealVerified label="Automático" />} />
              <CardContent>
                <div className="grid gap-3">
                  <div className="rounded-xl border border-gold/20 bg-white/5 p-4 premium-glow">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                      Total estimado
                    </div>
                    <div className="mt-2 text-2xl font-black tracking-tight gold-gradient-text">
                      {summaryTotal}
                    </div>
                    <div className="mt-2 text-xs leading-relaxed text-muted">
                      Orientativo. La validación final requiere análisis técnico, regulatorio y operativo.
                    </div>
                  </div>
                  <div className="grid gap-3">
                    <Metric label="Timing" value={summaryTiming} icon="schedule" tone="muted" />
                    <Metric label="Riesgo" value={productPreview ? "En evaluación" : "—"} icon="shield" tone="primary" />
                    <Metric label="Calidad" value={quality != null ? `${Math.round(quality * 100)}%` : "—"} icon="analytics" tone="muted" />
                  </div>
                  <div className="grid gap-2">
                    <ButtonLink href={pdfHref} variant="primary" className="w-full">
                      Descargar reporte
                      <span className="material-symbols-outlined text-[18px]">download</span>
                    </ButtonLink>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                        Próximo paso
                      </div>
                      <div className="mt-2 text-sm font-extrabold text-white">
                        Validar con especialista
                      </div>
                      <div className="mt-2 text-xs leading-relaxed text-muted">
                        Evita sobrecostos por clasificación, requisitos o documentación.
                      </div>
                      <Button variant="secondary" className="mt-3 w-full">
                        Agendar consultoría
                        <span className="material-symbols-outlined text-[18px]">support_agent</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}

