"use client";

import Link from "next/link";
import { useState } from "react";

export default function RegisterClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [importInterest, setImportInterest] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: name.trim() || undefined,
          company: company.trim() || undefined,
          importInterest: importInterest.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "Error.");
      window.location.href = "/app";
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
        Crear cuenta
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[#555c6b]">Registrate para guardar tu historial de operaciones.</p>

      <form className="mt-7 space-y-3 sm:mt-8" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre (opcional)"
            type="text"
            autoComplete="given-name"
            className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07111A]/80 px-4 py-3 text-[16px] text-white outline-none placeholder:text-[#555c6b] focus:border-[#18C3D6]/50 focus:ring-1 focus:ring-[#18C3D6]/30 sm:min-h-0 sm:text-[14px]"
          />
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Empresa (opcional)"
            type="text"
            autoComplete="organization"
            className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07111A]/80 px-4 py-3 text-[16px] text-white outline-none placeholder:text-[#555c6b] focus:border-[#18C3D6]/50 focus:ring-1 focus:ring-[#18C3D6]/30 sm:min-h-0 sm:text-[14px]"
          />
        </div>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          autoComplete="email"
          className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07111A]/80 px-4 py-3 text-[16px] text-white outline-none placeholder:text-[#555c6b] focus:border-[#18C3D6]/50 focus:ring-1 focus:ring-[#18C3D6]/30 sm:min-h-0 sm:text-[14px]"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          type="password"
          autoComplete="new-password"
          className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07111A]/80 px-4 py-3 text-[16px] text-white outline-none placeholder:text-[#555c6b] focus:border-[#18C3D6]/50 focus:ring-1 focus:ring-[#18C3D6]/30 sm:min-h-0 sm:text-[14px]"
        />
        <input
          value={importInterest}
          onChange={(e) => setImportInterest(e.target.value)}
          placeholder="¿Qué te interesa importar? (opcional)"
          type="text"
          className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07111A]/80 px-4 py-3 text-[16px] text-white outline-none placeholder:text-[#555c6b] focus:border-[#18C3D6]/50 focus:ring-1 focus:ring-[#18C3D6]/30 sm:min-h-0 sm:text-[14px]"
        />
        {error ? <p className="rounded-xl bg-red-500/10 px-4 py-3 text-[13px] leading-snug text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#18C3D6] py-3 text-[15px] font-medium text-[#030d18] transition-colors hover:bg-[#0ea5b9] disabled:opacity-50 sm:min-h-[44px] sm:text-[14px]"
        >
          {pending ? "Creando..." : "Crear cuenta"}
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-3 text-[13px] sm:flex-row sm:items-center sm:justify-between">
        <Link href="/login" className="min-h-[44px] text-[#555c6b] transition-colors hover:text-white sm:min-h-0">
          Ya tengo cuenta
        </Link>
        <Link href="/" className="min-h-[44px] text-[#555c6b] transition-colors hover:text-white sm:min-h-0">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
