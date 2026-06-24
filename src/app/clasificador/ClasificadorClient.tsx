"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChatContainer } from "@/app/clasificarncm/components/ChatContainer";
import { ChatInput } from "@/app/clasificarncm/components/ChatInput";

type Msg = { role: "user" | "assistant"; content: string; ts: number };
type ServerData = {
  assistantMessage: string;
  ncm?: string;
  productPreview?: { title?: string; origin?: string; category?: string };
  analysis?: {
    normalizedTitle?: string;
    ncmMeta?: { source?: string; confidence?: number; ambiguous?: boolean };
    pcram?: {
      title?: string;
      breadcrumbs?: string[];
    };
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
  } catch {
    return null;
  }
}

const SUGGESTIONS = [
  "Cargador USB-C 20W, USD 3, 500u, China",
  "Auriculares bluetooth, USD 8, 100u, China",
  "Remeras algodón, USD 4, 200u, China",
  "Mercedes SL600 1995, USD 25000, 1u, USA",
];

export default function ClasificadorClient() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [pending, setPending] = useState(false);
  const [ncm, setNcm] = useState<string | null>(null);
  const [data, setData] = useState<ServerData | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const anonRef = useRef<string | null>(null);

  useEffect(() => {
    anonRef.current = getAnonId();
  }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [msgs, pending]);

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

  function reset() {
    setMsgs([]);
    setNcm(null);
    setData(null);
  }

  const confidence = data?.analysis?.ncmMeta?.confidence;
  const ncmTitle = data?.analysis?.pcram?.title ?? data?.productPreview?.title ?? data?.analysis?.normalizedTitle;

  const chatMessages = msgs.map((m, i) => ({
    id: `clasificador-${i}-${m.ts}`,
    role: m.role,
    content: m.content,
    ts: m.ts,
  }));

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#030712]" style={{ fontFamily: "var(--font-body, 'Inter', sans-serif)" }}>
      <header className="flex items-center justify-between border-b border-white/[0.07] bg-[#030712]/90 px-3 py-3 pt-safe backdrop-blur-md sm:px-6">
        <Link href="/" className="flex min-h-[44px] items-center gap-2 sm:min-h-0">
          <Image src="/brand/ecomex-logo.png" alt="E-COMEX" width={90} height={20} className="h-5 brightness-0 invert" />
          <span className="hidden text-[13px] font-medium text-[#A7B3C2] sm:inline">Clasificador NCM</span>
        </Link>
        <button
          type="button"
          onClick={reset}
          className="min-h-[44px] rounded-lg border border-white/[0.08] px-3 text-[12px] text-slate-500 transition hover:border-white/[0.15] hover:text-slate-300 sm:min-h-0 sm:py-1.5"
        >
          Nuevo caso
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          ref={scrollRef}
          className="chat-thread-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain scroll-smooth px-3 py-5 sm:px-6 sm:py-6"
        >
          <div className="mx-auto max-w-[min(100%,640px)]">
            {msgs.length === 0 && !pending ? (
              <div className="flex flex-col items-center px-2 py-10 text-center sm:py-14">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#18C3D6]/20 bg-[#18C3D6]/10 shadow-lg shadow-black/20">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#18C3D6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                </div>
                <h1
                  className="mt-6 text-[22px] font-bold tracking-tight text-white sm:text-[24px]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Clasificador NCM
                </h1>
                <p className="mt-3 max-w-[400px] text-[14px] leading-relaxed text-slate-500">
                  Describí el producto que querés importar y te devolvemos la posición arancelaria.
                </p>
                <div className="mt-8 flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={pending}
                      onClick={() => void send(s)}
                      className="min-h-[48px] w-full touch-manipulation rounded-xl border border-white/[0.08] bg-[#0f172a]/80 px-4 py-3 text-left text-[13px] leading-snug text-slate-400 transition hover:border-[#18C3D6]/25 hover:text-slate-200 active:scale-[0.99] disabled:opacity-40 sm:min-h-0 sm:w-auto sm:px-3 sm:py-2.5 sm:text-[12px]"
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

        {ncm ? (
          <div className="shrink-0 border-t border-white/[0.04] bg-[#0b1220]/60 px-3 py-4 sm:px-6 sm:py-5">
            <div className="mx-auto flex max-w-[640px] flex-col gap-3">
              <div className="rounded-2xl border border-[#18C3D6]/25 bg-[#18C3D6]/[0.06] p-4 sm:p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5A6577]">Posición NCM</p>
                <p className="mt-1 font-mono text-[24px] font-bold leading-tight text-white sm:text-[28px]">{ncm}</p>
                {ncmTitle ? (
                  <p className="mt-2 text-[13px] leading-relaxed text-[#A7B3C2]">{ncmTitle}</p>
                ) : null}
                {typeof confidence === "number" ? (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-[#18C3D6]"
                        style={{ width: `${Math.round(confidence * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-[#5A6577]">
                      {Math.round(confidence * 100)}% confianza
                    </span>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] leading-relaxed text-[#5A6577]">
                  Clasificación orientativa. La validamos con un despachante del equipo de E-COMEX antes de operar.
                </p>
                <button
                  type="button"
                  onClick={reset}
                  className="min-h-[44px] text-[12px] text-slate-500 transition hover:text-slate-300 sm:min-h-0"
                >
                  Consultar otro producto
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <ChatInput
          onSend={(t) => void send(t)}
          disabled={pending}
          placeholder="Producto, precio USD, cantidad, origen (ej: Cargador USB, USD 5, 100u, China)"
        />
      </div>
    </div>
  );
}
