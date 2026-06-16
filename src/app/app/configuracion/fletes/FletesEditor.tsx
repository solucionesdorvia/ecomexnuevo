"use client";

import { useMemo, useState } from "react";

type FieldMeta = { key: string; label: string; group: string; unit: string };
type NumConfig = Record<string, number>;

type Props = {
  initialConfig: NumConfig;
  defaults: NumConfig;
  fields: FieldMeta[];
  groupOrder: string[];
  endpoint: string;
};

export function FletesEditor({ initialConfig, defaults, fields, groupOrder, endpoint }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, String(initialConfig[f.key] ?? defaults[f.key])]))
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, FieldMeta[]>();
    for (const g of groupOrder) map.set(g, []);
    for (const f of fields) (map.get(f.group) ?? map.set(f.group, []).get(f.group)!).push(f);
    return map;
  }, [fields, groupOrder]);

  function setField(key: string, raw: string) {
    setValues((v) => ({ ...v, [key]: raw }));
    setMsg(null);
  }

  function restoreDefaults() {
    setValues(Object.fromEntries(fields.map((f) => [f.key, String(defaults[f.key])])));
    setMsg(null);
  }

  async function onSave() {
    if (saving) return;
    const payload: Record<string, number> = {};
    for (const f of fields) {
      const n = Number(values[f.key]);
      if (!Number.isFinite(n) || n < 0) {
        setMsg({ kind: "err", text: `Valor inválido en "${f.label}".` });
        return;
      }
      payload[f.key] = n;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (res.ok) setMsg({ kind: "ok", text: "Tarifas guardadas. Ya se aplican a las nuevas cotizaciones." });
      else setMsg({ kind: "err", text: "No se pudo guardar. Reintentá." });
    } catch {
      setMsg({ kind: "err", text: "No se pudo guardar. Reintentá." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {Array.from(grouped.entries()).map(([group, items]) =>
        items.length ? (
          <div key={group} className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0B1622]">
            <div className="border-b border-white/[0.05] px-5 py-3">
              <h3 className="text-[13px] font-semibold text-white">{group}</h3>
            </div>
            <div className="grid gap-px bg-white/[0.03] sm:grid-cols-2">
              {items.map((f) => {
                const changed = Number(values[f.key]) !== defaults[f.key];
                return (
                  <div key={f.key} className="bg-[#0B1622] px-5 py-3">
                    <label className="flex items-center justify-between gap-2 text-[12px] text-[#94a3b8]">
                      <span>{f.label}</span>
                      {changed && (
                        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-400">
                          modificado
                        </span>
                      )}
                    </label>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[11px] text-[#4a5568]">{f.unit}</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min={0}
                        value={values[f.key]}
                        onChange={(e) => setField(f.key, e.target.value)}
                        className="w-full rounded-lg border border-white/[0.08] bg-[#0a0f17] px-3 py-1.5 text-[14px] text-white outline-none focus:border-[#18C3D6]/40"
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-[#3d4a5a]">Default: {f.unit} {defaults[f.key]}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving}
          className="rounded-lg bg-[#18C3D6] px-4 py-2 text-[13px] font-bold text-[#06222a] transition hover:brightness-105 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar tarifas"}
        </button>
        <button
          type="button"
          onClick={restoreDefaults}
          className="rounded-lg border border-white/[0.08] px-4 py-2 text-[13px] font-medium text-[#94a3b8] transition hover:text-white"
        >
          Restaurar valores por defecto
        </button>
        {msg && (
          <span className={`text-[12px] ${msg.kind === "ok" ? "text-emerald-400" : "text-rose-400"}`}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}
