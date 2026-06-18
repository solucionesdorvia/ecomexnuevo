"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit() {
    if (!email) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "No se pudo procesar el pedido.");
      setDone(json.message ?? "Si el email está registrado, te enviamos un enlace.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0B1622] p-7 shadow-[0_32px_80px_-40px_rgba(0,0,0,0.6)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#18C3D6]/30 to-transparent" />
      <div className="relative">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#3d4a5a]">Sistema E-COMEX</p>
        <h1 className="mt-2 text-[22px] font-extrabold tracking-tight text-white" style={{ fontFamily: "var(--font-display, 'Manrope', sans-serif)" }}>
          Restablecer contraseña
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#5a6577]">
          Ingresá tu email y te mandamos un enlace para crear una nueva.
        </p>

        {done ? (
          <div className="mt-6 rounded-xl border border-[#18C3D6]/20 bg-[#18C3D6]/[0.06] px-4 py-4 text-[13px] leading-relaxed text-[#aab4c2]">
            {done}
            <div className="mt-3">
              <Link href="/account/login" className="text-[#18C3D6] hover:underline">← Volver a iniciar sesión</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate>
            <div className="mt-6 space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@empresa.com"
                className="w-full rounded-xl border border-white/[0.08] bg-[#07111A] px-4 py-3 text-[14px] text-white outline-none placeholder:text-[#3d4a5a] transition focus:border-[#18C3D6]/40 focus:ring-2 focus:ring-[#18C3D6]/15"
                autoComplete="email"
                autoFocus
              />
              {error && (
                <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-[13px] text-rose-400">
                  {error}
                </div>
              )}
            </div>
            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
              <button
                type="submit"
                disabled={pending || !email}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[#18C3D6] px-6 text-[14px] font-semibold text-[#030d18] transition-all hover:bg-[#0ea5b9] disabled:opacity-50"
              >
                {pending ? "Enviando…" : "Enviar enlace"}
              </button>
              <Link
                href="/account/login"
                className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-white/[0.08] px-6 text-[14px] font-medium text-[#6b7a8d] transition-colors hover:border-white/[0.15] hover:text-[#aab4c2]"
              >
                Volver
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
