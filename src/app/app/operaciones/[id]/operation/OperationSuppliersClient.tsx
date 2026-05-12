"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Supplier = { id: string; name: string; country: string; contact: string | null; operationsCount: number };

export function OperationSuppliersClient({
  operationId,
  initialSuppliers,
}: {
  operationId: string;
  initialSuppliers: { id: string; name: string; country: string; contact: string | null }[];
}) {
  const router = useRouter();
  const [catalog, setCatalog] = useState<Supplier[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/app/suppliers", { credentials: "include" });
        const json = (await res.json()) as { suppliers?: Supplier[]; error?: string };
        if (!res.ok) throw new Error(json.error || "Error");
        if (!cancelled) setCatalog(json.suppliers ?? []);
      } catch {
        if (!cancelled) setCatalog([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const linkedIds = new Set(initialSuppliers.map((s) => s.id));
  const options = catalog.filter((s) => !linkedIds.has(s.id));

  async function linkSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/app/operations/${operationId}/suppliers`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ supplierId: selectedId }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Error al vincular.");
      setSelectedId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Proveedores</p>

      {initialSuppliers.length === 0 ? (
        <p className="mt-2 text-[13px] text-[#555c6b]">Ningún proveedor vinculado aún.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {initialSuppliers.map((s) => (
            <li key={s.id} className="rounded-lg border border-white/[0.04] bg-[#0B1622] px-3 py-2">
              <p className="text-[13px] font-medium text-white">{s.name}</p>
              <p className="text-[11px] text-[#555c6b]">
                {s.country}
                {s.contact ? ` · ${s.contact}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={(e) => void linkSupplier(e)} className="mt-3 space-y-2">
        <label className="block text-[11px] text-[#555c6b]">Agregar proveedor existente</label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="min-h-[44px] flex-1 rounded-lg border border-white/[0.08] bg-[#0B1622] px-3 py-2 text-[13px] text-white outline-none"
          >
            <option value="">Seleccionar…</option>
            {options.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.country})
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={pending || !selectedId}
            className="min-h-[44px] rounded-lg border border-[#18C3D6]/40 bg-[#18C3D6]/15 px-4 text-[12px] font-medium text-[#18C3D6] disabled:opacity-40"
          >
            {pending ? "…" : "Vincular"}
          </button>
        </div>
        {options.length === 0 && catalog.length > 0 ? (
          <p className="text-[11px] text-[#555c6b]">Todos tus proveedores ya están vinculados o no hay más en el directorio.</p>
        ) : null}
        {catalog.length === 0 ? (
          <p className="text-[11px] text-[#555c6b]">
            No tenés proveedores en el directorio. Creá uno en{" "}
            <a href="/app/proveedores" className="text-[#18C3D6] hover:underline">
              Proveedores
            </a>
            .
          </p>
        ) : null}
        {error ? <p className="text-[11px] text-rose-400">{error}</p> : null}
      </form>
    </div>
  );
}
