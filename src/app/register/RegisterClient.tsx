"use client";

import Link from "next/link";
import { useState } from "react";

export default function RegisterClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json()) as any;
      if (!res.ok || !json.ok) throw new Error(json.error || "Error.");
      window.location.href = "/app";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-[380px]">
      <img src="/brand/ecomex-logo.png" alt="E-COMEX" className="h-6 brightness-0 invert" />
      <h1 className="mt-8 text-[22px] font-extrabold tracking-tight text-white" style={{ fontFamily: "var(--font-display)" }}>
        Crear cuenta
      </h1>
      <p className="mt-2 text-[14px] text-[#555c6b]">Registrate para guardar tu historial de operaciones.</p>

      <form className="mt-8 space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          autoComplete="email"
          className="w-full rounded-lg border border-white/[0.06] bg-[#0B1622] px-4 py-3 text-[14px] text-white outline-none placeholder:text-[#555c6b] focus:border-[#2b59ff]/40"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          type="password"
          autoComplete="new-password"
          className="w-full rounded-lg border border-white/[0.06] bg-[#0B1622] px-4 py-3 text-[14px] text-white outline-none placeholder:text-[#555c6b] focus:border-[#2b59ff]/40"
        />
        {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-[13px] text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-[#2b59ff] py-3 text-[14px] font-medium text-white transition-colors hover:bg-[#2348d4] disabled:opacity-50"
        >
          {pending ? "Creando..." : "Crear cuenta"}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between text-[13px]">
        <Link href="/login" className="text-[#555c6b] transition-colors hover:text-white">Ya tengo cuenta</Link>
        <Link href="/" className="text-[#555c6b] transition-colors hover:text-white">Volver al inicio</Link>
      </div>
    </div>
  );
}
