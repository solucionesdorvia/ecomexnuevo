"use client";

import Link from "next/link";
import { useState } from "react";
import { safeInternalRedirectPath } from "@/lib/auth/safeRedirect";

export default function LoginClient({ redirectTo }: { redirectTo?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json()) as any;
      if (!res.ok || !json.ok) throw new Error(json.error || "Error.");
      window.location.href = safeInternalRedirectPath(redirectTo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-[400px] rounded-2xl border border-white/[0.08] bg-[#0B1622]/50 p-6 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.85)] backdrop-blur-sm sm:p-8">
      <img src="/brand/ecomex-logo.png" alt="E-COMEX" className="h-7 brightness-0 invert sm:h-8" />
      <h1
        className="mt-7 text-[clamp(1.25rem,4vw,1.5rem)] font-extrabold tracking-tight text-white sm:mt-8"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Iniciar sesión
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[#555c6b]">Accedé a tu cuenta para ver tu historial y operaciones.</p>

      <form className="mt-7 space-y-3 sm:mt-8" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          autoComplete="email"
          className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07111A]/80 px-4 py-3 text-[16px] text-white outline-none placeholder:text-[#555c6b] focus:border-[#2b59ff]/50 focus:ring-1 focus:ring-[#2b59ff]/30 sm:min-h-0 sm:text-[14px]"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          type="password"
          autoComplete="current-password"
          className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07111A]/80 px-4 py-3 text-[16px] text-white outline-none placeholder:text-[#555c6b] focus:border-[#2b59ff]/50 focus:ring-1 focus:ring-[#2b59ff]/30 sm:min-h-0 sm:text-[14px]"
        />
        {error ? <p className="rounded-xl bg-red-500/10 px-4 py-3 text-[13px] leading-snug text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#2b59ff] py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#2348d4] disabled:opacity-50 sm:min-h-[44px] sm:text-[14px]"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-3 text-[13px] sm:flex-row sm:items-center sm:justify-between">
        <Link href="/register" className="min-h-[44px] text-[#555c6b] transition-colors hover:text-white sm:min-h-0">
          Crear cuenta
        </Link>
        <Link href="/" className="min-h-[44px] text-[#555c6b] transition-colors hover:text-white sm:min-h-0">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
