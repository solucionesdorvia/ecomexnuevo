"use client";

import { useState } from "react";

type Row = {
  query: string;
  ncm: string | null;
  description: string;
  diePct: number | null;
  confidence: "verificado" | "estimado" | "sin_match";
  alternatives: string[];
};
type Resp = {
  ok: boolean;
  error?: string;
  resumen?: { total: number; verificados: number; estimados: number; sinMatch: number };
  results?: Row[];
};

const EJEMPLO = "notebook gamer 16gb\nremera de algodon\ntaladro percutor\nperfume importado\nheladera con freezer";

function badge(c: Row["confidence"]) {
  if (c === "verificado") return { txt: "Verificado", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" };
  if (c === "estimado") return { txt: "Estimado", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
  return { txt: "Sin match", cls: "bg-rose-500/15 text-rose-300 border-rose-500/30" };
}

export function MasivoClient() {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [resumen, setResumen] = useState<Resp["resumen"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function clasificar() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/app/clasificar-masivo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = (await res.json()) as Resp;
      if (!res.ok || !json.ok) throw new Error(json.error || "Error al clasificar.");
      setRows(json.results ?? []);
      setResumen(json.resumen ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    const header = "Producto,NCM,Descripcion,DIE%,Confianza,Alternativas\n";
    const body = rows
      .map((r) =>
        [r.query, r.ncm ?? "", r.description, r.diePct ?? "", r.confidence, r.alternatives.join(" | ")]
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clasificacion-masiva.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6">
      <h1 className="text-[20px] font-bold text-white">Clasificación masiva</h1>
      <p className="mt-1 text-[13px] text-slate-400">
        Pegá tu catálogo (un producto por línea) y obtené el NCM y el DIE de cada uno. Usa el catálogo
        verificado primero; el resto lo estima el motor. Revisá los marcados como “estimado”.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={EJEMPLO}
          rows={8}
          className="w-full rounded-xl border border-white/10 bg-[#0b1220] px-3 py-2 font-mono text-[13px] text-slate-100 outline-none focus:border-[#18C3D6]/40"
        />
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={clasificar}
            disabled={loading || text.trim().length < 2}
            className="rounded-lg bg-[#18C3D6] px-4 py-2 text-sm font-semibold text-[#04121a] disabled:opacity-50"
          >
            {loading ? "Clasificando…" : "Clasificar lista"}
          </button>
          {rows.length > 0 && (
            <button type="button" onClick={exportCsv} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/5">
              Exportar CSV
            </button>
          )}
          <button type="button" onClick={() => setText(EJEMPLO)} className="text-[12px] text-slate-500 underline">
            cargar ejemplo
          </button>
        </div>
      </div>

      {err && <p className="mt-3 text-[13px] text-rose-400">{err}</p>}

      {resumen && (
        <div className="mt-5 flex flex-wrap gap-3 text-[12px]">
          <span className="rounded-md border border-white/10 px-2.5 py-1 text-slate-300">{resumen.total} productos</span>
          <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">{resumen.verificados} verificados</span>
          <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-300">{resumen.estimados} estimados</span>
          {resumen.sinMatch > 0 && <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-rose-300">{resumen.sinMatch} sin match</span>}
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-[12.5px]">
            <thead className="bg-white/[0.04] text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Producto</th>
                <th className="px-3 py-2 text-left font-semibold">NCM</th>
                <th className="px-3 py-2 text-left font-semibold">Descripción</th>
                <th className="px-3 py-2 text-right font-semibold">DIE</th>
                <th className="px-3 py-2 text-left font-semibold">Confianza</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const b = badge(r.confidence);
                return (
                  <tr key={i} className="border-t border-white/[0.06]">
                    <td className="px-3 py-2 text-slate-200">{r.query}</td>
                    <td className="px-3 py-2 font-mono text-amber-300">{r.ncm ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-400">{r.description || "—"}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{r.diePct != null ? `${r.diePct}%` : "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${b.cls}`}>{b.txt}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
