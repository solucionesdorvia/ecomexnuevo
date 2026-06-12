"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteConsultaButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (loading) return;
    if (!window.confirm("¿Borrar esta consulta? No se puede deshacer.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/consultas/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) router.refresh();
      else alert("No se pudo borrar. Intentá de nuevo.");
    } catch {
      alert("No se pudo borrar. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onDelete()}
      disabled={loading}
      aria-label="Borrar consulta"
      className="shrink-0 rounded-lg border border-white/[0.08] px-2.5 py-1 text-[11px] font-medium text-[#94a3b8] transition hover:border-rose-500/30 hover:text-rose-400 disabled:opacity-50"
    >
      {loading ? "Borrando…" : "Borrar"}
    </button>
  );
}
