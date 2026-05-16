"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to monitoring service when available
    console.error("[GlobalError]", error.message, error.digest ?? "");
  }, [error]);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-[#030712] px-4 text-center"
      style={{ fontFamily: "var(--font-body, ui-sans-serif, system-ui)" }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-400">
        Error inesperado
      </p>
      <h1
        className="mt-4 text-[clamp(2rem,6vw,3.5rem)] font-extrabold leading-[1.05] tracking-tight text-white"
        style={{ fontFamily: "var(--font-display, ui-sans-serif)" }}
      >
        Algo salió mal
      </h1>
      <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-slate-500">
        Ocurrió un error inesperado. Podés intentar de nuevo o volver al inicio.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[11px] text-slate-700">
          ref: {error.digest}
        </p>
      )}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center rounded-xl bg-[#18C3D6] px-6 py-3 text-[14px] font-semibold text-[#030712] transition hover:bg-[#0ea5b9]"
        >
          Intentar de nuevo
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl border border-white/[0.1] px-6 py-3 text-[14px] font-medium text-slate-400 transition hover:border-white/[0.2] hover:text-slate-200"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
