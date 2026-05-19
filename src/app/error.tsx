"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#07111A] px-6 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-500/70">Error</p>
      <h1 className="mt-3 text-[26px] font-extrabold tracking-tight text-white" style={{ fontFamily: "var(--font-display)" }}>
        Algo salió mal
      </h1>
      <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-[#5a6577]">
        Ocurrió un error inesperado. Podés intentar de nuevo o volver al inicio.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-[11px] text-[#3d4a5a]">ref: {error.digest}</p>
      ) : null}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#18C3D6] px-6 text-[14px] font-semibold text-[#030d18] transition hover:bg-[#0ea5b9]"
        >
          Intentar de nuevo
        </button>
        <Link
          href="/app"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/[0.08] px-6 text-[14px] font-medium text-[#6b7a8d] transition hover:border-white/[0.16] hover:text-[#aab4c2]"
        >
          Ir al panel
        </Link>
      </div>
    </div>
  );
}
