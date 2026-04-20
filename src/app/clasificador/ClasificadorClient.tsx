"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChatContainer } from "@/app/clasificarncm/components/ChatContainer";
import { ChatInput } from "@/app/clasificarncm/components/ChatInput";

type Msg = { role: "user" | "assistant"; content: string; ts: number };
type ServerData = {
  assistantMessage: string;
  ncm?: string;
  cards?: Array<{ label: string; value: string; detail?: string; highlight?: boolean }>;
  productPreview?: { title?: string; origin?: string; category?: string };
  assumptions?: Array<{ id: string; label: string; value: string; source: string }>;
  breakdown?: {
    fobTotalUsd?: number;
    fleteMinUsd?: number; fleteMaxUsd?: number;
    seguroMinUsd?: number; seguroMaxUsd?: number;
    derechosImportacionMinUsd?: number; derechosImportacionMaxUsd?: number;
    tasaEstadisticaMinUsd?: number; tasaEstadisticaMaxUsd?: number;
    ivaMinUsd?: number; ivaMaxUsd?: number;
    ivaAdicionalMinUsd?: number; ivaAdicionalMaxUsd?: number;
    gananciasMinUsd?: number; gananciasMaxUsd?: number;
    iibbMinUsd?: number; iibbMaxUsd?: number;
    totalMinUsd?: number; totalMaxUsd?: number;
  };
  analysis?: {
    stage?: string;
    normalizedTitle?: string;
    ncm?: string;
    ncmMeta?: { source?: string; confidence?: number; ambiguous?: boolean };
    pcram?: {
      title?: string;
      breadcrumbs?: string[];
      unit?: string;
      interventions?: string[];
    };
    timing?: { route?: string; minDays?: number; maxDays?: number };
    flags?: string[];
    quality?: number;
  };
};

function getAnonId() {
  try {
    const k = "ecomex_anon_id";
    const v = localStorage.getItem(k);
    if (v && v.length >= 12) return v;
    const id = crypto.randomUUID();
    localStorage.setItem(k, id);
    return id;
  } catch { return null; }
}

function fmtUsd(n: number) { return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; }
function fmtRange(a?: number, b?: number) {
  if (a == null || b == null) return "—";
  if (a === b) return fmtUsd(a);
  return `${fmtUsd(a)} – ${fmtUsd(b)}`;
}

