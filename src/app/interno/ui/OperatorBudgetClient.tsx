"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/components/ui/cn";

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "done"; budgetId: string }
  | { status: "error"; message: string };

type BudgetListItem = {
  id: string;
  createdAt: string;
  filename: string;
  rubro: string | null;
  productTitle: string | null;
  totals?: { totalToShowUsd: number | null; totalToPayUsd: number | null };
  hasOverrides?: boolean;
};

type BudgetDetail = {
  id: string;
  createdAt: string;
  filename: string;
  rubro: string | null;
  productTitle: string | null;
  effective: ParsedBudget;
  overrides: Partial<ParsedBudget>;
  hasOverrides: boolean;
};

type ParsedBudget = {
  totalToShowUsd: number | null;
  ivaUsd: number | null;
  totalToPayUsd: number | null;
  totalTributosUsd: number | null;
  fobUsd: number | null;
  fleteUsd: number | null;
  seguroUsd: number | null;
  honorariosUsd: number | null;
  depositoUsd: number | null;
  transporteNacionalUsd: number | null;
  transferenciaIntlUsd: number | null;
  arancelSimUsd: number | null;
};

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function parseNum(input: string): number | null {
  const s = String(input || "").trim();
  if (!s) return null;
  const cleaned = s.replace(/[^\d.,-]/g, "");
  const n = Number(cleaned.includes(",") && !cleaned.includes(".") ? cleaned.replace(",", ".") : cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function OperatorBudgetClient() {
  const [xlsx, setXlsx] = useState<File | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [rubro, setRubro] = useState("");
  const [productTitle, setProductTitle] = useState("");
  const [state, setState] = useState<UploadState>({ status: "idle" });

  const [budgets, setBudgets] = useState<BudgetListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => budgets.find((b) => b.id === selectedId) ?? null,
    [budgets, selectedId]
  );
  const [detail, setDetail] = useState<BudgetDetail | null>(null);

  const [edit, setEdit] = useState<{
    rubro: string;
    productTitle: string;
    overrides: Partial<ParsedBudget>;
  }>({ rubro: "", productTitle: "", overrides: {} });

  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);

  const pdfHref = useMemo(() => {
    if (!selectedId) return null;
    return `/api/operator/budgets/pdf?id=${encodeURIComponent(selectedId)}`;
  }, [selectedId]);

  const auditEntries = useMemo(() => {
    if (!detail) return [];
    const edited = Object.entries(detail.overrides ?? {}).filter(
      ([, value]) => value !== null && value !== undefined
    );
    const base = [
      {
        label: "XLSX parse",
        source: "auto",
        detail: "Campos base extraídos automáticamente desde la planilla.",
      },
      {
        label: "Reglas de costos",
        source: "auto",
        detail: "Aplicación automática de reglas para tributos y logística.",
      },
    ];
    const manual = edited.map(([key]) => ({
      label: key,
      source: "manual",
      detail: "Valor ajustado manualmente por operador.",
    }));
    return [...base, ...manual];
  }, [detail]);

  async function refreshList() {
    setLoadingList(true);
    try {
      const res = await fetch("/api/operator/budgets", { method: "GET" });
      const json = (await res.json()) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo cargar.");
      const list = Array.isArray(json?.budgets) ? (json.budgets as BudgetListItem[]) : [];
      setBudgets(list);
      if (!selectedId && list[0]?.id) setSelectedId(list[0].id);
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : "Error." });
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    void refreshList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Initialize editor when selection changes (we don't have full parsedJson here yet).
    setEdit({
      rubro: selected?.rubro ?? "",
      productTitle: selected?.productTitle ?? "",
      overrides: {},
    });
    setDetail(null);
  }, [selectedId, selected?.rubro, selected?.productTitle]);

  async function loadDetail(id: string) {
    try {
      const res = await fetch(`/api/operator/budgets?id=${encodeURIComponent(id)}`, { method: "GET" });
      const json = (await res.json()) as any;
      if (!res.ok || !json?.ok || !json?.budget) throw new Error(json?.error || "No se pudo cargar.");
      const b = json.budget as BudgetDetail;
      setDetail(b);
      setEdit({
        rubro: b.rubro ?? "",
        productTitle: b.productTitle ?? "",
        overrides: b.overrides ?? {},
      });
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : "Error." });
    }
  }

  useEffect(() => {
    if (!selectedId) return;
    void loadDetail(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  async function submit() {
    if (!xlsx || !image) {
      setState({ status: "error", message: "Subí el XLSX y la foto del producto." });
      return;
    }

    setState({ status: "uploading" });
    try {
      const fd = new FormData();
      fd.set("xlsx", xlsx);
      fd.set("image", image);
      if (rubro.trim()) fd.set("rubro", rubro.trim());
      if (productTitle.trim()) fd.set("productTitle", productTitle.trim());

      const res = await fetch("/api/operator/budgets", { method: "POST", body: fd });
      const json = (await res.json()) as any;
      if (!res.ok || !json?.ok || !json?.budget?.id) {
        throw new Error(json?.error || "No se pudo subir.");
      }

      setState({ status: "done", budgetId: String(json.budget.id) });
      setSelectedId(String(json.budget.id));
      setXlsx(null);
      setImage(null);
      setRubro("");
      setProductTitle("");
      await refreshList();
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : "Error." });
    }
  }

  async function saveEdits() {
    if (!selectedId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/operator/budgets/update", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: selectedId,
          rubro: edit.rubro,
          productTitle: edit.productTitle,
          overrides: edit.overrides,
        }),
      });
      const json = (await res.json()) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo guardar.");
      await refreshList();
      await loadDetail(selectedId);
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : "Error." });
    } finally {
      setSaving(false);
    }
  }

  async function resetOverrides() {
    if (!selectedId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/operator/budgets/update", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: selectedId, resetOverrides: true }),
      });
      const json = (await res.json()) as any;
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo resetear.");
      await refreshList();
      await loadDetail(selectedId);
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : "Error." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)] lg:items-start">
      <div className="space-y-4">
        <Card className="border-white/10 bg-white/5">
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                  Carga
                </div>
                <div className="mt-2 text-sm font-extrabold tracking-tight text-white">
                  Nuevo presupuesto
                </div>
                <div className="mt-2 text-xs leading-relaxed text-muted">
                  Subí la plantilla XLSX + foto. Luego podés ajustar valores sin modificar el archivo original.
                </div>
              </div>
              <Badge tone="muted" icon="lock">
                Interno
              </Badge>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="grid gap-2">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                  Rubro (opcional)
                </div>
                <input
                  value={rubro}
                  onChange={(e) => setRubro(e.target.value)}
                  placeholder="Vehículos"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="grid gap-2">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                  Producto (opcional)
                </div>
                <input
                  value={productTitle}
                  onChange={(e) => setProductTitle(e.target.value)}
                  placeholder="Solar-Powered Electric Golf Carts"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                    XLSX
                  </div>
                  <input
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(e) => setXlsx(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-white/80 file:mr-4 file:rounded-xl file:border file:border-white/10 file:bg-primary file:px-4 file:py-2 file:text-xs file:font-black file:uppercase file:tracking-[0.22em] file:text-white file:shadow-[0_18px_60px_-40px_rgba(124,58,237,0.75)] hover:file:bg-primary/90"
                  />
                </div>
                <div className="grid gap-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                    Foto
                  </div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setImage(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-white/80 file:mr-4 file:rounded-xl file:border file:border-white/10 file:bg-white/5 file:px-4 file:py-2 file:text-xs file:font-black file:uppercase file:tracking-[0.22em] file:text-white file:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:file:bg-white/10"
                  />
                </div>
              </div>

              {state.status === "error" ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  {state.message}
                </div>
              ) : null}

              <div className="flex items-center gap-2">
                <Button
                  disabled={state.status === "uploading"}
                  onClick={() => void submit()}
                  className="h-11 px-5"
                >
                  <Icon name="upload_file" size={18} className="text-white/90" />
                  {state.status === "uploading" ? "Subiendo…" : "Crear"}
                </Button>
                <button
                  type="button"
                  onClick={() => void refreshList()}
                  disabled={loadingList}
                  className={cn(
                    "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black uppercase tracking-[0.22em] text-white/85 hover:bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
                    loadingList && "opacity-60"
                  )}
                >
                  <Icon name="refresh" size={16} className="text-white/75" />
                  Actualizar
                </button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <div className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                Presupuestos
              </div>
              {loadingList ? (
                <Badge tone="muted" icon="bolt">
                  Cargando
                </Badge>
              ) : (
                <Badge tone="success" icon="wifi">
                  OK
                </Badge>
              )}
            </div>

            <div className="mt-4 grid gap-2">
              {budgets.length ? (
                budgets.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedId(b.id)}
                    className={cn(
                      "flex w-full items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/10",
                      b.id === selectedId && "border-primary/25 bg-primary/10"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-extrabold tracking-tight text-white">
                        {b.productTitle || b.filename}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {b.rubro ? `${b.rubro} · ` : ""}
                        {new Date(b.createdAt).toLocaleString()}
                      </div>
                      <div className="mt-2 text-xs font-bold text-white/80">
                        {typeof b.totals?.totalToShowUsd === "number"
                          ? fmtUsd(b.totals.totalToShowUsd)
                          : "—"}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {b.hasOverrides ? (
                        <Badge tone="primary" icon="tune">
                          Ajustado
                        </Badge>
                      ) : (
                        <Badge tone="muted" icon="description">
                          XLSX
                        </Badge>
                      )}
                      <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
                        {b.id.slice(-6)}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  Sin presupuestos todavía.
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="lg:sticky lg:top-24">
        <Card className="border-white/10 bg-white/5">
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                  Editor
                </div>
                <div className="mt-2 text-lg font-black tracking-tight text-white">
                  {selected?.productTitle || selected?.filename || "Seleccioná un presupuesto"}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedId ? (
                    <Badge tone="muted" icon="description">
                      {selectedId.slice(-10)}
                    </Badge>
                  ) : null}
                  {pdfHref ? (
                    <a
                      href={pdfHref}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/85 hover:bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    >
                      <Icon name="download" size={14} className="text-white/80" />
                      PDF
                    </a>
                  ) : null}
                </div>
              </div>
              <Badge tone="muted" icon="precision_manufacturing">
                Operador
              </Badge>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { k: "Total", v: detail?.effective?.totalToShowUsd != null ? fmtUsd(detail.effective.totalToShowUsd) : "—" },
                  { k: "IVA", v: detail?.effective?.ivaUsd != null ? fmtUsd(detail.effective.ivaUsd) : "—" },
                  { k: "A pagar", v: detail?.effective?.totalToPayUsd != null ? fmtUsd(detail.effective.totalToPayUsd) : "—" },
                ].map((x) => (
                  <div
                    key={x.k}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  >
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                      {x.k}
                    </div>
                    <div className="mt-2 text-sm font-extrabold text-white/90">{x.v}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                    Rubro
                  </div>
                  <input
                    value={edit.rubro}
                    onChange={(e) => setEdit((p) => ({ ...p, rubro: e.target.value }))}
                    placeholder="Vehículos"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="grid gap-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                    Producto
                  </div>
                  <input
                    value={edit.productTitle}
                    onChange={(e) => setEdit((p) => ({ ...p, productTitle: e.target.value }))}
                    placeholder="Título interno"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                    Ajustes manuales (USD)
                  </div>
                  <Badge tone="muted" icon="tune">
                    Overrides
                  </Badge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      ["totalToShowUsd", "Total (mostrar)"],
                      ["ivaUsd", "IVA"],
                      ["totalTributosUsd", "Tributos"],
                      ["fobUsd", "FOB"],
                      ["fleteUsd", "Flete"],
                      ["seguroUsd", "Seguro"],
                      ["honorariosUsd", "Honorarios"],
                      ["depositoUsd", "Depósito"],
                      ["transporteNacionalUsd", "Transp. nac."],
                      ["transferenciaIntlUsd", "Transf. intl."],
                      ["arancelSimUsd", "Arancel SIM"],
                    ] as Array<[keyof ParsedBudget, string]>
                  ).map(([k, label]) => (
                    <div key={k} className="grid gap-2">
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                        {label}
                      </div>
                      <input
                        value={
                          edit.overrides[k] == null ? "" : String(edit.overrides[k])
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          setEdit((p) => ({
                            ...p,
                            overrides: {
                              ...p.overrides,
                              [k]: v.trim() === "" ? null : parseNum(v),
                            },
                          }));
                        }}
                        inputMode="decimal"
                        placeholder="—"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-xs leading-relaxed text-muted">
                  Estos ajustes no editan el XLSX. Se guardan como “override” y el PDF sale con los valores efectivos.
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                    Audit log
                  </div>
                  <Badge tone="muted" icon="description">
                    Auto vs manual
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2">
                  {auditEntries.length ? (
                    auditEntries.map((entry) => (
                      <div
                        key={`${entry.source}-${entry.label}`}
                        className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
                      >
                        <div>
                          <div className="text-sm font-semibold text-white/90">{entry.label}</div>
                          <div className="text-xs text-white/55">{entry.detail}</div>
                        </div>
                        <Badge tone={entry.source === "auto" ? "success" : "primary"}>
                          {entry.source === "auto" ? "auto" : "manual"}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
                      Todavía no hay eventos para auditar.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  disabled={!selectedId || saving}
                  onClick={() => void saveEdits()}
                  className="h-11 px-6"
                >
                  <Icon name="save" size={18} className="text-white/90" />
                  {saving ? "Guardando…" : "Guardar ajustes"}
                </Button>
                <button
                  type="button"
                  onClick={() => void resetOverrides()}
                  disabled={!selectedId || saving}
                  className={cn(
                    "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 text-xs font-black uppercase tracking-[0.22em] text-white/90 hover:bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
                    (!selectedId || saving) && "opacity-60"
                  )}
                >
                  <Icon name="refresh" size={16} className="text-white/80" />
                  Reset overrides
                </button>
                {pdfHref ? (
                  <a
                    href={pdfHref}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 text-xs font-black uppercase tracking-[0.22em] text-white/90 hover:bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  >
                    <Icon name="download" size={16} className="text-white/80" />
                    Exportar PDF
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

