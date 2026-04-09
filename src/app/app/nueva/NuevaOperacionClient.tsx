"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };
type ServerResponse = {
  assistantMessage: string;
  cards?: any[];
  productPreview?: any;
  ncm?: string;
  quality?: number;
  assumptions?: any[];
  breakdown?: any;
  analysis?: any;
};

function getAnonId() {
  try {
    const key = "ecomex_anon_id";
    const existing = window.localStorage.getItem(key);
    if (existing && existing.length >= 12) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
    return id;
  } catch { return null; }
}

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function NuevaOperacionClient() {
  const [input, setInput] = useState("");
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [pending, setPending] = useState(false);
  const [data, setData] = useState<ServerResponse | null>(null);
  const anonRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const invoiceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { anonRef.current = getAnonId(); }, []);
  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages, pending]);

  async function send() {
    const text = input.trim();
    const hasInvoices = invoiceFiles.length > 0;
    if (pending) return;
    if (!text && !hasInvoices) return;

    const userLine =
      text ||
      (hasInvoices ? `[SOURCE_INVOICE] ${invoiceFiles.map((f) => f.name).join(", ")}` : "");
    setInput("");

    const next: Msg[] = [...messages, { role: "user", content: userLine }];
    setMessages(next);
    setPending(true);

    const useInvoiceMultipart = hasInvoices;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          ...(useInvoiceMultipart
            ? {}
            : { "content-type": "application/json" }),
          ...(anonRef.current ? { "x-ecomex-anon": anonRef.current } : {}),
        },
        credentials: "include",
        body: useInvoiceMultipart
          ? (() => {
              const fd = new FormData();
              fd.set("json", JSON.stringify({ mode: "quote", messages: next }));
              for (const f of invoiceFiles) fd.append("invoice", f);
              return fd;
            })()
          : JSON.stringify({ mode: "quote", messages: next }),
      });
      const json = (await res.json()) as ServerResponse;
      if (!res.ok) throw new Error(json?.assistantMessage || "Error");
      setMessages((prev) => [...prev, { role: "assistant", content: json.assistantMessage }]);
      setData(json);
      if (useInvoiceMultipart) setInvoiceFiles([]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", content: e instanceof Error ? e.message : "Error inesperado." }]);
    } finally {
      setPending(false);
    }
  }

  const preview = data?.productPreview;
  const cards = data?.cards;
  const ncm = data?.ncm;
  const analysis = data?.analysis;
  const total = cards?.find((c) => c.label === "Total puesto en Argentina");

  return (
    <div className="flex h-full">
      <input
        ref={invoiceInputRef}
        type="file"
        multiple
        accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg,.webp,application/pdf"
        className="hidden"
        aria-hidden
        onChange={(e) => {
          const list = e.target.files;
          setInvoiceFiles(list && list.length ? Array.from(list) : []);
          e.target.value = "";
        }}
      />
      {/* Main — chat/assistant */}
      <div className="flex flex-1 flex-col">
        {/* Messages */}
        <div ref={scrollRef} className="relative flex-1 overflow-y-auto p-6 lg:p-8">
          {/* Grid texture behind empty state */}
          {messages.length === 0 && (
            <div className="pointer-events-none absolute inset-0 opacity-40" style={{
              backgroundImage: "linear-gradient(rgba(43,89,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(43,89,255,0.03) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage: "radial-gradient(ellipse 50% 40% at 50% 45%, black, transparent 70%)",
              WebkitMaskImage: "radial-gradient(ellipse 50% 40% at 50% 45%, black, transparent 70%)",
            }} />
          )}

          <div className="relative mx-auto max-w-[700px] space-y-6">
            {messages.length === 0 && !pending && (
              <div className="flex min-h-[50vh] flex-col items-center justify-center py-12">
                {/* Glow behind icon */}
                <div className="relative">
                  <div className="absolute -inset-6 rounded-full bg-[#2b59ff] opacity-[0.06] blur-[30px]" />
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[#2b59ff]/15 bg-[#2b59ff]/8">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2b59ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                  </div>
                </div>
                <h2 className="mt-6 text-[20px] font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                  Nueva operación
                </h2>
                <p className="mt-2 max-w-[380px] text-center text-[14px] leading-relaxed text-[#4a5568]">
                  Pegá un link, describí el producto, o contanos qué querés importar. El sistema analiza y estructura todo.
                </p>
                <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { label: "Pegar link", sub: "Alibaba, 1688, proveedor", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101", color: "#2b59ff" },
                    { label: "Describir producto", sub: "Texto libre, especificaciones", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z", color: "#7c3aed" },
                    { label: "Subir factura", sub: "PDF, proforma, imagen", icon: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12", color: "#2b59ff" },
                  ].map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => {
                        if (s.label === "Subir factura") {
                          invoiceInputRef.current?.click();
                          return;
                        }
                        setInput(s.label === "Pegar link" ? "https://" : "");
                      }}
                      className="group relative flex flex-col items-center overflow-hidden rounded-xl border border-white/[0.04] bg-[#0B1622] p-6 text-center transition-all duration-300 hover:border-white/[0.08]"
                    >
                      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: `radial-gradient(circle at 50% 0%, ${s.color}08, transparent 70%)` }} />
                      <div className="absolute top-0 left-0 right-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: `linear-gradient(90deg, transparent, ${s.color}30, transparent)` }} />
                      <div className="relative">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4a5568" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-300 group-hover:stroke-white">
                          <path d={s.icon} />
                        </svg>
                      </div>
                      <span className="relative mt-4 text-[13px] font-semibold text-white">{s.label}</span>
                      <span className="relative mt-1 text-[11px] text-[#4a5568]">{s.sub}</span>
                    </button>
                  ))}
                </div>

                {/* System status indicator */}
                <div className="mt-10 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
                  <span className="text-[11px] text-[#4a5568]">Sistema activo · Análisis en tiempo real</span>
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-xl px-4 py-3 text-[14px] leading-[1.7] ${
                  m.role === "user"
                    ? "bg-[#2b59ff]/8 text-white border border-[#2b59ff]/10"
                    : "bg-[#0B1622] text-[#94a3b8] border border-white/[0.04]"
                }`}>
                  {m.role === "assistant" && (
                    <div className="mb-2 flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#2b59ff]" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#4a5568]">E-COMEX</span>
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
                  <div className="h-2 w-2 animate-pulse rounded-full bg-[#2b59ff]" />
                  <span className="text-[13px] text-[#555c6b]">Analizando...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-white/[0.04] bg-[#060d16] px-4 py-4">
          <div className="mx-auto max-w-[700px] space-y-2">
            {invoiceFiles.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#2b59ff]/20 bg-[#2b59ff]/5 px-3 py-2 text-[12px] text-[#94a3b8]">
                <span className="text-[#555c6b]">Factura:</span>
                {invoiceFiles.map((f) => (
                  <span key={`${f.name}-${f.size}`} className="rounded-md bg-white/[0.06] px-2 py-0.5 font-medium text-white">
                    {f.name}
                  </span>
                ))}
                <button
                  type="button"
                  className="ml-auto text-[11px] text-[#2b59ff] underline hover:text-white"
                  onClick={() => setInvoiceFiles([])}
                >
                  Quitar
                </button>
              </div>
            ) : null}
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#0B1622] pl-4 pr-2 py-1.5 transition-colors focus-within:border-[#2b59ff]/25">
              <div className="flex shrink-0 items-center gap-2">
                <div className={`h-1.5 w-1.5 rounded-full ${pending ? "animate-pulse bg-[#2b59ff]" : "bg-emerald-500"}`} />
              </div>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                placeholder="Pegá un link, describí el producto, o preguntá..."
                className="flex-1 bg-transparent py-2.5 text-[14px] text-white outline-none placeholder:text-[#4a5568]"
              />
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  className="rounded-lg p-2 text-[#4a5568] transition-colors hover:bg-white/[0.04] hover:text-[#94a3b8]"
                  title="Adjuntar factura o proforma"
                  onClick={() => invoiceInputRef.current?.click()}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>
                <button
                  type="button"
                  disabled={pending || (!input.trim() && invoiceFiles.length === 0)}
                  onClick={() => void send()}
                  className="rounded-lg bg-[#2b59ff] px-4 py-2 text-[12px] font-medium text-white transition-all hover:bg-[#2348d4] disabled:opacity-20"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side panel — context */}
      <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-l border-white/[0.04] bg-[#0B1622] p-5 lg:block">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Contexto</p>

        {preview ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-white/[0.04] bg-[#07111A] p-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Producto</p>
              <p className="mt-1 text-[13px] font-medium text-white">{preview.title ?? "—"}</p>
              {preview.origin && <p className="mt-1 text-[11px] text-[#555c6b]">Origen: {preview.origin}</p>}
            </div>

            {ncm && (
              <div className="rounded-lg border border-white/[0.04] bg-[#07111A] p-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">NCM</p>
                <p className="mt-1 font-mono text-[15px] font-bold text-white">{ncm}</p>
              </div>
            )}

            {total && (
              <div className="rounded-lg border border-white/[0.04] bg-[#07111A] p-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">{total.label}</p>
                <p className="mt-1 text-[17px] font-bold text-[#d4a843]" style={{ fontFamily: "var(--font-display)" }}>{total.value}</p>
              </div>
            )}

            {analysis?.timing && (
              <div className="rounded-lg border border-white/[0.04] bg-[#07111A] p-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Timing</p>
                <p className="mt-1 text-[13px] text-white">{analysis.timing.minDays}–{analysis.timing.maxDays} días</p>
              </div>
            )}

            <div className="space-y-2">
              <Link
                href={`/api/quote/pdf?mode=quote`}
                className="flex w-full items-center justify-center rounded-lg bg-[#2b59ff] py-2 text-[12px] font-medium text-white transition-colors hover:bg-[#2348d4]"
              >
                Descargar PDF
              </Link>
              <Link
                href="/app/operaciones"
                className="flex w-full items-center justify-center rounded-lg border border-white/[0.04] py-2 text-[12px] text-[#555c6b] transition-colors hover:text-white"
              >
                Ver operaciones
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-white/[0.04] bg-[#07111A] p-6 text-center">
            <p className="text-[13px] text-[#555c6b]">Iniciá una operación para ver el contexto acá.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
