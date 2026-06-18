"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const missingToken = !token;

  async function submit() {
    if (!password || !confirm) return;
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "No se pudo restablecer.");
      setDone(true);
      setTimeout(() => router.push("/account/login"), 1800);
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
          Nueva contraseña
        </h1>

        {missingToken ? (
          <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-4 text-[13px] leading-relaxed text-rose-300">
            Falta el enlace o está incompleto. Pedí un enlace nuevo desde{" "}
            <Link href="/account/forgot" className="underline">restablecer contraseña</Link>.
          </div>
        ) : done ? (
          <div className="mt-6 rounded-xl border border-[#18C3D6]/20 bg-[#18C3D6]/[0.06] px-4 py-4 text-[13px] leading-relaxed text-[#aab4c2]">
            ✓ Contraseña actualizada. Te llevamos a iniciar sesión…
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#5a6577]">Elegí una contraseña de al menos 8 caracteres.</p>
            <div className="mt-6 space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nueva contraseña"
                className="w-full rounded-xl border border-white/[0.08] bg-[#07111A] px-4 py-3 text-[14px] text-white outline-none placeholder:text-[#3d4a5a] transition focus:border-[#18C3D6]/40 focus:ring-2 focus:ring-[#18C3D6]/15"
                autoComplete="new-password"
                minLength={8}
                autoFocus
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repetí la contraseña"
                className="w-full rounded-xl border border-white/[0.08] bg-[#07111A] px-4 py-3 text-[14px] text-white outline-none placeholder:text-[#3d4a5a] transition focus:border-[#18C3D6]/40 focus:ring-2 focus:ring-[#18C3D6]/15"
                autoComplete="new-password"
                minLength={8}
              />
              {error && (
                <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-[13px] text-rose-400">
                  {error}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={pending || !password || !confirm}
              className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#18C3D6] px-6 text-[14px] font-semibold text-[#030d18] transition-all hover:bg-[#0ea5b9] disabled:opacity-50"
            >
              {pending ? "Guardando…" : "Guardar contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
