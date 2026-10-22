"use client";

import { useId, useState } from "react";

/**
 * Formulario corto de contacto (Etapa 1 del plan): tres datos de la operación
 * —producto, cantidad, país de origen— más el contacto, para que la consulta
 * llegue con la operación planteada desde el primer toque. Reusa /api/contact.
 *
 * Se usa en la portada (variant="hero"), en el panel de la barra móvil
 * (variant="panel") y en las páginas por vertical (con `vertical` para etiquetar
 * de qué campaña vino la consulta).
 */
const P = {
  bg: "#07111A",
  field: "#0B1622",
  border: "rgba(255,255,255,0.08)",
  t1: "#F5F7FA",
  t2: "#A7B3C2",
  t3: "#5A6577",
  cyan: "#18C3D6",
};

export function QuickLeadForm({
  variant = "hero",
  vertical,
}: {
  variant?: "hero" | "panel";
  vertical?: string;
}) {
  const uid = useId();
  const [producto, setProducto] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [pais, setPais] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!producto.trim()) {
      setError("Contanos qué producto querés importar.");
      return;
    }
    if (!email.includes("@")) {
      setError("Ingresá un email válido para que te contactemos.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const mensaje = [
        vertical ? `Vertical: ${vertical}` : null,
        `Producto: ${producto.trim()}`,
        cantidad.trim() ? `Cantidad: ${cantidad.trim()}` : null,
        pais.trim() ? `País de origen: ${pais.trim()}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), mensaje, web: vertical ?? "" }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "No pudimos enviar la consulta.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado. Probá de nuevo.");
    } finally {
      setSending(false);
    }
  }

  const fieldCls =
    "w-full rounded-lg px-4 py-3 text-[14px] outline-none transition-colors focus:border-[#18C3D6]/60";
  const fieldStyle = { background: P.field, border: `1px solid ${P.border}`, color: P.t1 } as const;
  const labelCls = "mb-1.5 block text-[12px] font-medium";

  if (sent) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-2xl border px-6 py-10 text-center"
        style={{ background: P.field, borderColor: "rgba(24,195,214,0.28)" }}
        role="status"
      >
        <svg className="h-11 w-11" style={{ color: P.cyan }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-[16px] font-semibold" style={{ color: P.t1 }}>Consulta enviada</p>
        <p className="text-[13px]" style={{ color: P.t2 }}>
          Un especialista de E-COMEX se comunica con vos a la brevedad.
        </p>
      </div>
    );
  }

  const Card = (children: React.ReactNode) =>
    variant === "hero" ? (
      <div
        className="rounded-2xl p-6 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.06] sm:p-7"
        style={{ background: P.bg }}
      >
        <div className="mb-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.15em]" style={{ color: P.cyan }}>
            Consultá tu operación
          </p>
          <p className="mt-2 text-[14px] leading-[1.6]" style={{ color: P.t2 }}>
            Decinos qué querés traer y un especialista te responde con el costo y los pasos.
          </p>
        </div>
        {children}
      </div>
    ) : (
      <div>{children}</div>
    );

  return Card(
    <form className="space-y-3" onSubmit={(e) => void submit(e)} noValidate>
      <div>
        <label htmlFor={`${uid}-prod`} className={labelCls} style={{ color: P.t2 }}>
          Qué producto
        </label>
        <input
          id={`${uid}-prod`}
          type="text"
          placeholder="Ej. máquina de prensado, autoelevador…"
          value={producto}
          onChange={(e) => setProducto(e.target.value)}
          className={fieldCls}
          style={fieldStyle}
          autoComplete="off"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-cant`} className={labelCls} style={{ color: P.t2 }}>
            Qué cantidad
          </label>
          <input
            id={`${uid}-cant`}
            type="text"
            placeholder="Ej. 1 unidad, 500 kg…"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            className={fieldCls}
            style={fieldStyle}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor={`${uid}-pais`} className={labelCls} style={{ color: P.t2 }}>
            Desde qué país
          </label>
          <input
            id={`${uid}-pais`}
            type="text"
            placeholder="Ej. China, Italia…"
            value={pais}
            onChange={(e) => setPais(e.target.value)}
            className={fieldCls}
            style={fieldStyle}
            autoComplete="off"
          />
        </div>
      </div>
      <div>
        <label htmlFor={`${uid}-mail`} className={labelCls} style={{ color: P.t2 }}>
          Tu email
        </label>
        <input
          id={`${uid}-mail`}
          type="email"
          placeholder="nombre@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldCls}
          style={fieldStyle}
          autoComplete="email"
        />
      </div>
      {error ? (
        <p className="text-[12.5px]" style={{ color: "#f8a0a0" }} role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-lg py-3 text-[14px] font-semibold text-[#030d18] transition-all hover:opacity-90 disabled:opacity-60"
        style={{ background: P.cyan }}
      >
        {sending ? "Enviando…" : "Consultar con un especialista"}
      </button>
      <p className="text-center text-[11px]" style={{ color: P.t3 }}>
        Sin compromiso. Te responde una persona, no un bot.
      </p>
    </form>
  );
}
