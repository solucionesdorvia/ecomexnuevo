"use client";

import { useState } from "react";

export function PdfDownloadButton({ href, filename = "E-COMEX - Cotizacion.pdf" }: { href: string; filename?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const res = await fetch(href, { credentials: "include" });
      if (!res.ok) {
        const json = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(json?.error ?? `Error ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar el PDF. Intentá de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void download()}
        disabled={pending}
        aria-label={pending ? "Generando PDF…" : "Descargar cotización en PDF"}
        className="flex items-center gap-1.5 rounded-lg bg-[#18C3D6] px-4 py-2.5 text-[12px] font-semibold text-[#030d18] transition-colors hover:bg-[#0ea5b9] disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? (
          <>
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" />
            </svg>
            Generando…
          </>
        ) : (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Descargar PDF
          </>
        )}
      </button>
      {error && <p className="text-[11px] text-rose-400">{error}</p>}
    </div>
  );
}
