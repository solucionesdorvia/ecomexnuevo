"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string; ts: number };
type ServerData = {
  assistantMessage: string;
  ncm?: string;
  cards?: Array<{ label: string; value: string; detail?: string; highlight?: boolean }>;
  productPreview?: { title?: string; origin?: string };
  analysis?: { ncmMeta?: { source?: string; confidence?: number } };
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

export default function ClasificadorClient() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [ncm, setNcm] = useState<string | null>(null);
  const [cards, setCards] = useState<ServerData["cards"]>(undefined);
  const [product, setProduct] = useState<string | null>(null);
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
      if (json.cards) setCards(json.cards);
      if (json.productPreview?.title) setProduct(json.productPreview.title);
    } catch (e) {
      setMsgs((prev) => [...prev, { role: "assistant", content: e instanceof Error ? e.message : "Error.", ts: Date.now() }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#07111A]" style={{ fontFamily: "var(--font-body, 'Inter', sans-serif)" }}>
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/">
            <img src="/brand/ecomex-logo.png" alt="E-COMEX" className="h-5 brightness-0 invert" />
          </Link>
          <div className="hidden h-4 w-px bg-white/[0.08] sm:block" />
          <span className="hidden text-[13px] font-medium text-[#A7B3C2] sm:block">Clasificador NCM</span>
        </div>
        <Link href="/" className="text-[12px] text-[#5A6577] transition-colors hover:text-white">
          Volver al inicio
        </Link>
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
                  <h1 className="mt-5 text-[20px] font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                    Clasificador NCM
                  </h1>
                  <p className="mt-2 max-w-[380px] text-[14px] leading-relaxed text-[#5A6577]">
                    Describí el producto que querés importar y el sistema te sugiere la posición arancelaria NCM con estimación de costos.
                  </p>
                  <div className="mt-8 flex flex-wrap justify-center gap-2">
                    {[
                      "Cargador USB-C 20W desde China",
                      "Auriculares bluetooth",
                      "Remeras de algodón",
                      "Máquina envasadora",
                    ].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => { setInput(s); }}
                        className="rounded-lg border border-white/[0.06] px-3 py-2 text-[12px] text-[#5A6577] transition-colors hover:border-white/[0.12] hover:text-[#A7B3C2]"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-xl px-4 py-3 text-[14px] leading-[1.7] ${
                    m.role === "user"
                      ? "bg-[#2F80ED]/10 text-white border border-[#2F80ED]/10"
                      : "bg-[#0B1622] text-[#A7B3C2] border border-white/[0.04]"
                  }`}>
                    {m.role === "assistant" && (
                      <div className="mb-2 flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#2F80ED]" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5A6577]">E-COMEX</span>
                      </div>
                    )}
                    {m.content.split("\n").map((line, j) => (
                      <p key={j} className={j > 0 ? "mt-2" : ""}>{line}</p>
                    ))}
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
                <button
                  type="button"
                  disabled={pending || !input.trim()}
                  onClick={send}
                  className="shrink-0 rounded-lg bg-[#2F80ED] px-4 py-2 text-[12px] font-medium text-white transition-colors hover:bg-[#2563eb] disabled:opacity-20"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Side panel — NCM result */}
        <aside className="hidden w-[280px] shrink-0 overflow-y-auto border-l border-white/[0.04] bg-[#0B1622] p-5 lg:block">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5A6577]">Resultado</p>

          {ncm ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-[#2F80ED]/15 bg-[#2F80ED]/[0.04] p-4">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-[#5A6577]">Posición NCM</p>
                <p className="mt-1 font-mono text-[20px] font-bold text-white">{ncm}</p>
              </div>

              {product && (
                <div className="rounded-lg border border-white/[0.04] bg-[#07111A] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[#5A6577]">Producto</p>
                  <p className="mt-1 text-[13px] text-[#A7B3C2]">{product}</p>
                </div>
              )}

              {cards && cards.length > 0 && (
                <>
                  {cards.map((c) => (
                    <div key={c.label} className={`rounded-lg border p-3 ${c.highlight ? "border-[#d4a843]/20 bg-[#d4a843]/[0.04]" : "border-white/[0.04] bg-[#07111A]"}`}>
                      <p className="text-[8px] font-semibold uppercase tracking-wider text-[#5A6577]">{c.label}</p>
                      <p className={`mt-0.5 text-[13px] font-bold ${c.highlight ? "text-[#d4a843]" : "text-white"}`}>{c.value}</p>
                    </div>
                  ))}
                </>
              )}

              <a
                href={`/api/quote/pdf?mode=quote`}
                className="flex w-full items-center justify-center rounded-lg bg-[#2F80ED] py-2.5 text-[12px] font-medium text-white transition-colors hover:bg-[#2563eb]"
              >
                Descargar PDF
              </a>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-white/[0.06] p-6 text-center">
              <p className="text-[13px] text-[#5A6577]">Describí un producto para ver la clasificación.</p>
            </div>
          )}

          <div className="mt-6 rounded-lg border border-white/[0.04] bg-[#07111A] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5A6577]">Aviso</p>
            <p className="mt-2 text-[11px] leading-relaxed text-[#5A6577]">
              Esta clasificación es una estimación orientativa generada por IA. Para operar, se recomienda validar con un despachante de aduanas matriculado.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
