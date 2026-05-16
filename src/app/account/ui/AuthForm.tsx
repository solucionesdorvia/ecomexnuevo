"use client";

import Link from "next/link";
import { useState } from "react";

export default function AuthForm({
  title,
  endpoint,
  alternateHref,
  alternateLabel,
  submitLabel,
  redirectTo,
}: {
  title: string;
  endpoint: "/api/auth/login" | "/api/auth/register";
  submitLabel: string;
  alternateHref: string;
  alternateLabel: string;
  redirectTo?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email || !password) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Error al iniciar sesión.");
      }
      // Si hay redirectTo válido (path interno), usarlo; sino /app
      const dest =
        redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
          ? redirectTo
          : "/app";
      window.location.href = dest;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0B1622] p-7 shadow-[0_32px_80px_-40px_rgba(0,0,0,0.6)]">
      {/* Top shimmer */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#18C3D6]/30 to-transparent" />
      {/* Glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#18C3D6]/[0.06] blur-3xl" />

      <div className="relative">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#3d4a5a]">Sistema E-COMEX</p>
        <h1 className="mt-2 text-[22px] font-extrabold tracking-tight text-white" style={{ fontFamily: "var(--font-display, 'Manrope', sans-serif)" }}>
          {title}
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#5a6577]">
          Accedé a tu panel de importaciones.
        </p>

        <div className="mt-6 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
            placeholder="email@empresa.com"
            className="w-full rounded-xl border border-white/[0.08] bg-[#07111A] px-4 py-3 text-[14px] text-white outline-none placeholder:text-[#3d4a5a] transition focus:border-[#18C3D6]/40 focus:ring-2 focus:ring-[#18C3D6]/15"
            autoComplete="email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
            placeholder="Contraseña"
            className="w-full rounded-xl border border-white/[0.08] bg-[#07111A] px-4 py-3 text-[14px] text-white outline-none placeholder:text-[#3d4a5a] transition focus:border-[#18C3D6]/40 focus:ring-2 focus:ring-[#18C3D6]/15"
            autoComplete={endpoint === "/api/auth/register" ? "new-password" : "current-password"}
          />

          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-[13px] text-rose-400">
              {error}
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            disabled={pending || !email || !password}
            onClick={() => void submit()}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[#18C3D6] px-6 text-[14px] font-semibold text-[#030d18] transition-all hover:bg-[#0ea5b9] disabled:opacity-50"
          >
            {pending ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : submitLabel}
          </button>
          <Link
            href={alternateHref}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-white/[0.08] px-6 text-[14px] font-medium text-[#6b7a8d] transition-colors hover:border-white/[0.15] hover:text-[#aab4c2]"
          >
            {alternateLabel}
          </Link>
        </div>

        <p className="mt-5 text-[12px] text-[#3d4a5a]">
          ¿Sin cuenta todavía?{" "}
          <Link href="/cotizador" className="text-[#18C3D6] hover:underline">
            Cotizá gratis sin registrarte →
          </Link>
        </p>
      </div>
    </div>
  );
}
