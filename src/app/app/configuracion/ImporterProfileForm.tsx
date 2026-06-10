"use client";

import { useEffect, useState } from "react";
import {
  IMPORTER_PROFILE_OPTIONS,
  FISCAL_BENEFIT_OPTIONS,
  IIBB_PROVINCES,
  type ImporterProfileType,
  type FiscalBenefit,
} from "@/lib/importer/importerProfile";

type ProfileState = {
  importerProfile: ImporterProfileType | "";
  taxId: string;
  iibbProvince: string;
  fiscalBenefits: FiscalBenefit[];
};

const EMPTY: ProfileState = {
  importerProfile: "",
  taxId: "",
  iibbProvince: "",
  fiscalBenefits: [],
};

const labelCls = "text-[10px] font-semibold uppercase tracking-wider text-[#4a5568]";
const fieldCls =
  "mt-1.5 w-full rounded-lg border border-white/[0.08] bg-[#07111A] px-3 py-2 text-[13px] text-[#c8d0dc] outline-none transition focus:border-[#18C3D6]/40 disabled:opacity-50";

export function ImporterProfileForm() {
  const [form, setForm] = useState<ProfileState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/profile", { credentials: "include" })
      .then((r) => r.json())
      .then(
        (json: {
          ok?: boolean;
          user?: {
            importerProfile?: string | null;
            taxId?: string | null;
            iibbProvince?: string | null;
            fiscalBenefits?: string[] | null;
          };
        }) => {
          if (json.ok && json.user) {
            setForm({
              importerProfile: (json.user.importerProfile as ImporterProfileType) ?? "",
              taxId: json.user.taxId ?? "",
              iibbProvince: json.user.iibbProvince ?? "",
              fiscalBenefits: (json.user.fiscalBenefits as FiscalBenefit[]) ?? [],
            });
          }
        }
      )
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  function toggleBenefit(b: FiscalBenefit) {
    setSaved(false);
    setForm((prev) => ({
      ...prev,
      fiscalBenefits: prev.fiscalBenefits.includes(b)
        ? prev.fiscalBenefits.filter((x) => x !== b)
        : [...prev.fiscalBenefits, b],
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          importerProfile: form.importerProfile,
          taxId: form.taxId,
          iibbProvince: form.iibbProvince,
          fiscalBenefits: form.fiscalBenefits,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo guardar.");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-5 py-6 text-[13px] text-[#555c6b]">
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Cargando perfil…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="m-5 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-4 text-[13px] text-rose-300">
        No se pudo cargar tu perfil. Recargá la página o intentalo más tarde.
      </div>
    );
  }

  return (
    <div className="px-5 py-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Perfil fiscal */}
        <div>
          <label htmlFor="importerProfile" className={labelCls}>
            Condición fiscal
          </label>
          <select
            id="importerProfile"
            className={fieldCls}
            value={form.importerProfile}
            disabled={saving}
            onChange={(e) => {
              setSaved(false);
              setForm((prev) => ({ ...prev, importerProfile: e.target.value as ImporterProfileType | "" }));
            }}
          >
            <option value="">Seleccionar…</option>
            {IMPORTER_PROFILE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* CUIT */}
        <div>
          <label htmlFor="taxId" className={labelCls}>
            CUIT / CUIL
          </label>
          <input
            id="taxId"
            type="text"
            inputMode="numeric"
            placeholder="30-12345678-9"
            className={fieldCls}
            value={form.taxId}
            disabled={saving}
            maxLength={20}
            onChange={(e) => {
              setSaved(false);
              setForm((prev) => ({ ...prev, taxId: e.target.value }));
            }}
          />
        </div>

        {/* Provincia IIBB */}
        <div>
          <label htmlFor="iibbProvince" className={labelCls}>
            Provincia (Ingresos Brutos)
          </label>
          <select
            id="iibbProvince"
            className={fieldCls}
            value={form.iibbProvince}
            disabled={saving}
            onChange={(e) => {
              setSaved(false);
              setForm((prev) => ({ ...prev, iibbProvince: e.target.value }));
            }}
          >
            <option value="">Seleccionar…</option>
            {IIBB_PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Beneficios fiscales */}
      <div className="mt-5">
        <p className={labelCls}>Beneficios fiscales habituales</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {FISCAL_BENEFIT_OPTIONS.map((o) => {
            const active = form.fiscalBenefits.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                disabled={saving}
                onClick={() => toggleBenefit(o.value)}
                className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition disabled:opacity-50 ${
                  active
                    ? "border-[#18C3D6]/40 bg-[#18C3D6]/[0.10] text-[#18C3D6]"
                    : "border-white/[0.08] bg-[#07111A] text-[#94a3b8] hover:border-white/[0.16] hover:text-white"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Acciones */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-[#18C3D6] px-4 py-2 text-[13px] font-semibold text-[#04222a] transition hover:bg-[#3ad0e0] disabled:opacity-60"
        >
          {saving && (
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {saving ? "Guardando…" : "Guardar perfil"}
        </button>
        {saved && <span className="text-[12px] font-medium text-emerald-400">Perfil guardado ✓</span>}
        {error && <span className="text-[12px] text-rose-400">{error}</span>}
      </div>

      <p className="mt-4 text-[11px] text-[#3a404d]">
        Estos datos se usan como contexto del asistente para no volver a pedírtelos en cada cotización.
      </p>
    </div>
  );
}
