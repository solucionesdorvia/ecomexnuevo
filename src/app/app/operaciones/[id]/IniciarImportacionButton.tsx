"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function IniciarImportacionButton({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/app/operations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ quoteId }),
      });
      const json = (await res.json()) as { operationId?: string; error?: string };
      if (!res.ok) {
        throw new Error(json.error || "No se pudo iniciar la importación.");
      }
      if (!json.operationId) {
        throw new Error("Respuesta inválida del servidor.");
      }
      router.push(`/app/operaciones/${json.operationId}/operation`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={pending}
        className="flex w-full min-h-[44px] items-center justify-center rounded-lg bg-emerald-600 py-2.5 text-[12px] font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? "Iniciando…" : "Iniciar importación con Ecomex"}
      </button>
      {error ? <p className="text-center text-[11px] text-rose-400">{error}</p> : null}
    </div>
  );
}
