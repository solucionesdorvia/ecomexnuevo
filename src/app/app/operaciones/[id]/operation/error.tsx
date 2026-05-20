"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function OperationDetailError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[OperationDetailError]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-500/70">Error</p>
      <h2 className="mt-3 text-[22px] font-extrabold tracking-tight text-white">
        No se pudo cargar el seguimiento
      </h2>
      <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-[#5a6577]">
        Ocurrió un error al cargar el detalle de importación. Intentá de nuevo en unos segundos.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-[11px] text-[#3d4a5a]">ref: {error.digest}</p>
      ) : null}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-[#18C3D6] px-5 text-[13px] font-semibold text-[#030d18] transition hover:bg-[#0ea5b9]"
        >
          Reintentar
        </button>
        <Link
          href="/app/operaciones"
          className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-white/[0.08] px-5 text-[13px] font-medium text-[#6b7a8d] transition hover:border-white/[0.16] hover:text-[#aab4c2]"
        >
          ← Volver a operaciones
        </Link>
      </div>
    </div>
  );
}
