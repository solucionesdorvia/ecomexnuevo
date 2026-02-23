"use client";

import { useMemo, useState } from "react";

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "done"; budgetId: string }
  | { status: "error"; message: string };

export function OperatorBudgetClient() {
  const [xlsx, setXlsx] = useState<File | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [rubro, setRubro] = useState("");
  const [productTitle, setProductTitle] = useState("");
  const [state, setState] = useState<UploadState>({ status: "idle" });

  const pdfHref = useMemo(() => {
    if (state.status !== "done") return null;
    return `/api/operator/budgets/pdf?id=${encodeURIComponent(state.budgetId)}`;
  }, [state]);

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
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : "Error." });
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
            Rubro (opcional)
          </div>
          <input
            value={rubro}
            onChange={(e) => setRubro(e.target.value)}
            placeholder="Vehículos"
            className="w-full rounded-lg border border-border-dark bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-muted/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="grid gap-2">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
            Producto (opcional)
          </div>
          <input
            value={productTitle}
            onChange={(e) => setProductTitle(e.target.value)}
            placeholder="Solar-Powered Electric Golf Carts"
            className="w-full rounded-lg border border-border-dark bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-muted/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
            XLSX (plantilla)
          </div>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setXlsx(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-white/80 file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-xs file:font-black file:uppercase file:tracking-[0.2em] file:text-white hover:file:bg-primary/90"
          />
        </div>
        <div className="grid gap-2">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
            Foto del producto
          </div>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setImage(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-white/80 file:mr-4 file:rounded-lg file:border-0 file:bg-gold file:px-4 file:py-2 file:text-xs file:font-black file:uppercase file:tracking-[0.2em] file:text-white hover:file:bg-gold/90"
          />
        </div>
      </div>

      {state.status === "error" ? (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/85">
          {state.message}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={state.status === "uploading"}
          onClick={() => void submit()}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-primary/20 transition-transform active:scale-95 disabled:opacity-60"
        >
          {state.status === "uploading" ? "Subiendo…" : "Generar"}
        </button>

        {pdfHref ? (
          <a
            href={pdfHref}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-6 text-sm font-black uppercase tracking-[0.2em] text-white/90 hover:bg-white/10"
          >
            Descargar PDF
          </a>
        ) : null}
      </div>

      <div className="text-xs leading-relaxed text-muted">
        El PDF se genera con el mismo formato que E‑COMEX, usando la planilla XLSX y la foto.
      </div>
    </div>
  );
}

