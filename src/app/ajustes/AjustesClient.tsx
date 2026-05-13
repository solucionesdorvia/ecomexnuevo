"use client";

import { useState } from "react";

export function AjustesClient({
  initialName,
  initialCompany,
}: {
  initialName: string;
  initialCompany: string;
}) {
  const [name, setName] = useState(initialName);
  const [company, setCompany] = useState(initialCompany);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, company }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo guardar.");
      setMsg({ ok: true, text: "Ajustes guardados correctamente." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Error al guardar." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <section className="panel p-5">
          <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-muted">Perfil</h3>
          <div className="space-y-3">
            <label className="block text-xs text-muted">
              Nombre
              <input
                className="field mt-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
              />
            </label>
          </div>
        </section>

        <section className="panel p-5">
          <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-muted">Empresa</h3>
          <div className="space-y-3">
            <label className="block text-xs text-muted">
              Razón social / empresa
              <input
                className="field mt-1"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                maxLength={120}
              />
            </label>
          </div>
        </section>

        <section className="panel p-5">
          <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-muted">Preferencias</h3>
          <div className="space-y-2 text-sm text-muted">
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Notificar cambios de riesgo</label>
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Exportación PDF verificada</label>
            <label className="flex items-center gap-2"><input type="checkbox" /> Modo compacto</label>
          </div>
        </section>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="button button-primary disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar ajustes"}
        </button>
        {msg ? (
          <span className={`text-sm ${msg.ok ? "text-emerald-400" : "text-rose-400"}`}>
            {msg.text}
          </span>
        ) : null}
      </div>
    </>
  );
}
