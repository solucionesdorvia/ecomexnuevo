"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Sheet, SheetContent } from "@/components/ui/Sheet";
import { cn } from "@/components/ui/cn";

export type QuoteRow = {
  id: string;
  createdAt: string; // serialized
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
  breakdown?: {
    cifMinUsd: number;
    cifMaxUsd: number;
    impuestosMinUsd: number;
    impuestosMaxUsd: number;
    gestionMinUsd: number;
    gestionMaxUsd: number;
  } | null;
};

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-AR", { year: "numeric", month: "short", day: "2-digit" });
}

function stageBucket(stage: string) {
  const s = String(stage || "").toLowerCase();
  if (s.startsWith("awaiting_")) return "draft";
  if (s === "quoted") return "quoted";
  if (s === "refined") return "refined";
  if (s === "decision_requested") return "decision";
  if (s === "lead_captured") return "lead";
  return "other";
}

function toneForBucket(bucket: ReturnType<typeof stageBucket>) {
  if (bucket === "refined") return "gold" as const;
  if (bucket === "quoted") return "primary" as const;
  if (bucket === "draft") return "muted" as const;
  if (bucket === "decision") return "gold" as const;
  if (bucket === "lead") return "success" as const;
  return "muted" as const;
}

function Chip({
  active,
  onClick,
  icon,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
        active ? "border-primary/30 bg-primary/15 text-primary" : "border-white/10 bg-white/5 text-muted"
      )}
    >
      {icon ? <span className="material-symbols-outlined text-[16px]">{icon}</span> : null}
      {children}
    </button>
  );
}

