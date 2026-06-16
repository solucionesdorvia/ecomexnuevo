"use client";

import { useEffect, useState, useCallback } from "react";

type Row = {
  id: string;
  name: string;
  ncm: string;
  ncmDescription: string | null;
  confidence: number | null;
  source: string;
  defaultUse: string | null;
  timesUsed: number;
  verified: boolean;
  updatedAt: string;
};

export function NcmCatalogClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [ncm, setNcm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async (query = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/ncm${query ? `?q=${encodeURIComponent(query)}` : ""}`, {
        credentials: "include",
      });
      const data = await res.json();
      setRows(data.rows ?? []);
      setPending(Boolean(data.pendingMigration));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    if (!name.trim() || !ncm.trim()) return;
    setMsg(null);
    const res = await fetch("/api/admin/ncm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, ncm }),
    });
    if (res.ok) {
      setName("");
      setNcm("");
      void load(q);
    } else {
      const d = await res.json().catch(() => ({}));
      setMsg(d.error ?? "No se pudo guardar.");
    }
  }

  async function toggleVerified(r: Row) {
    await fetch(`/api/admin/ncm/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ verified: !r.verified }),
    });
    void load(q);
  }

  async function remove(r: Row) {
    if (!window.confirm(`¿Borrar "${r.name}" del catálogo?`)) return;
    await fetch(`/api/admin/ncm/${r.id}`, { method: "DELETE", credentials: "include" });
    void load(q);
  }

  return (
    <div className="space-y-5">
      {pending && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.08] px-4 py-3 text-[12px] text-amber-300">
          La tabla del catálogo todavía no está creada en la base. Aplicá la migración en Neon y recargá.
        </div>
      )}

      {/* Alta manual */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0B1622] p-4">
        <p className="mb-2 text-[12px] font-semibold text-white">Agregar / curar una clasificación</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Producto (ej. Torno paralelo CS6266C)"
            className="flex-1 rounded-lg border border-white/[0.08] bg-[#0a0f17] px-3 py-2 text-[13px] text-white outline-none focus:border-[#18C3D6]/40"
          />
          <input
            value={ncm}
            onChange={(e) => setNcm(e.target.value)}
            placeholder="NCM (8458.11.00)"
            className="w-full rounded-lg border border-white/[0.08] bg-[#0a0f17] px-3 py-2 text-[13px] text-white outline-none focus:border-[#18C3D6]/40 sm:w-44"
          />
          <button
            type="button"
            onClick={() => void add()}
            className="rounded-lg bg-[#18C3D6] px-4 py-2 text-[13px] font-bold text-[#06222a] transition hover:brightness-105"
          >
            Guardar
          </button>
        </div>
        {msg && <p className="mt-2 text-[12px] text-rose-400">{msg}</p>}
      </div>

      {/* Buscador */}
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          void load(e.target.value);
        }}
        placeholder="Buscar por producto o NCM…"
        className="w-full rounded-lg border border-white/[0.08] bg-[#0a0f17] px-3 py-2 text-[13px] text-white outline-none focus:border-[#18C3D6]/40"
      />

      {/* Tabla */}
      {loading ? (
        <p className="text-[13px] text-[#5a6577]">Cargando…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0B1622] px-5 py-10 text-center text-[13px] text-[#5a6577]">
          Todavía no hay productos en el catálogo. Se va llenando solo a medida que cotizás, o agregá uno a mano.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#0B1622] px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[13px] font-semibold text-white">{r.name}</p>
                  {r.verified && (
                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-400">verificado</span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-[#5a6577]">
                  <span className="font-mono text-[#18C3D6]">{r.ncm}</span>
                  {r.ncmDescription ? ` · ${r.ncmDescription}` : ""} · usado {r.timesUsed}× · {r.source}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => void toggleVerified(r)}
                  className="rounded-lg border border-white/[0.08] px-2.5 py-1 text-[11px] text-[#94a3b8] transition hover:text-white"
                >
                  {r.verified ? "Quitar verif." : "Verificar"}
                </button>
                <button
                  type="button"
                  onClick={() => void remove(r)}
                  className="rounded-lg border border-white/[0.08] px-2.5 py-1 text-[11px] text-[#94a3b8] transition hover:border-rose-500/30 hover:text-rose-400"
                >
                  Borrar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
