"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { SealVerified } from "@/components/ui/SealVerified";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/Icon";
import { BrandLogo } from "@/components/BrandLogo";

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

function RichText({ text }: { text: string }) {
  // Minimal rich formatting: newlines + **bold** + `code`
  const lines = String(text || "").split("\n");

  const renderInline = (s: string) => {
    // Tokenize by `code` first, then **bold** inside non-code segments.
    const parts: React.ReactNode[] = [];
    const codeSplit = s.split(/(`[^`]+`)/g);
    for (let i = 0; i < codeSplit.length; i++) {
      const seg = codeSplit[i] ?? "";
      if (seg.startsWith("`") && seg.endsWith("`") && seg.length >= 2) {
        const code = seg.slice(1, -1);
        parts.push(
          <code
            key={`c-${i}`}
            className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[0.95em] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          >
            {code}
          </code>
        );
        continue;
      }
      const boldSplit = seg.split(/(\*\*[^*]+\*\*)/g);
      for (let j = 0; j < boldSplit.length; j++) {
        const b = boldSplit[j] ?? "";
        if (b.startsWith("**") && b.endsWith("**") && b.length >= 4) {
          parts.push(
            <strong key={`b-${i}-${j}`} className="font-extrabold text-white">
              {b.slice(2, -2)}
            </strong>
          );
        } else if (b) {
          parts.push(<span key={`t-${i}-${j}`}>{b}</span>);
        }
      }
    }
    return parts;
  };

  return (
    <div className="whitespace-pre-wrap">
      {lines.map((ln, idx) => (
        <div key={idx} className={idx ? "mt-2" : ""}>
          {renderInline(ln)}
        </div>
      ))}
    </div>
  );
}

function QuoteCards({
  cards,
  defaultExpandedLabel,
}: {
  cards: QuoteCard[];
  defaultExpandedLabel?: QuoteCard["label"];
}) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => ({}));

  useEffect(() => {
    if (!defaultExpandedLabel) return;
    setOpen((prev) => ({ ...prev, [defaultExpandedLabel]: true }));
  }, [defaultExpandedLabel]);

  return (
    <div className="space-y-3">
      {cards.map((c, idx) => {
        const key = `${c.label}-${idx}`;
        const isOpen = Boolean(open[c.label]);
        const isTotal = c.label === "Total puesto en Argentina";
        return (
          <div
            key={key}
            className={classNames(
              "rounded-xl border bg-white/5 transition-colors",
              c.highlight ? "border-primary/25 bg-primary/5" : "border-white/10",
              isTotal && c.highlight && "wow-total"
            )}
          >
            <button
              type="button"
              className="flex w-full items-start justify-between gap-4 p-4 text-left"
              onClick={() => setOpen((prev) => ({ ...prev, [c.label]: !isOpen }))}
              aria-expanded={isOpen}
            >
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted">
                  {c.label}
                </div>
                {isTotal ? (
                  <div className="mt-2">
                    <SealVerified />
                  </div>
                ) : null}
                <div
                  className={classNames(
                    "mt-2 break-words font-black tracking-tight",
                    c.highlight ? "text-2xl text-white" : "text-lg text-white"
                  )}
                >
                  {c.value}
                </div>
              </div>
              <span
                className={classNames(
                  "mt-1 text-muted transition-transform",
                  isOpen && "rotate-180"
                )}
              >
                <Icon name="expand_more" size={18} className="text-white/60" />
              </span>
            </button>
            {c.detail && isOpen ? (
              <div className="border-t border-white/10 px-4 pb-4 pt-3 text-xs leading-relaxed text-muted">
                {c.detail}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
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

function parseProductSnapshot(text: string) {
  const t = String(text || "");
  const title =
    t.match(/estimación operativa\*\* para:\s*([^\n.]+)/i)?.[1]?.trim() ||
    t.match(/estimación operativa para:\s*([^\n.]+)/i)?.[1]?.trim() ||
    undefined;
  const qty = t.match(/\*\*Cantidad\*\*:\s*([^\n]+)/i)?.[1]?.trim();
  const unit = t.match(/\*\*Precio unitario.*?\*\*:\s*([^\n]+)/i)?.[1]?.trim();
  const origin = t.match(/\*\*Origen\*\*:\s*([^\n]+)/i)?.[1]?.trim();
  return { title, qty, unit, origin };
}

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtUsdRange(a: number, b: number) {
  return `${fmtUsd(a)} – ${fmtUsd(b)}`;
}

function withUnit(s: string, unit?: string) {
  const u = String(unit ?? "").trim();
  if (!u) return s;
  return `${s} / ${u}`;
}

function BudgetPanel({
  pending,
  onSubmitBudget,
}: {
  pending: boolean;
  onSubmitBudget: (usd: number) => void;
}) {
  const [usd, setUsd] = useState(10_000);
  const presets = [3000, 5000, 10_000, 20_000, 50_000];
  return (
    <Card className="border-white/10 bg-white/5">
      <div className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
              Modo presupuesto
            </div>
            <div className="mt-1 flex items-center gap-2">
              <Icon name="tune" size={18} className="text-white/85" />
              <div className="text-sm font-extrabold tracking-tight text-white">
                Definí tu presupuesto objetivo
              </div>
            </div>
          </div>
          <SealVerified label="Motor IA" />
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="flex items-end justify-between gap-4">
            <div className="text-xs font-bold uppercase tracking-widest text-muted">
              Presupuesto (USD)
            </div>
            <div className="text-2xl font-black tracking-tight text-white">
              {usd.toLocaleString("en-US", { style: "currency", currency: "USD" })}
            </div>
          </div>
          <input
            type="range"
            min={1000}
            max={100000}
            step={500}
            value={usd}
            onChange={(e) => setUsd(Number(e.target.value))}
            className="mt-4 w-full accent-primary"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setUsd(p)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
                  usd === p
                    ? "border-primary/30 bg-primary/15 text-primary"
                    : "border-white/10 bg-white/5 text-muted hover:bg-white/10"
                )}
              >
                {p >= 1000 ? `${Math.round(p / 1000)}k` : p}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <Button
              variant="primary"
              disabled={pending}
              onClick={() => onSubmitBudget(usd)}
              className="w-full"
            >
              Analizar presupuesto
              <Icon name="bolt" size={18} className="text-white/90" />
            </Button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Te devuelvo 2–3 escenarios viables. Luego, si querés avanzar, lo validamos
            en consultoría.
          </p>
        </div>
      </div>
    </Card>
  );
}

function AssumptionsControls({
  disabled,
  onSetOrigin,
  onSetProfile,
}: {
  disabled: boolean;
  onSetOrigin: (origin: string) => void;
  onSetProfile: (profile: "light" | "medium" | "heavy") => void;
}) {
  const [origin, setOrigin] = useState("");
  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
        Ajustar supuestos
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs font-bold uppercase tracking-widest text-muted">
            Origen
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Ej: China / Brasil / EEUU"
              disabled={disabled}
              className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/40 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus:border-primary/40 focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            />
            <Button
              variant="secondary"
              className="h-10 px-4 text-xs font-black uppercase tracking-widest"
              disabled={disabled || origin.trim().length < 2}
              onClick={() => {
                const v = origin.trim();
                if (v.length < 2) return;
                onSetOrigin(v);
              }}
            >
              Aplicar
            </Button>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs font-bold uppercase tracking-widest text-muted">
            Perfil de carga (impacta flete)
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { id: "light" as const, label: "Liviana" },
              { id: "medium" as const, label: "Media" },
              { id: "heavy" as const, label: "Pesada" },
            ].map((x) => (
              <Button
                key={x.id}
                variant="secondary"
                className="px-3 py-2 text-xs font-black uppercase tracking-widest"
                disabled={disabled}
                onClick={() => onSetProfile(x.id)}
              >
                {x.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 text-xs leading-relaxed text-muted">
        Cada cambio recalcula el rango y actualiza la calidad de la cotización.
      </div>
    </div>
  );
}

export default function ChatClient({
  initialMode,
}: {
  initialMode: ChatMode;
}) {
  const [mode, setMode] = useState<ChatMode>(initialMode);
  const [messages, setMessages] = useState<Message[]>([]);
  const [cards, setCards] = useState<QuoteCard[] | null>(null);
  const [ncm, setNcm] = useState<string | null>(null);
  const [quality, setQuality] = useState<number | null>(null);
  const [assumptions, setAssumptions] = useState<ServerResponse["assumptions"] | null>(
    null
  );
  const [productPreview, setProductPreview] = useState<
    ServerResponse["productPreview"] | null
  >(null);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState("");
  const [requestContact, setRequestContact] = useState(false);
  const [contact, setContact] = useState("");
  const [cardsDrawerOpen, setCardsDrawerOpen] = useState(false);
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [anonId, setAnonId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const anonIdRef = useRef<string | null>(null);

  useEffect(() => {
    const v = getOrCreateAnonId();
    anonIdRef.current = v;
    setAnonId(v);
  }, []);

  const pdfHref = useMemo(() => {
    const base = `/api/quote/pdf?mode=${encodeURIComponent(mode)}`;
    return anonId ? `${base}&anon=${encodeURIComponent(anonId)}` : base;
  }, [anonId, mode]);

  const header = useMemo(() => {
    const t =
      mode === "budget"
        ? "Importar con presupuesto"
        : "Estimación de importación";
    const sub =
      mode === "budget"
        ? "Decime tu presupuesto y restricciones. Te proponemos opciones viables."
        : "Pegá un link o describí qué querés importar. Te devolvemos el costo real.";
    return { t, sub };
  }, [mode]);

  const stage = useMemo(() => {
    if (requestContact) return "Decisión → Contacto";
    if (cards?.length) return "Cotización";
    return "Descubrimiento";
  }, [cards, requestContact]);

  const quoteProgress = useMemo(() => {
    if (requestContact) return 100;
    if (cards?.length) return 100;
    const assistantTexts = messages
      .filter((m) => m.role === "assistant")
      .map((m) => m.content.toLowerCase());
    const askedQty = assistantTexts.some((t) => /\bcantidad\b/.test(t));
    const askedPrice = assistantTexts.some((t) => /\bprecio\b/.test(t) && /\busd\b|\$\b|u\$s\b/.test(t));
    if (askedQty) return 75;
    if (askedPrice) return 55;
    if (messages.length >= 3) return 40;
    return 25;
  }, [messages, cards, requestContact]);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length) return prev;
      const initial =
        mode === "budget"
          ? "¿Con qué presupuesto querés importar (USD) y qué tipo de producto te interesa? Podés dar restricciones (peso, volumen, categoría, urgencia)."
          : "¿Qué querés importar? Podés describir el producto o pegar un link del proveedor (Alibaba, 1688, etc).";
      return [
        {
          id: uid(),
          role: "assistant",
          content: initial,
          ts: Date.now(),
        },
      ];
    });
  }, [mode]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, cards, pending, requestContact]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = String(e.key || "").toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === "k") {
        e.preventDefault();
        if ((cards ?? []).length) setCardsDrawerOpen(true);
        else inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cards]);

  const lastAssistant = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === "assistant") return messages[i]!;
    }
    return null;
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    setInput("");
    setPending(true);
    setCards(null);
    setNcm(null);
    setQuality(null);
    setAssumptions(null);
    setCardsDrawerOpen(false);
    setNavDrawerOpen(false);

    const userMsg: Message = {
      id: uid(),
      role: "user",
      content: trimmed,
      ts: Date.now(),
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(anonIdRef.current ? { "x-ecomex-anon": anonIdRef.current } : {}),
        },
        // Ensure session cookies (anonId/auth) are sent and Set-Cookie is honored.
        credentials: "include",
        body: JSON.stringify({
          mode,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          contact: requestContact ? contact : undefined,
        }),
      });

      const json = (await res.json()) as ServerResponse;
      if (!res.ok) {
        throw new Error(
          typeof (json as any)?.assistantMessage === "string"
            ? (json as any).assistantMessage
            : "Error procesando el chat."
        );
      }

      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          content: json.assistantMessage,
          ts: Date.now(),
        },
      ]);

      if (json.cards?.length) setCards(json.cards);
      if (json.productPreview && typeof json.productPreview === "object") {
        setProductPreview(json.productPreview);
      }
      if (typeof json.ncm === "string" && json.ncm.trim() && json.ncm.trim() !== "9999.99.99") {
        setNcm(json.ncm.trim());
      }
      if (typeof json.quality === "number" && Number.isFinite(json.quality)) setQuality(json.quality);
      if (Array.isArray(json.assumptions)) setAssumptions(json.assumptions);
      if (typeof json.requestContact === "boolean") {
        setRequestContact(json.requestContact);
      }
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Error inesperado. Reintentá.";
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "assistant", content: msg, ts: Date.now() },
      ]);
    } finally {
      setPending(false);
    }
  }

  const LeftNav = () => {
    return (
      <div className="flex h-full flex-col justify-between p-6">
        <div className="flex flex-col gap-8">
          <Link href="/" className="flex items-center gap-3" onClick={() => setNavDrawerOpen(false)}>
            <div className="rounded-lg bg-white px-2 py-1 shadow-sm">
              <BrandLogo className="h-6" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-base font-bold tracking-tight">E‑COMEX</h1>
              <p className="text-xs font-medium uppercase tracking-widest text-muted">
                Terminal IA
              </p>
            </div>
          </Link>

          <nav className="flex flex-col gap-2">
            <Link
              href="/account"
              onClick={() => setNavDrawerOpen(false)}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-muted transition-all hover:bg-white/5 hover:text-white"
            >
              <Icon name="dashboard" size={18} className="text-white/70" />
              <span className="text-sm font-medium">Tablero</span>
            </Link>
            <Link
              href="/cotizaciones"
              onClick={() => setNavDrawerOpen(false)}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-muted transition-all hover:bg-white/5 hover:text-white"
            >
              <Icon name="calculate" size={18} className="text-white/70" />
              <span className="text-sm font-medium">Cotizaciones</span>
            </Link>
            <Link
              href="/tendencias"
              onClick={() => setNavDrawerOpen(false)}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-muted transition-all hover:bg-white/5 hover:text-white"
            >
              <Icon name="trending_up" size={18} className="text-white/70" />
              <span className="text-sm font-medium">Tendencias</span>
            </Link>
            <Link
              href="/chat"
              onClick={() => setNavDrawerOpen(false)}
              className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-white"
            >
              <Icon name="smart_toy" size={18} className="text-white" />
              <span className="text-sm font-semibold">Asistente IA</span>
            </Link>
            <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-muted opacity-70">
              <Icon name="settings" size={18} className="text-white/70" />
              <span className="text-sm font-medium">Ajustes</span>
            </div>
          </nav>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-white/5 bg-white/5 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-tighter text-muted">
              Progreso de cotización
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-primary transition-[width] duration-300"
                style={{ width: `${quoteProgress}%` }}
              />
            </div>
            <p className="mt-1 text-right text-[10px] text-muted">
              {quoteProgress}% completado
            </p>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 text-muted">
            <Icon name="support_agent" size={18} className="text-white/70" />
            <span className="text-sm font-medium">Asesor humano (al confirmar)</span>
          </div>
        </div>
      </div>
    );
  };

  const RightBreakdown = () => {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="space-y-3">
          {(() => {
            const snap = parseProductSnapshot(lastAssistant?.content ?? "");
            const pp = productPreview;
            const title = pp?.title ?? snap.title;
            const unit = (() => {
              const pr = pp?.price;
              if (
                pr?.type === "range" &&
                typeof pr.min === "number" &&
                typeof pr.max === "number"
              ) {
                return withUnit(fmtUsdRange(pr.min, pr.max), pr.unit);
              }
              if (pr?.type === "single" && typeof pr.min === "number") {
                return withUnit(fmtUsd(pr.min), pr.unit);
              }
              return typeof pp?.fobUsd === "number" ? fmtUsd(pp.fobUsd) : snap.unit;
            })();
            const qty = typeof pp?.quantity === "number" ? String(pp.quantity) : snap.qty;
            const origin = pp?.origin ?? snap.origin;
            const img = pp?.imageUrl;
            const href = pp?.sourceUrl;
            if (!title && !qty && !unit && !origin && !img) return null;
            return (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                      Producto detectado
                    </div>
                    <div className="mt-2 flex items-start gap-3">
                      {img ? (
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                          <img
                            src={img}
                            alt=""
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-contain"
                          />
                        </div>
                      ) : null}
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold text-white">
                          {title ?? "—"}
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-muted">
                          {unit ? <div>Precio unitario: {unit}</div> : null}
                          {qty ? <div>Cantidad: {qty}</div> : null}
                          {origin ? <div>Origen: {origin}</div> : null}
                          {href ? (
                            <a
                              className="inline-flex items-center gap-1 pt-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary/90 hover:text-primary"
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Ver link
                              <Icon name="open_in_new" size={14} className="text-primary/90" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                  <SealVerified label="IA" />
                </div>
              </div>
            );
          })()}

          {(cards ?? []).length ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                Clasificación aduanera
              </div>
              <div className="mt-2 text-sm font-extrabold text-white">
                {(() => {
                  const fromState =
                    ncm && ncm !== "9999.99.99" ? ncm : null;
                  const fromAssumptions =
                    assumptions
                      ?.find((a) => a.id === "ncm")
                      ?.value?.match(/\b(\d{4}\.\d{2}\.\d{2})\b/)?.[1] ?? null;
                  const used = fromState ?? fromAssumptions;
                  return used ? `NCM ${used}` : "Estimando…";
                })()}
              </div>
              <div className="mt-2 text-xs leading-relaxed text-muted">
                Se afina con datos técnicos y origen. Recomendamos validación profesional antes
                de operar.
              </div>
            </div>
          ) : null}

          {(cards ?? []).length ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                    Calidad de cotización
                  </div>
                  <div className="mt-2 text-sm font-extrabold text-white">
                    {quality != null ? "Control de supuestos" : "Analizando…"}
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-muted">
                    Transparencia sobre qué salió de PCRAM vs qué está estimado.
                  </div>
                </div>
                {quality != null ? <ProgressRing value={quality} label="QA" /> : null}
              </div>
              {Array.isArray(assumptions) && assumptions.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {assumptions.slice(0, 8).map((a) => (
                    <Badge
                      key={a.id}
                      tone={a.tone === "gold" ? "primary" : (a.tone ?? "muted")}
                      icon="tune"
                    >
                      {a.label}: {a.value}
                    </Badge>
                  ))}
                </div>
              ) : null}
              <AssumptionsControls
                disabled={pending}
                onSetOrigin={(o) => void send(`Origen: ${o}`)}
                onSetProfile={(p) =>
                  void send(
                    `Perfil carga: ${p === "light" ? "liviana" : p === "heavy" ? "pesada" : "media"}`
                  )
                }
              />
            </div>
          ) : null}

          {(cards ?? []).length ? (
            <QuoteCards cards={cards!} defaultExpandedLabel="Total puesto en Argentina" />
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-muted">
              El desglose va a aparecer acá cuando tengamos una cotización.
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden bg-app aurora text-strong selection:bg-[color:color-mix(in_oklab,var(--primary)_40%,transparent)]">
      <div className="pointer-events-none absolute inset-0 grid-overlay opacity-35" />

      <aside className="hidden w-72 flex-col border-r border-subtle bg-[var(--surface)]/90 backdrop-blur-md lg:flex">
        <LeftNav />
      </aside>

      <main className="relative z-10 flex flex-1 flex-col">
        <header className="glass-nav sticky top-0 z-30 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted hover:bg-white/10 md:hidden"
              onClick={() => setNavDrawerOpen(true)}
              aria-label="Abrir menú"
            >
              <Icon name="menu" size={18} className="text-white/80" />
            </button>
            <div className="flex min-w-0 h-10 items-center gap-3">
              <div className="rounded-lg bg-white px-2 py-1 shadow-sm">
                <BrandLogo className="h-6" />
              </div>
              <div className="min-w-0 text-base font-bold tracking-tight sm:text-xl">
                <span className="block truncate">
                  E‑COMEX <span className="font-black text-primary">IA</span>
                </span>
              </div>
            </div>
            <div className="hidden items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 md:flex">
              <Icon name="directions_boat" size={14} className="text-white/60" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted">
                China ➔ Argentina
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
            {(cards ?? []).length ? (
              <button
                type="button"
                onClick={() => setCardsDrawerOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/10 md:hidden sm:px-4 sm:text-xs"
              >
                <Icon name="receipt_long" size={16} className="text-white/90" />
                <span className="hidden sm:inline">Desglose</span>
                <span className="sm:hidden">Costos</span>
              </button>
            ) : null}

            <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-emerald-500/10 px-4 py-2 text-xs font-bold tracking-widest text-emerald-400 md:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              EN LÍNEA
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1 text-[10px] sm:gap-2 sm:text-xs">
              <button
                type="button"
                className={classNames(
                  "rounded-lg px-2 py-2 font-bold uppercase tracking-wider text-muted transition-colors hover:text-white sm:px-3",
                  mode === "quote" && "bg-white/10 text-white"
                )}
                onClick={() => {
                  setMode("quote");
                  setCards(null);
                  setNcm(null);
                  setRequestContact(false);
                  setContact("");
                  setMessages([]);
                }}
              >
                Cotizar
              </button>
              <button
                type="button"
                className={classNames(
                  "rounded-lg px-2 py-2 font-bold uppercase tracking-wider text-muted transition-colors hover:text-white sm:px-3",
                  mode === "budget" && "bg-white/10 text-white"
                )}
                onClick={() => {
                  setMode("budget");
                  setCards(null);
                  setNcm(null);
                  setRequestContact(false);
                  setContact("");
                  setMessages([]);
                }}
              >
                Presupuesto
              </button>
            </div>

            <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted md:block">
              Estado: {stage}
            </div>
          </div>
        </header>

        {/* Mobile left drawer (navigation) */}
        {navDrawerOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-background-deeper/70"
              onClick={() => setNavDrawerOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute left-0 top-0 h-full w-[86vw] max-w-sm overflow-hidden border-r border-white/10 bg-background-deeper/90 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="text-sm font-extrabold text-white">Menú</div>
                <button
                  type="button"
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-muted hover:bg-white/10"
                  onClick={() => setNavDrawerOpen(false)}
                  aria-label="Cerrar menú"
                >
                  <Icon name="close" size={18} className="text-white/80" />
                </button>
              </div>
              <div className="h-[calc(100dvh-64px)] overflow-y-auto">
                <LeftNav />
              </div>
            </div>
          </div>
        ) : null}

        {/* Mobile right drawer (cost breakdown) */}
        {cardsDrawerOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-background-deeper/70"
              onClick={() => setCardsDrawerOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute right-0 top-0 h-full w-[90vw] max-w-md overflow-hidden border-l border-white/10 bg-background-deeper/90 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 p-6">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
                  Desglose de costos
                </h3>
                <div className="flex items-center gap-2">
                  {(cards ?? []).length ? (
                    <ButtonLink
                      href={pdfHref}
                      variant="secondary"
                      className="px-3 py-2 text-xs font-bold uppercase tracking-widest"
                      onClick={() => setCardsDrawerOpen(false)}
                    >
                      <Icon name="download" size={16} className="text-white/90" />
                      PDF
                    </ButtonLink>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-lg border border-white/10 bg-white/5 p-2 text-muted hover:bg-white/10"
                    onClick={() => setCardsDrawerOpen(false)}
                    aria-label="Cerrar desglose"
                  >
                    <Icon name="close" size={18} className="text-white/80" />
                  </button>
                </div>
              </div>
              <RightBreakdown />
            </div>
          </div>
        ) : null}

        <div className="flex flex-1 overflow-hidden">
          <section className="flex flex-1 flex-col overflow-hidden">
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-10">
              <div className="mx-auto flex max-w-4xl flex-col gap-8">
                <div className="flex justify-center">
                  <span className="rounded-full bg-white/5 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                    Hoy • Nodo logístico 01
                  </span>
                </div>

            <div className="panel rounded-2xl px-5 py-4">
              <div className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">
                    Inicio
                  </div>
              <div className="mt-2 text-sm leading-relaxed text-muted">
                    {header.sub}
                  </div>
                </div>

                {mode === "budget" && messages.length <= 1 ? (
                  <BudgetPanel
                    pending={pending}
                    onSubmitBudget={(usd) => {
                      void send(`Presupuesto: USD ${usd}`);
                    }}
                  />
                ) : null}

                <div className="flex flex-col gap-8">
                  {messages.map((m) => {
                    const isUser = m.role === "user";
                    return (
                      <div
                        key={m.id}
                        className={classNames(
                          "flex items-start gap-4",
                          isUser && "ml-auto flex-row-reverse"
                        )}
                      >
                        <div
                          className={classNames(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-lg",
                            isUser
                              ? "bg-[var(--surface2)]"
                              : "bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_80%,white_8%),var(--primary2))] shadow-[var(--shadowGlow)]"
                          )}
                        >
                          <Icon
                            name={isUser ? "person" : "smart_toy"}
                            size={18}
                            className="text-white"
                          />
                        </div>
                        <div
                          className={classNames(
                            "flex min-w-0 max-w-3xl flex-col gap-1",
                            isUser && "items-end"
                          )}
                        >
                          <p
                            className={classNames(
                              "text-xs font-bold uppercase tracking-wider",
                              isUser ? "text-muted" : "text-muted"
                            )}
                          >
                            {isUser ? "Vos" : "E‑COMEX IA"}
                          </p>
                          <div
                            className={classNames(
                              "px-5 py-4 text-[15px] leading-relaxed shadow-xl",
                              isUser
                                ? "rounded-2xl rounded-tr-none border border-subtle bg-[var(--surface2)]"
                                : "panel rounded-2xl rounded-tl-none"
                            )}
                          >
                            <RichText text={m.content} />
                          </div>
                          {!isUser ? (
                            <p className="ml-1 mt-1 text-[10px] text-muted">
                              Sistema listo • Latencia 24 ms
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}

                  {(cards ?? []).length ? (
                    <div className="md:hidden">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone="primary" icon="verified">
                                Cotización lista
                              </Badge>
                              <Badge tone="muted" icon="receipt_long">
                                Desglose a la derecha
                              </Badge>
                            </div>
                            <div className="mt-2 text-xs text-muted">
                              Abrí el panel de la derecha para ver el desglose de costos.
                            </div>
                          </div>
                          <Button
                            variant="secondary"
                            className="shrink-0 px-3 py-2 text-xs font-black uppercase tracking-widest"
                            onClick={() => setCardsDrawerOpen(true)}
                          >
                            Ver desglose
                            <Icon name="chevron_right" size={16} className="text-white/80" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {pending ? (
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/20">
                        <Icon name="smart_toy" size={18} className="text-white" />
                      </div>
                      <div className="flex max-w-3xl flex-col gap-1">
                        <p className="ml-1 text-xs font-bold uppercase tracking-wider text-muted">
                          E‑COMEX IA
                        </p>
                        <div className="panel rounded-2xl rounded-tl-none px-5 py-4 text-[15px] text-muted shadow-xl">
                          Analizando cotización...
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="border-t border-subtle bg-[var(--surface)]/70 p-4 backdrop-blur-xl sm:p-6">
              <div className="mx-auto max-w-4xl">
                {requestContact ? (
                  <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs font-bold uppercase tracking-widest text-white/70">
                      Consultoría
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">
                      Para agendar la **consultoría paga**, dejame tu mail o WhatsApp.
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      Es el paso recomendado para validar clasificación aduanera, requisitos y riesgos antes de decidir.
                    </div>
                    <input
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="email@empresa.com o +54 9 ..."
                      className="mt-3 w-full rounded-xl border border-subtle bg-[var(--surface)] px-4 py-3 text-sm text-strong outline-none placeholder:text-muted/70 focus:border-[color:color-mix(in_oklab,var(--primary)_42%,white_8%)] focus:ring-2 focus:ring-[var(--ring)]"
                    />
                  </div>
                ) : null}

                <div className="mb-3 flex flex-wrap gap-2">
                  {[
                    "Necesito una cotización desde Alibaba",
                    "Tengo presupuesto de USD 10.000",
                    "¿Qué NCM sugerís para este producto?",
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setInput(chip)}
                      className="rounded-full border border-subtle bg-[var(--surface)] px-3 py-1 text-[11px] font-semibold text-muted transition-colors hover:text-strong"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send(input);
                  }}
                >
                  <div className="panel-strong flex min-w-0 items-center gap-2 rounded-2xl p-2 shadow-2xl sm:gap-3">
                    <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface2)] sm:flex">
                      <Icon name="open_in_new" size={18} className="text-white/40" />
                    </div>
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e as any).isComposing) return;
                        if (
                          e.key === "Enter" &&
                          !e.shiftKey &&
                          !e.altKey &&
                          !e.metaKey &&
                          !e.ctrlKey
                        ) {
                          e.preventDefault();
                          void send(input);
                        }
                      }}
                      placeholder={
                        mode === "budget"
                          ? "Pegá tu presupuesto y restricciones…"
                          : "Pegá un link del producto o hacé una consulta…"
                      }
                      rows={2}
                      className="min-h-[48px] min-w-0 flex-1 resize-none rounded-xl bg-transparent px-2 text-base font-normal text-strong outline-none placeholder:text-muted/70"
                    />
                    <button
                      type="submit"
                      disabled={pending}
                      className="flex h-10 min-w-[96px] items-center justify-center gap-2 rounded-xl border border-[color:color-mix(in_oklab,var(--primary)_58%,white_12%)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_84%,white_8%),var(--primary2))] px-3 text-sm font-bold text-strong shadow-[var(--shadowGlow)] transition-all active:scale-95 disabled:opacity-60 sm:min-w-[120px] sm:px-4"
                    >
                      ENVIAR
                      <Icon name="bolt" size={16} className="text-white" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </section>

          <aside className="hidden min-h-0 w-80 flex-col overflow-hidden border-l border-white/5 bg-background-deeper/50 backdrop-blur-md xl:flex">
            <div className="flex items-center justify-between gap-3 border-b border-white/5 p-6">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
                Desglose de costos
              </h3>
              {(cards ?? []).length ? (
                <ButtonLink
                  href={pdfHref}
                  variant="secondary"
                  className="px-3 py-2 text-xs font-bold uppercase tracking-widest"
                >
                  <Icon name="download" size={16} className="text-white/90" />
                  PDF
                </ButtonLink>
              ) : null}
            </div>

            <RightBreakdown />
          </aside>
        </div>
      </main>
    </div>
  );
}

