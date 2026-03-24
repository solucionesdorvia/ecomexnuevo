"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [ncm, setNcm] = useState<string | null>(null);
  const [data, setData] = useState<ServerData | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const anonRef = useRef<string | null>(null);

  useEffect(() => { anonRef.current = getAnonId(); }, []);
  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [msgs, pending]);

  async function send() {
    const text = input.trim();
    if (!text || pending) return;
    setInput("");
    const next: Msg[] = [...msgs, { role: "user", content: text, ts: Date.now() }];
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

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#07111A]" style={{ fontFamily: "var(--font-body, 'Inter', sans-serif)" }}>
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/"><img src="/brand/ecomex-logo.png" alt="E-COMEX" className="h-5 brightness-0 invert" /></Link>
          <div className="hidden h-4 w-px bg-white/[0.08] sm:block" />
          <span className="hidden text-[13px] font-medium text-[#A7B3C2] sm:block">Clasificador NCM</span>
        </div>
        <Link href="/" className="text-[12px] text-[#5A6577] transition-colors hover:text-white">Volver al inicio</Link>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat */}
        <div className="flex flex-1 flex-col">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <div className="mx-auto max-w-[640px] space-y-5">
              {msgs.length === 0 && !pending && (
                <div className="flex flex-col items-center py-16 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2F80ED]/10">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2F80ED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                    </svg>
                  </div>
                  <h1 className="mt-5 text-[20px] font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Clasificador NCM</h1>
                  <p className="mt-2 max-w-[380px] text-[14px] leading-relaxed text-[#5A6577]">
                    Describí el producto que querés importar. El sistema te da la posición arancelaria, impuestos, intervenciones y costo estimado.
                  </p>
                  <div className="mt-8 flex flex-wrap justify-center gap-2">
                    {["Cargador USB-C 20W desde China", "Auriculares bluetooth", "Remeras de algodón", "Panel solar 500W"].map((s) => (
                      <button key={s} type="button" onClick={() => setInput(s)} className="rounded-lg border border-white/[0.06] px-3 py-2 text-[12px] text-[#5A6577] transition-colors hover:border-white/[0.12] hover:text-[#A7B3C2]">{s}</button>
                    ))}
                  </div>
                </div>
              )}

              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-xl px-4 py-3 text-[14px] leading-[1.7] ${m.role === "user" ? "bg-[#2F80ED]/10 text-white border border-[#2F80ED]/10" : "bg-[#0B1622] text-[#A7B3C2] border border-white/[0.04]"}`}>
                    {m.role === "assistant" && (
                      <div className="mb-2 flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#2F80ED]" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5A6577]">E-COMEX</span>
                      </div>
                    )}
                    {m.content.split("\n").map((line, j) => <p key={j} className={j > 0 ? "mt-2" : ""}>{line}</p>)}
                  </div>
                </div>
              ))}

              {pending && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-xl border border-white/[0.04] bg-[#0B1622] px-4 py-3">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-[#2F80ED]" />
                    <span className="text-[13px] text-[#5A6577]">Clasificando...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-white/[0.04] bg-[#060d16] px-4 py-3 sm:px-6">
            <div className="mx-auto max-w-[640px]">
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-[#0B1622] px-4 py-1.5 focus-within:border-[#2F80ED]/25">
                <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${pending ? "animate-pulse bg-[#2F80ED]" : "bg-emerald-500"}`} />
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Describí el producto que querés clasificar..."
                  className="flex-1 bg-transparent py-2.5 text-[14px] text-white outline-none placeholder:text-[#5A6577]"
                />
                <button type="button" disabled={pending || !input.trim()} onClick={send} className="shrink-0 rounded-lg bg-[#2F80ED] px-4 py-2 text-[12px] font-medium text-white transition-colors hover:bg-[#2563eb] disabled:opacity-20">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Side panel — classification result */}
        <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-l border-white/[0.04] bg-[#0B1622] p-5 lg:block">
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
