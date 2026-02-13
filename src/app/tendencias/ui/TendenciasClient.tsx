"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";

export type Signal = {
  id: string;
  icon: string;
  title: string;
  rubro: string;
  sub: string;
  trend: string;
  impact: "alto" | "medio" | "bajo";
  impactArea: "costo" | "riesgo" | "timing";
  reason: string;
  recommendation: "recomendado" | "alta" | "rotacion";
};

const LS_KEY = "ecomex_signals_prefs_v1";

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

function impactTone(impact: Signal["impact"]) {
  if (impact === "alto") return "gold" as const;
  if (impact === "medio") return "primary" as const;
  return "muted" as const;
}

function impactLabel(area: Signal["impactArea"]) {
  if (area === "costo") return "Impacto en costo";
  if (area === "timing") return "Impacto en timing";
  return "Impacto regulatorio";
}

function recommendationBadge(rec: Signal["recommendation"]) {
  if (rec === "recomendado") return { label: "Recomendado", tone: "gold" as const, icon: "auto_awesome" };
  if (rec === "alta") return { label: "Alta señal", tone: "primary" as const, icon: "bolt" };
  return { label: "Rotación", tone: "muted" as const, icon: "cycle" };
}

export function TendenciasClient({ signals }: { signals: Signal[] }) {
  const [q, setQ] = useState("");
  const [impact, setImpact] = useState<"all" | Signal["impact"]>("all");
  const [area, setArea] = useState<"all" | Signal["impactArea"]>("all");
  const [rubros, setRubros] = useState<string[]>([]);

  const allRubros = useMemo(() => {
    const s = new Set<string>();
    (signals ?? []).forEach((x) => s.add(x.rubro));
    return Array.from(s).sort();
  }, [signals]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (Array.isArray(obj?.rubros)) setRubros(obj.rubros.filter((x: any) => typeof x === "string"));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ rubros }));
    } catch {
      // ignore
    }
  }, [rubros]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (signals ?? []).filter((s) => {
      if (impact !== "all" && s.impact !== impact) return false;
      if (area !== "all" && s.impactArea !== area) return false;
      if (rubros.length && !rubros.includes(s.rubro)) return false;
      if (!query) return true;
      const hay = `${s.title} ${s.sub} ${s.rubro}`.toLowerCase();
      return hay.includes(query);
    });
  }, [signals, q, impact, area, rubros]);

  return (
    <div className="mt-6 grid grid-cols-12 gap-8">
      <div className="col-span-12 space-y-8 lg:col-span-8">
        <Card className="border-white/10 bg-white/5">
          <CardHeader
            eyebrow="Top señales"
            title="Oportunidades"
            icon="trending_up"
            right={
              <Badge tone="primary" icon="update">
                Actualizado hace 14 min
              </Badge>
            }
          />
          <CardContent>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                  Buscar
                </div>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Producto, rubro, palabra clave…"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-muted/60 focus:border-primary/50"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Chip active={impact === "all"} onClick={() => setImpact("all")} icon="filter_alt">
                    Todo
                  </Chip>
                  <Chip active={impact === "alto"} onClick={() => setImpact("alto")} icon="priority_high">
                    Alto
                  </Chip>
                  <Chip active={impact === "medio"} onClick={() => setImpact("medio")} icon="signal_cellular_alt">
                    Medio
                  </Chip>
                  <Chip active={impact === "bajo"} onClick={() => setImpact("bajo")} icon="info">
                    Bajo
                  </Chip>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <Chip active={area === "all"} onClick={() => setArea("all")} icon="category">
                  Todas
                </Chip>
                <Chip active={area === "costo"} onClick={() => setArea("costo")} icon="paid">
                  Costo
                </Chip>
                <Chip active={area === "timing"} onClick={() => setArea("timing")} icon="schedule">
                  Timing
                </Chip>
                <Chip active={area === "riesgo"} onClick={() => setArea("riesgo")} icon="gavel">
                  Riesgo
                </Chip>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              {filtered.length ? (
                filtered.map((r) => {
                  const rec = recommendationBadge(r.recommendation);
                  return (
                    <div key={r.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/20">
                            <span className="material-symbols-outlined text-primary">{r.icon}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-extrabold text-white">
                              {r.title}
                            </div>
                            <div className="mt-1 text-xs text-muted">{r.sub}</div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <Badge tone="success" icon="trending_up">
                                {r.trend}
                              </Badge>
                              <Badge tone={rec.tone} icon={rec.icon}>
                                {rec.label}
                              </Badge>
                              <Badge tone={impactTone(r.impact)} icon="radar">
                                {impactLabel(r.impactArea)}: {r.impact}
                              </Badge>
                              <Badge tone="muted" icon="sell">
                                {r.rubro}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <ButtonLink href="/chat" variant="secondary">
                          Cotizar
                          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </ButtonLink>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                            Impacto
                          </div>
                          <div className="mt-2 text-xs leading-relaxed text-muted">
                            {r.impactArea === "costo"
                              ? "Puede mover el total por flete/tributos. Ideal para cotizar con datos técnicos."
                              : r.impactArea === "timing"
                                ? "Puede mover tiempos/ventanas de salida. Cotizar ayuda a decidir el momento."
                                : "Puede exigir permisos/intervenciones. Mejor validarlo antes de pagar al proveedor."}
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                            Razón IA
                          </div>
                          <div className="mt-2 text-xs leading-relaxed text-muted">{r.reason}</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-muted">
                  No encontramos señales con esos filtros/preferencias.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-12 space-y-8 lg:col-span-4">
        <Card className="border-white/10 bg-white/5">
          <CardHeader eyebrow="Personalización" title="Preferencias de rubro" icon="tune" />
          <CardContent>
            <div className="text-xs text-muted">
              Elegí rubros para priorizar señales. Se guarda localmente en este dispositivo.
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {allRubros.map((r) => {
                const active = rubros.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() =>
                      setRubros((prev) =>
                        active ? prev.filter((x) => x !== r) : [...prev, r]
                      )
                    }
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
                      active ? "border-gold/30 bg-gold/10 text-gold" : "border-white/10 bg-black/20 text-muted"
                    )}
                  >
                    {r}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setRubros([])}
                className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/80 hover:border-white/20 hover:text-white"
              >
                Limpiar
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader eyebrow="Señal premium" title="Ventanilla de oportunidad" icon="auto_awesome" />
          <CardContent>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs leading-relaxed text-muted">
                Detectamos una baja temporal del <span className="font-bold text-white">12%</span>{" "}
                en el flete marítimo para el corredor Ningbo‑Buenos Aires entre Nov 15 y Dec 05
                (demo).
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              <ButtonLink href="/chat" variant="primary" className="w-full py-3">
                Cotizar con esta señal
                <span className="material-symbols-outlined text-[18px]">bolt</span>
              </ButtonLink>
              <ButtonLink href="/cotizaciones" variant="secondary" className="w-full py-3">
                Ver biblioteca
                <span className="material-symbols-outlined text-[18px]">inventory_2</span>
              </ButtonLink>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

