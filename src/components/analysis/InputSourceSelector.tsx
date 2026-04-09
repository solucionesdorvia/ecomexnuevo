"use client";

import { useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/components/ui/cn";

type SourceType = "url" | "image" | "invoice" | "text";

export function InputSourceSelector({
  sourceType,
  onSourceTypeChange,
  sourceValue,
  onSourceValueChange,
  onImageSelected,
  onInvoiceFilesSelected,
}: {
  sourceType: SourceType;
  onSourceTypeChange: (v: SourceType) => void;
  sourceValue: string;
  onSourceValueChange: (v: string) => void;
  onImageSelected?: (f: File | null) => void;
  /** Uno o varios archivos (factura, proforma, PDF, Excel, imagen). */
  onInvoiceFilesSelected?: (files: File[] | null) => void;
}) {
  const imageRef = useRef<HTMLInputElement | null>(null);
  const invoiceRef = useRef<HTMLInputElement | null>(null);

  const tabs: Array<{ id: SourceType; label: string; icon: string }> = [
    { id: "url", label: "URL", icon: "link" },
    { id: "image", label: "Imagen", icon: "image" },
    { id: "invoice", label: "Factura/Proforma", icon: "description" },
    { id: "text", label: "Texto", icon: "edit_note" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-subtle bg-[var(--surface)] p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSourceTypeChange(t.id)}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-black uppercase tracking-[0.14em] text-muted transition-colors",
              sourceType === t.id && "bg-[var(--surface2)] text-strong"
            )}
          >
            <Icon name={t.icon} size={14} className="text-current" />
            {t.label}
          </button>
        ))}
      </div>

      {sourceType === "url" || sourceType === "text" ? (
        <textarea
          value={sourceValue}
          onChange={(e) => onSourceValueChange(e.target.value)}
          placeholder={
            sourceType === "url"
              ? "Pegá el link del proveedor"
              : "Describí producto, uso, material, marca, modelo"
          }
          className="min-h-[96px] w-full resize-none rounded-2xl border border-subtle bg-[var(--surface)] px-4 py-3 text-sm text-strong outline-none placeholder:text-muted/70 focus:border-[color:color-mix(in_oklab,var(--primary)_42%,white_8%)] focus:ring-2 focus:ring-[var(--ring)]"
        />
      ) : null}

      {sourceType === "image" ? (
        <div className="space-y-2">
          <input
            ref={imageRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => onImageSelected?.(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => imageRef.current?.click()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black uppercase tracking-[0.22em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/10"
          >
            <Icon name="upload_file" size={16} className="text-white/80" />
            Subir imagen de producto
          </button>
        </div>
      ) : null}

      {sourceType === "invoice" ? (
        <div className="space-y-2">
          <input
            ref={invoiceRef}
            type="file"
            multiple
            accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => {
              const list = e.target.files;
              onInvoiceFilesSelected?.(list && list.length ? Array.from(list) : null);
            }}
          />
          <button
            type="button"
            onClick={() => invoiceRef.current?.click()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black uppercase tracking-[0.22em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/10"
          >
            <Icon name="upload_file" size={16} className="text-white/80" />
            Adjuntar factura o proforma
          </button>
          <p className="text-[11px] text-muted">
            PDF, Excel o imagen. Podés seleccionar varios archivos.
          </p>
        </div>
      ) : null}
    </div>
  );
}
