"use client";

import { useState } from "react";

const P = {
  bg: "#07111A",
  border: "rgba(255,255,255,0.06)",
  t1: "#F5F7FA",
  cyan: "#18C3D6",
};

export function ContactForm() {
  const [nombre, setNombre] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) { setError("Ingresá un email válido."); return; }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nombre, empresa, email, mensaje }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "Error al enviar.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border py-12 text-center" style={{ background: P.bg, borderColor: "rgba(24,195,214,0.2)" }}>
        <svg className="h-12 w-12 text-[#18C3D6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-[16px] font-semibold text-white">¡Mensaje enviado!</p>
        <p className="text-[13px]" style={{ color: "#A7B3C2" }}>
          Un especialista se comunicará con vos a la brevedad.
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-3" onSubmit={(e) => void submit(e)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          placeholder="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full rounded-lg px-4 py-3 text-[14px] outline-none transition-colors focus:border-[#18C3D6]/40"
          style={{ background: P.bg, border: `1px solid ${P.border}`, color: P.t1 }}
        />
        <input
          type="text"
          placeholder="Empresa"
          value={empresa}
          onChange={(e) => setEmpresa(e.target.value)}
          className="w-full rounded-lg px-4 py-3 text-[14px] outline-none transition-colors focus:border-[#18C3D6]/40"
          style={{ background: P.bg, border: `1px solid ${P.border}`, color: P.t1 }}
        />
      </div>
      <input
        type="email"
        placeholder="Email *"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-lg px-4 py-3 text-[14px] outline-none transition-colors focus:border-[#18C3D6]/40"
        style={{ background: P.bg, border: `1px solid ${P.border}`, color: P.t1 }}
      />
      <textarea
        rows={3}
        placeholder="Mensaje"
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
        className="w-full resize-none rounded-lg px-4 py-3 text-[14px] outline-none transition-colors focus:border-[#18C3D6]/40"
        style={{ background: P.bg, border: `1px solid ${P.border}`, color: P.t1 }}
      />
      {error ? <p className="text-[12px] text-rose-400">{error}</p> : null}
      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-lg py-3 text-[14px] font-medium text-[#030d18] transition-all hover:opacity-90 disabled:opacity-60"
        style={{ background: P.cyan }}
      >
        {sending ? "Enviando…" : "Enviar"}
      </button>
    </form>
  );
}
