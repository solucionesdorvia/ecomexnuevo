"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CompareQuotes } from "@/components/analysis/CompareQuotes";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/Icon";

export type QuoteRow = {
  id: string;
  createdAt: string;
  status: "draft" | "verified" | "sent";
  rubro: string | null;
  mode: string;
  stage: string;
  userText: string;
  productTitle: string;
  totalMinUsd: number | null;
  totalMaxUsd: number | null;
  ncm: string | null;
  origin: string | null;
  shippingProfile: string | null;
  quality: number | null;
  /** Quién cotizó: email/WhatsApp si lo dejó; null = anónimo. */
  contact: string | null;
};

function usd(n: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function StatusPill({ status }: { status: QuoteRow["status"] }) {
  if (status === "verified") {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
        Verified
      </span>
    );
  }
  if (status === "sent") {
    return (
      <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
        Sent
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-300">
      Draft
    </span>
  );
}

const PAGE_SIZE = 10;

export function CotizacionesClient({ quotes }: { quotes: QuoteRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | QuoteRow["status"]>("all");
  const [rubro, setRubro] = useState<string>("all");
  const [range, setRange] = useState<"all" | "7" | "30" | "90">("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const rubros = useMemo(
    () => ["all", ...new Set(quotes.map((q) => q.rubro).filter(Boolean) as string[])],
    [quotes]
  );

  const filtered = useMemo(() => {
    return quotes.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (rubro !== "all" && row.rubro !== rubro) return false;
      if (range !== "all") {
        const date = new Date(row.createdAt);
        const days = Number(range);
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - days);
        if (date < threshold) return false;
      }
      if (!query.trim()) return true;
      const hay = `${row.productTitle} ${row.userText} ${row.ncm ?? ""}`.toLowerCase();
      return hay.includes(query.trim().toLowerCase());
    });
  }, [quotes, status, rubro, range, query]);

  // Reset to page 1 whenever filters change
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1); }, [query, status, rubro, range]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const pageStart = (clampedPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  function goToPage(p: number) {
    setPage(Math.max(1, Math.min(p, totalPages)));
  }

  const selectedRows = useMemo(
    () => (quotes ?? []).filter((r) => selected.includes(r.id)),
    [quotes, selected]
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const has = prev.includes(id);
      if (has) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, id];
    });
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-4xl font-extrabold tracking-tight text-strong">Mis Cotizaciones</h2>
          <p className="text-base text-muted">
            Gestiona, visualiza y compara tus operaciones de comercio exterior activas.
          </p>
        </div>
        <Link
          href="/cotizar"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[color:color-mix(in_oklab,var(--primary)_58%,white_12%)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_84%,white_8%),var(--primary2))] px-6 text-sm font-bold text-strong shadow-[var(--shadowGlow)] transition-all hover:brightness-110 active:translate-y-[1px]"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Nueva Cotización
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-subtle bg-[var(--surface)] px-3 py-2 text-muted focus-within:border-[#18C3D6]/40 focus-within:bg-[var(--surface2)]">
          <Icon name="search" size={16} className="shrink-0 text-white/40" />
          <input
            type="search"
            placeholder="Buscar producto, NCM…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-36 min-w-0 bg-transparent text-sm text-strong placeholder-white/30 outline-none sm:w-48"
            aria-label="Buscar cotizaciones"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Limpiar búsqueda" className="shrink-0 text-white/30 hover:text-white/60">
              <Icon name="close" size={14} className="text-current" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-subtle bg-[var(--surface)] px-4 py-2 text-muted hover:bg-[var(--surface2)]">
          <span className="text-sm font-medium">
            Estado: {status === "all" ? "Todos" : status === "draft" ? "Draft" : status === "verified" ? "Verified" : "Sent"}
          </span>
          <button
            type="button"
            className="rounded-md p-1 text-muted hover:bg-[var(--surface2)] hover:text-strong"
            onClick={() => setStatus((prev) => (prev === "all" ? "draft" : prev === "draft" ? "verified" : prev === "verified" ? "sent" : "all"))}
            aria-label="Cambiar estado"
          >
            <Icon name="expand_more" size={18} className="text-current" />
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-subtle bg-[var(--surface)] px-4 py-2 text-muted hover:bg-[var(--surface2)]">
          <span className="text-sm font-medium">
            Fecha: {range === "all" ? "Todo" : range === "7" ? "Últimos 7 días" : range === "30" ? "Últimos 30 días" : "Últimos 90 días"}
          </span>
          <button
            type="button"
            className="rounded-md p-1 text-muted hover:bg-[var(--surface2)] hover:text-strong"
            onClick={() => setRange((prev) => (prev === "all" ? "30" : prev === "30" ? "7" : prev === "7" ? "90" : "all"))}
            aria-label="Cambiar rango"
          >
            <Icon name="calendar_today" size={18} className="text-current" />
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-subtle bg-[var(--surface)] px-4 py-2 text-muted hover:bg-[var(--surface2)]">
          <span className="text-sm font-medium">
            Categoría: {rubro === "all" ? "Todas" : rubro}
          </span>
          <button
            type="button"
            className="rounded-md p-1 text-muted hover:bg-[var(--surface2)] hover:text-strong"
            onClick={() => {
              const idx = rubros.indexOf(rubro);
              const next = idx <= 0 ? (rubros[1] ?? "all") : (rubros[idx + 1] ?? "all");
              setRubro(next);
            }}
            aria-label="Cambiar categoría"
          >
            <Icon name="category" size={18} className="text-current" />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2 rounded-xl border border-subtle bg-[var(--surface)] px-4 py-2 text-muted hover:bg-[var(--surface2)]">
          <Icon name="filter_list" size={18} className="text-white/70" />
          <span className="text-sm font-medium">Filtros Avanzados</span>
        </div>
      </div>

      <div className="panel-strong overflow-hidden rounded-2xl shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-subtle bg-[var(--surface)]">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted">ID Cotización</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted">Producto / Mercancía</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted">Origen</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted">Estado</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted">Monto total</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {pageRows.length ? (
                pageRows.map((row) => {
                  const isSelected = selected.includes(row.id);
                  const total = row.totalMaxUsd ?? row.totalMinUsd;
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "transition-colors",
                        isSelected ? "bg-[color:color-mix(in_oklab,var(--primary)_16%,transparent)]" : "hover:bg-[color:color-mix(in_oklab,var(--surface2)_70%,transparent)]"
                      )}
                    >
                      <td className="px-6 py-5 font-mono text-sm text-strong">
                        #{row.id.slice(0, 6)}
                      </td>
                      <td className="px-6 py-5 text-sm text-strong">
                        {row.productTitle || "Cotización"}
                        <div className="mt-1 text-xs text-muted">
                          {row.rubro || "General"} · {row.ncm || "NCM pendiente"}
                        </div>
                        <div className="mt-0.5 text-xs">
                          {row.contact ? (
                            <span className="text-emerald-400">{row.contact}</span>
                          ) : (
                            <span className="text-[color:var(--muted)] opacity-60">anónimo (sin contacto)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-muted">
                        <span className="rounded bg-[var(--surface)] px-2 py-0.5 text-xs text-muted">
                          {row.origin || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <StatusPill status={row.status} />
                      </td>
                      <td className="px-6 py-5 text-sm font-bold tracking-wide text-[color:var(--color-gold)]">
                        {usd(total ?? null)}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="inline-flex items-center gap-3">
                          <Link
                            href={`/cotizaciones/${row.id}`}
                            className="inline-flex items-center gap-1 text-sm font-bold text-muted transition-colors hover:text-strong"
                          >
                            Ver detalle
                            <Icon name="open_in_new" size={16} className="text-current" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => toggle(row.id)}
                            disabled={!isSelected && selected.length >= 3}
                            className={cn(
                              "inline-flex items-center justify-end gap-1 text-sm font-bold transition-colors",
                              isSelected ? "text-white" : "text-primary hover:text-white"
                            )}
                          >
                            {isSelected ? "Seleccionado" : "Comparar"}
                            <Icon name="compare_arrows" size={18} className="text-current" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-muted">
                    {filtered.length === 0
                      ? "No hay cotizaciones que coincidan con los filtros aplicados."
                      : "No hay resultados en esta página."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-subtle bg-[var(--surface)] px-6 py-4">
          <p className="text-sm text-muted">
            {filtered.length === 0
              ? "0 cotizaciones"
              : `${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, filtered.length)} de ${filtered.length}`}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => goToPage(clampedPage - 1)}
                disabled={clampedPage <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/55 transition hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30"
                aria-label="Página anterior"
              >
                <Icon name="chevron_left" size={18} className="text-current" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                // Show pages around current page
                let p: number;
                if (totalPages <= 5) {
                  p = i + 1;
                } else if (clampedPage <= 3) {
                  p = i + 1;
                } else if (clampedPage >= totalPages - 2) {
                  p = totalPages - 4 + i;
                } else {
                  p = clampedPage - 2 + i;
                }
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => goToPage(p)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition",
                      p === clampedPage
                        ? "bg-primary font-bold text-[#030d18] shadow shadow-primary/20"
                        : "border border-white/10 text-white/55 hover:bg-white/10"
                    )}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => goToPage(clampedPage + 1)}
                disabled={clampedPage >= totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/55 transition hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30"
                aria-label="Página siguiente"
              >
                <Icon name="chevron_right" size={18} className="text-current" />
              </button>
            </div>
          )}
        </div>
      </div>

      <CompareQuotes rows={selectedRows} />
    </div>
  );
}

