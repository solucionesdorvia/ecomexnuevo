"use client";

import Link from "next/link";
import { useState } from "react";

export default function AuthForm({
  title,
  endpoint,
  alternateHref,
  alternateLabel,
  submitLabel,
}: {
  title: string;
  endpoint: "/api/auth/login" | "/api/auth/register";
  submitLabel: string;
  alternateHref: string;
  alternateLabel: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
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
        throw new Error(json.error || "Error.");
      }
      window.location.href = "/account";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-border-dark bg-card-dark p-8 shadow-2xl">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
        E‑COMEX Account
      </div>
      <div className="mt-2 text-2xl font-black tracking-tight">{title}</div>
      <p className="mt-2 text-sm leading-7 text-muted">
        La cuenta es opcional. La usamos para historial y seguimiento después de
        cotizar.
      </p>

      <div className="mt-6 grid gap-3">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@empresa.com"
          className="w-full rounded-lg border border-border-dark bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-muted/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          autoComplete="email"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          type="password"
          className="w-full rounded-lg border border-border-dark bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-muted/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          autoComplete={endpoint === "/api/auth/register" ? "new-password" : "current-password"}
        />
        {error ? (
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85">
            {error}
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={pending}
          onClick={() => void submit()}
          className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-primary px-6 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-transform active:scale-95 disabled:opacity-60"
        >
          {submitLabel}
        </button>
        <Link
          href={alternateHref}
          className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-border-dark bg-white/5 px-6 text-sm font-bold text-white transition-colors hover:bg-white/10"
        >
          {alternateLabel}
        </Link>
      </div>

      <div className="mt-4 text-xs text-muted">
        Volver al chat:{" "}
        <Link href="/chat" className="text-white hover:underline">
          /chat
        </Link>
      </div>
    </div>
  );
}