export default function ClasificadorClient() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [pending, setPending] = useState(false);
  const [ncm, setNcm] = useState<string | null>(null);
  const [data, setData] = useState<ServerData | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const anonRef = useRef<string | null>(null);

  useEffect(() => { anonRef.current = getAnonId(); }, []);
  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [msgs, pending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    const next: Msg[] = [...msgs, { role: "user", content: trimmed, ts: Date.now() }];
    setMsgs(next);
    setPending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json", ...(anonRef.current ? { "x-ecomex-anon": anonRef.current } : {}) },
        credentials: "include",
        body: JSON.stringify({ mode: "quote", messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const json = (await res.json()) as ServerData;
      if (!res.ok) throw new Error(json?.assistantMessage || "Error");

      setMsgs((prev) => [...prev, { role: "assistant", content: json.assistantMessage, ts: Date.now() }]);
      if (json.ncm) setNcm(json.ncm);
      setData(json);
    } catch (e) {
      setMsgs((prev) => [...prev, { role: "assistant", content: e instanceof Error ? e.message : "Error.", ts: Date.now() }]);
    } finally {
      setPending(false);
    }
  }

  const pcram = data?.analysis?.pcram;
  const bd = data?.breakdown;
  const interventions = pcram?.interventions ?? [];
  const cards = data?.cards;
  const product = data?.productPreview?.title ?? data?.analysis?.normalizedTitle;
  const confidence = data?.analysis?.ncmMeta?.confidence;

  const chatMessages = msgs.map((m, i) => ({
    id: `clasificador-${i}-${m.ts}`,
    role: m.role,
    content: m.content,
    ts: m.ts,
  }));

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#030712]" style={{ fontFamily: "var(--font-body, 'Inter', sans-serif)" }}>
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/[0.07] bg-[#030712]/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/"><img src="/brand/ecomex-logo.png" alt="E-COMEX" className="h-5 brightness-0 invert" /></Link>
          <div className="hidden h-4 w-px bg-white/[0.08] sm:block" />
          <span className="hidden text-[13px] font-medium text-[#A7B3C2] sm:block">Clasificador NCM</span>
        </div>
        <Link href="/" className="text-[12px] text-[#5A6577] transition-colors hover:text-white">Volver al inicio</Link>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div
            ref={scrollRef}
            className="chat-thread-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain scroll-smooth px-3 py-5 sm:px-6 sm:py-6"
          >
            <div className="mx-auto max-w-[min(100%,640px)]">
              {msgs.length === 0 && !pending ? (
                <div className="flex flex-col items-center px-2 py-12 text-center sm:py-16">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#2F80ED]/20 bg-[#2F80ED]/10 shadow-lg shadow-black/20">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" />
                    </svg>
                  </div>
                  <h1 className="mt-6 text-[22px] font-bold tracking-tight text-white sm:text-[24px]" style={{ fontFamily: "var(--font-display)" }}>
                    Clasificador NCM
                  </h1>
                  <p className="mt-3 max-w-[400px] text-[14px] leading-relaxed text-slate-500">
                    Describí el producto que querés importar. El sistema te da la posición arancelaria, impuestos, intervenciones y costo estimado.
                  </p>
                  <div className="mt-8 flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
                    {[
                      "Cargador USB-C 20W, USD 3, 500u, China",
                      "Auriculares bluetooth, USD 8, 100u, China",
                      "Remeras algodón, USD 4, 200u, China",
                      "Mercedes SL600 1995, USD 25000, 1u, USA",
                    ].map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={pending}
                        onClick={() => void send(s)}
                        className="min-h-[48px] w-full touch-manipulation rounded-xl border border-white/[0.08] bg-[#0f172a]/80 px-4 py-3 text-left text-[13px] leading-snug text-slate-400 transition hover:border-[#38bdf8]/25 hover:text-slate-200 active:scale-[0.99] disabled:opacity-40 sm:min-h-0 sm:w-auto sm:px-3 sm:py-2.5 sm:text-[12px]"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <ChatContainer messages={chatMessages} pending={pending} embedded />
              )}
            </div>
          </div>

          <ChatInput
            onSend={(t) => void send(t)}
            disabled={pending}
            placeholder="Producto, precio USD, cantidad, origen (ej: Cargador USB, USD 5, 100u, China)"
            helperText={
              <span>
                <span className="hidden sm:inline">Enter envía · Shift+Enter nueva línea</span>
                <span className="sm:hidden">Enter envía · Shift+Enter salto de línea</span>
              </span>
            }
          />
        </div>

        {/* Side panel — classification result */}
        <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-l border-white/[0.06] bg-[#0b1220]/95 p-5 shadow-[inset_1px_0_0_rgba(255,255,255,0.03)] lg:block">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5A6577]">Resultado de clasificación</p>

          {ncm ? (
            <div className="mt-4 space-y-3">
              {/* NCM */}
              <div className="rounded-lg border border-[#2F80ED]/15 bg-[#2F80ED]/[0.04] p-4">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-[#5A6577]">Posición NCM</p>
                <p className="mt-1 font-mono text-[22px] font-bold text-white">{ncm}</p>
                {pcram?.title && <p className="mt-2 text-[11px] leading-relaxed text-[#A7B3C2]">{pcram.title}</p>}
                {confidence != null && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full bg-[#2F80ED]" style={{ width: `${Math.round(confidence * 100)}%` }} />
                    </div>
                    <span className="text-[10px] text-[#5A6577]">{Math.round(confidence * 100)}%</span>
                  </div>
                )}
              </div>

              {/* Product */}
              {product && (
                <div className="rounded-lg border border-white/[0.04] bg-[#07111A] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[#5A6577]">Producto</p>
                  <p className="mt-1 text-[13px] text-[#A7B3C2]">{product}</p>
                </div>
              )}

              {/* Impuestos individuales */}
              {bd && (
                <div className="rounded-lg border border-white/[0.04] bg-[#07111A] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[#5A6577]">Impuestos estimados</p>
                  <div className="mt-3 space-y-2">
                    {[
                      ["Derechos importación (DIE)", bd.derechosImportacionMinUsd, bd.derechosImportacionMaxUsd],
                      ["Tasa estadística (TE)", bd.tasaEstadisticaMinUsd, bd.tasaEstadisticaMaxUsd],
                      ["IVA", bd.ivaMinUsd, bd.ivaMaxUsd],
                      ["IVA Adicional", bd.ivaAdicionalMinUsd, bd.ivaAdicionalMaxUsd],
                      ["Ganancias", bd.gananciasMinUsd, bd.gananciasMaxUsd],
                      ["IIBB", bd.iibbMinUsd, bd.iibbMaxUsd],
                    ].map(([label, min, max]) => (
                      (min != null || max != null) ? (
                        <div key={label as string} className="flex items-center justify-between text-[12px]">
                          <span className="text-[#5A6577]">{label as string}</span>
                          <span className="font-medium text-white">{fmtRange(min as number, max as number)}</span>
                        </div>
                      ) : null
                    ))}
                  </div>
                </div>
              )}

              {/* Intervenciones */}
              {interventions.length > 0 && (
                <div className="rounded-lg border border-amber-500/15 bg-amber-500/[0.04] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-amber-400/70">Intervenciones / Requisitos</p>
                  <div className="mt-2 space-y-1.5">
                    {interventions.slice(0, 8).map((int, i) => (
                      <p key={i} className="text-[11px] leading-relaxed text-[#A7B3C2]">• {int}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Total */}
              {cards && cards.length > 0 && (
                <div className="space-y-2">
                  {cards.filter(c => c.highlight).map((c) => (
                    <div key={c.label} className="rounded-lg border border-[#d4a843]/20 bg-[#d4a843]/[0.04] p-4">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-[#5A6577]">{c.label}</p>
                      <p className="mt-1 text-[17px] font-bold text-[#d4a843]">{c.value}</p>
                    </div>
                  ))}
                  {cards.filter(c => c.label === "Tiempos estimados").map((c) => (
                    <div key={c.label} className="rounded-lg border border-white/[0.04] bg-[#07111A] p-4">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-[#5A6577]">{c.label}</p>
                      <p className="mt-1 text-[13px] text-white">{c.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* PDF */}
              <a href="/api/quote/pdf?mode=quote" className="flex w-full items-center justify-center rounded-lg bg-[#2F80ED] py-2.5 text-[12px] font-medium text-white transition-colors hover:bg-[#2563eb]">
                Descargar PDF completo
              </a>

              {/* PCRAM breadcrumbs */}
              {pcram?.breadcrumbs && pcram.breadcrumbs.length > 0 && (
                <div className="rounded-lg border border-white/[0.04] bg-[#07111A] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[#5A6577]">Jerarquía NCM</p>
                  <div className="mt-2 space-y-1">
                    {pcram.breadcrumbs.map((bc, i) => (
                      <p key={i} className="text-[11px] text-[#5A6577]">
                        <span className="text-[#A7B3C2]">{"›".repeat(i + 1)}</span> {bc}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-white/[0.06] p-6 text-center">
              <p className="text-[13px] text-[#5A6577]">Describí un producto para ver la clasificación.</p>
            </div>
          )}

          <div className="mt-4 rounded-lg border border-white/[0.04] bg-[#07111A] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5A6577]">Aviso</p>
            <p className="mt-2 text-[11px] leading-relaxed text-[#5A6577]">
              Clasificación orientativa generada por IA + datos de PCRAM. Para operar, validar con despachante matriculado.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