export function CotizacionesClient({ quotes }: { quotes: QuoteRow[] }) {
  const [q, setQ] = useState("");
  const [bucket, setBucket] = useState<
    "all" | "draft" | "quoted" | "refined" | "decision" | "lead"
  >("all");
  const [mode, setMode] = useState<"all" | "quote" | "budget">("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (quotes ?? []).filter((row) => {
      if (mode !== "all" && row.mode !== mode) return false;
      const b = stageBucket(row.stage);
      if (bucket !== "all" && b !== bucket) return false;
      if (!query) return true;
      const hay = `${row.productTitle} ${row.userText} ${(row.ncm || "")}`.toLowerCase();
      return hay.includes(query);
    });
  }, [quotes, q, bucket, mode]);

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
    <div>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
            Buscar
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Producto, link, NCM…"
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-muted/60 focus:border-primary/50"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip active={bucket === "all"} onClick={() => setBucket("all")} icon="apps">
              Todas
            </Chip>
            <Chip active={bucket === "draft"} onClick={() => setBucket("draft")} icon="edit">
              En borrador
            </Chip>
            <Chip active={bucket === "quoted"} onClick={() => setBucket("quoted")} icon="receipt_long">
              Cotizadas
            </Chip>
            <Chip active={bucket === "refined"} onClick={() => setBucket("refined")} icon="verified_user">
              Refinadas
            </Chip>
            <Chip active={bucket === "decision"} onClick={() => setBucket("decision")} icon="handshake">
              Decisión
            </Chip>
            <Chip active={bucket === "lead"} onClick={() => setBucket("lead")} icon="person_check">
              Lead capturado
            </Chip>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Chip active={mode === "all"} onClick={() => setMode("all")} icon="tune">
            Todo
          </Chip>
          <Chip active={mode === "quote"} onClick={() => setMode("quote")} icon="calculate">
            Cotización
          </Chip>
          <Chip active={mode === "budget"} onClick={() => setMode("budget")} icon="savings">
            Presupuesto
          </Chip>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length ? (
          filtered.map((row) => {
            const total =
              row.totalMinUsd != null && row.totalMaxUsd != null
                ? `${fmtUsd(row.totalMinUsd)} – ${fmtUsd(row.totalMaxUsd)}`
                : "—";
            const b = stageBucket(row.stage);
            const tone = toneForBucket(b);
            const isSelected = selected.includes(row.id);
            return (
              <Card key={row.id} className="border-white/10 bg-white/5">
                <CardHeader
                  eyebrow={`Manifiesto • ${fmtDate(row.createdAt)}`}
                  title={row.productTitle || "Cotización"}
                  icon="inventory_2"
                  right={
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggle(row.id)}
                        aria-label={isSelected ? "Quitar de comparar" : "Agregar a comparar"}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                          isSelected
                            ? "border-gold/30 bg-gold/10 text-gold"
                            : "border-white/10 bg-black/20 text-white/60 hover:border-white/20 hover:text-white"
                        )}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {isSelected ? "check_box" : "check_box_outline_blank"}
                        </span>
                      </button>
                      <Badge tone={tone} icon="flag">
                        {row.stage}
                      </Badge>
                    </div>
                  }
                />
                <CardContent>
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                        Total estimado
                      </div>
                      <div className="mt-2 break-words text-lg font-black tracking-tight text-gold">
                        {total}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge tone="muted" icon="psychology">
                          {row.mode === "budget" ? "Presupuesto" : "Cotización"}
                        </Badge>
                        <Badge tone="muted" icon="directions_boat">
                          Marítimo
                        </Badge>
                        {row.ncm ? (
                          <Badge tone="muted" icon="tag">
                            NCM {row.ncm}
                          </Badge>
                        ) : null}
                        {typeof row.quality === "number" ? (
                          <Badge tone={row.quality >= 80 ? "success" : "muted"} icon="speed">
                            Calidad {Math.round(row.quality)}%
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    <ButtonLink
                      href={`/cotizaciones/reporte?quote=${encodeURIComponent(row.id)}`}
                      variant="secondary"
                    >
                      Abrir reporte
                      <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                    </ButtonLink>
                  </div>

                  <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-relaxed text-muted">
                    {row.breakdown ? (
                      <div className="mb-2 grid grid-cols-3 gap-2">
                        <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                            CIF
                          </div>
                          <div className="mt-1 text-[11px] font-extrabold text-white">
                            {fmtUsd(row.breakdown.cifMinUsd)}–{fmtUsd(row.breakdown.cifMaxUsd)}
                          </div>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                            Impuestos
                          </div>
                          <div className="mt-1 text-[11px] font-extrabold text-white">
                            {fmtUsd(row.breakdown.impuestosMinUsd)}–
                            {fmtUsd(row.breakdown.impuestosMaxUsd)}
                          </div>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                            Gestión
                          </div>
                          <div className="mt-1 text-[11px] font-extrabold text-white">
                            {fmtUsd(row.breakdown.gestionMinUsd)}–
                            {fmtUsd(row.breakdown.gestionMaxUsd)}
                          </div>
                        </div>
                      </div>
                    ) : null}
                    {row.origin ? (
                      <div>
                        <span className="font-bold text-white/80">Origen:</span> {row.origin}
                      </div>
                    ) : null}
                    {row.shippingProfile ? (
                      <div className="mt-1">
                        <span className="font-bold text-white/80">Perfil de carga:</span>{" "}
                        {row.shippingProfile}
                      </div>
                    ) : null}
                    {!row.origin && !row.shippingProfile ? (
                      <div>
                        Seleccioná 2–3 manifiestos para comparar supuestos, totales y calidad de
                        estimación.
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="md:col-span-2 xl:col-span-3">
            <Card className="border-white/10 bg-white/5">
              <div className="p-6 text-sm text-muted">
                No encontramos resultados con esos filtros.
              </div>
            </Card>
          </div>
        )}
      </div>

      {selected.length ? (
        <div className="pointer-events-none fixed bottom-6 left-0 right-0 z-40">
          <div className="mx-auto w-full max-w-4xl px-6">
            <div className="pointer-events-auto glass-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-background-deeper/70 p-4 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                  <span className="material-symbols-outlined text-gold">layers</span>
                </div>
                <div>
                  <div className="text-xs font-extrabold text-white">
                    Seleccionadas: {selected.length}/3
                  </div>
                  <div className="text-xs text-muted">
                    Compará supuestos, NCM y totales antes de validar.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-widest text-white/80 transition-colors hover:border-white/20 hover:text-white"
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  disabled={selected.length < 2}
                  onClick={() => setCompareOpen(true)}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  Comparar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Sheet open={compareOpen} onOpenChange={setCompareOpen}>
        <SheetContent side="right" className="w-[520px]">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 p-5">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                Comparador
              </div>
              <div className="mt-1 text-sm font-extrabold tracking-tight text-white">
                Manifiestos seleccionados
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCompareOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-white/70 hover:text-white"
              aria-label="Cerrar"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="max-h-[calc(100vh-96px)] overflow-y-auto p-5">
            {selectedRows.length ? (
              <div className="space-y-4">
                {selectedRows.map((r) => {
                  const total =
                    r.totalMinUsd != null && r.totalMaxUsd != null
                      ? `${fmtUsd(r.totalMinUsd)} – ${fmtUsd(r.totalMaxUsd)}`
                      : "—";
                  return (
                    <div key={r.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-white">{r.productTitle}</div>
                          <div className="mt-1 text-xs text-muted">{fmtDate(r.createdAt)}</div>
                          <div className="mt-3 text-sm font-black text-gold">{total}</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge tone={toneForBucket(stageBucket(r.stage))} icon="flag">
                              {r.stage}
                            </Badge>
                            <Badge tone="muted" icon="directions_boat">
                              Marítimo
                            </Badge>
                            {r.ncm ? (
                              <Badge tone="muted" icon="tag">
                                NCM {r.ncm}
                              </Badge>
                            ) : null}
                            {typeof r.quality === "number" ? (
                              <Badge
                                tone={r.quality >= 80 ? "success" : "muted"}
                                icon="speed"
                              >
                                Calidad {Math.round(r.quality)}%
                              </Badge>
                            ) : null}
                          </div>
                          <div className="mt-3 text-xs text-muted">
                            {r.origin ? (
                              <div>
                                <span className="font-bold text-white/80">Origen:</span> {r.origin}
                              </div>
                            ) : null}
                            {r.shippingProfile ? (
                              <div className="mt-1">
                                <span className="font-bold text-white/80">Perfil de carga:</span>{" "}
                                {r.shippingProfile}
                              </div>
                            ) : null}
                            {r.breakdown ? (
                              <div className="mt-2 grid grid-cols-3 gap-2">
                                <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                                    CIF
                                  </div>
                                  <div className="mt-1 text-[11px] font-extrabold text-white">
                                    {fmtUsd(r.breakdown.cifMinUsd)}–{fmtUsd(r.breakdown.cifMaxUsd)}
                                  </div>
                                </div>
                                <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                                    Impuestos
                                  </div>
                                  <div className="mt-1 text-[11px] font-extrabold text-white">
                                    {fmtUsd(r.breakdown.impuestosMinUsd)}–
                                    {fmtUsd(r.breakdown.impuestosMaxUsd)}
                                  </div>
                                </div>
                                <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                                    Gestión
                                  </div>
                                  <div className="mt-1 text-[11px] font-extrabold text-white">
                                    {fmtUsd(r.breakdown.gestionMinUsd)}–
                                    {fmtUsd(r.breakdown.gestionMaxUsd)}
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <Link
                          href={`/cotizaciones/reporte?quote=${encodeURIComponent(r.id)}`}
                          className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/80 hover:border-white/20 hover:text-white"
                        >
                          Abrir
                        </Link>
                      </div>
                    </div>
                  );
                })}
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-muted">
                  Consejo: compará primero <span className="font-bold text-white/80">calidad</span>{" "}
                  y <span className="font-bold text-white/80">supuestos</span> (origen / perfil de
                  carga). Si querés cerrar operación, el siguiente paso es{" "}
                  <span className="font-bold text-white/80">validación profesional</span>.
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-muted">
                No hay manifiestos seleccionados.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

