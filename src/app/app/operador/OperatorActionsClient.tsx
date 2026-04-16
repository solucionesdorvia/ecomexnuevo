"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";
import {
  OPERATION_STAGE_LABEL_ES,
  OPERATION_STAGE_ORDER,
  operationStageBadgeClass,
} from "@/app/app/operaciones/[id]/operation/operationStageUi";

type OpRow = {
  id: string;
  stage: string;
  createdAt: string;
  updatedAt: string;
  quote: { productJson: unknown; userText: string; mode: string };
  user: { email: string };
  lastEvent: {
    id: string;
    stage: string;
    description: string;
    actor: string;
    createdAt: string;
  } | null;
};

function productLabel(quote: OpRow["quote"]) {
  const pj = quote.productJson as { title?: string; name?: string } | null | undefined;
  const t = pj?.title ?? pj?.name;
  if (t && String(t).trim()) return String(t).slice(0, 80);
  const u = quote.userText?.trim();
  if (u) return u.slice(0, 80);
  return "—";
}

function fmtUpdated(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

type Stage = (typeof OPERATION_STAGE_ORDER)[number];

/** Etapas posteriores a la actual (pipeline). Si la etapa no está en el orden, se listan todas (datos inconsistentes). */
function followingStages(current: string): Stage[] {
  const idx = OPERATION_STAGE_ORDER.indexOf(current as Stage);
  if (idx < 0) return [...OPERATION_STAGE_ORDER];
  return OPERATION_STAGE_ORDER.slice(idx + 1) as Stage[];
}

export function OperatorActionsClient() {
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [rows, setRows] = useState<OpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [stageFor, setStageFor] = useState<string | null>(null);
  const [stageValue, setStageValue] = useState<string>("");
  const [stagePending, setStagePending] = useState<string | null>(null);
  const [stageErr, setStageErr] = useState<string | null>(null);

  const [eventFor, setEventFor] = useState<string | null>(null);
  const [eventText, setEventText] = useState("");
  const [eventPending, setEventPending] = useState<string | null>(null);
  const [eventErr, setEventErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setFetchError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/app/operations?includeCompleted=${includeCompleted ? "true" : "false"}`,
        { credentials: "include" }
      );
      const json = (await res.json()) as { operations?: OpRow[]; error?: string };
      if (!res.ok) throw new Error(json.error || "Error al cargar.");
      setRows(json.operations ?? []);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [includeCompleted]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitStage(operationId: string, allowed: readonly string[]) {
    if (!stageValue || !allowed.includes(stageValue)) return;
    setStageErr(null);
    setStagePending(operationId);
    try {
      const res = await fetch(`/api/app/operations/${operationId}/stage`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ stage: stageValue }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Error");
      setStageFor(null);
      setStageValue("");
      await load();
    } catch (e) {
      setStageErr(e instanceof Error ? e.message : "Error");
    } finally {
      setStagePending(null);
    }
  }

  async function submitEvent(operationId: string) {
    const t = eventText.trim();
    if (!t) return;
    setEventErr(null);
    setEventPending(operationId);
    try {
      const res = await fetch(`/api/app/operations/${operationId}/events`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ description: t }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Error");
      setEventFor(null);
      setEventText("");
      await load();
    } catch (e) {
      setEventErr(e instanceof Error ? e.message : "Error");
    } finally {
      setEventPending(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[14px] text-[#555c6b]">
          Importaciones ordenadas por última actividad. Solo el equipo operador puede cambiar etapas y registrar notas.
        </p>
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#b0b8c9]">
          <input
            type="checkbox"
            checked={includeCompleted}
            onChange={(e) => setIncludeCompleted(e.target.checked)}
            className="rounded border-white/20 bg-[#0B1622]"
          />
          Mostrar completadas
        </label>
      </div>

      {fetchError ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[13px] text-rose-300">{fetchError}</p>
      ) : null}

      {loading ? (
        <p className="text-[14px] text-[#555c6b]">Cargando…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/[0.08] bg-[#0B1622]/50 px-6 py-12 text-center text-[14px] text-[#555c6b]">
          No hay importaciones {includeCompleted ? "" : "activas "}
          en este momento.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Móvil: cards */}
          <ul className="space-y-4 md:hidden">
            {rows.map((op) => {
              const nextStages = followingStages(op.stage);
              return (
              <li key={op.id} className="rounded-xl border border-white/[0.06] bg-[#0B1622] p-4">
                <p className="text-[14px] font-semibold leading-snug text-white [overflow-wrap:anywhere]">{productLabel(op.quote)}</p>
                <p className="mt-1 text-[12px] text-[#555c6b]">{op.user.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${operationStageBadgeClass(op.stage)}`}
                  >
                    {OPERATION_STAGE_LABEL_ES[op.stage as keyof typeof OPERATION_STAGE_LABEL_ES] ?? op.stage}
                  </span>
                  <span className="text-[11px] text-[#555c6b]">Act. {fmtUpdated(op.updatedAt)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/app/operaciones/${op.id}/operation`}
                    className="inline-flex rounded-lg bg-[#2b59ff] px-3 py-2 text-[12px] font-medium text-white"
                  >
                    Ver detalle
                  </Link>
                  <button
                    type="button"
                    disabled={nextStages.length === 0}
                    title={nextStages.length === 0 ? "No hay etapas siguientes" : undefined}
                    onClick={() => {
                      setStageFor((s) => (s === op.id ? null : op.id));
                      setStageErr(null);
                      setStageValue(nextStages[0] ?? "");
                    }}
                    className="rounded-lg border border-white/[0.1] px-3 py-2 text-[12px] text-[#b0b8c9] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Avanzar etapa
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEventFor((s) => (s === op.id ? null : op.id));
                      setEventErr(null);
                    }}
                    className="rounded-lg border border-white/[0.1] px-3 py-2 text-[12px] text-[#b0b8c9]"
                  >
                    Agregar evento
                  </button>
                </div>
                {stageFor === op.id ? (
                  <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
                    {nextStages.length === 0 ? (
                      <p className="text-[12px] text-[#555c6b]">
                        No hay etapas siguientes. Si necesitás otro cambio, usá la vista de detalle.
                      </p>
                    ) : (
                      <>
                        <select
                          value={stageValue}
                          onChange={(e) => setStageValue(e.target.value)}
                          className="w-full rounded-lg border border-white/[0.08] bg-[#07111A] px-3 py-2 text-[13px] text-white"
                        >
                          {nextStages.map((s) => (
                            <option key={s} value={s}>
                              {OPERATION_STAGE_LABEL_ES[s]}
                            </option>
                          ))}
                        </select>
                        {stageErr ? <p className="text-[11px] text-rose-400">{stageErr}</p> : null}
                        <button
                          type="button"
                          disabled={
                            stagePending === op.id || !nextStages.includes(stageValue as Stage)
                          }
                          onClick={() => void submitStage(op.id, nextStages)}
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-[12px] text-white disabled:opacity-50"
                        >
                          {stagePending === op.id ? "…" : "Confirmar etapa"}
                        </button>
                      </>
                    )}
                  </div>
                ) : null}
                {eventFor === op.id ? (
                  <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
                    <textarea
                      value={eventText}
                      onChange={(e) => setEventText(e.target.value)}
                      rows={3}
                      placeholder="Nota para el timeline…"
                      className="w-full rounded-lg border border-white/[0.08] bg-[#07111A] px-3 py-2 text-[13px] text-white"
                    />
                    {eventErr ? <p className="text-[11px] text-rose-400">{eventErr}</p> : null}
                    <button
                      type="button"
                      disabled={eventPending === op.id || !eventText.trim()}
                      onClick={() => void submitEvent(op.id)}
                      className="rounded-lg bg-[#2b59ff] px-3 py-2 text-[12px] text-white disabled:opacity-50"
                    >
                      {eventPending === op.id ? "…" : "Registrar evento"}
                    </button>
                  </div>
                ) : null}
              </li>
            );
            })}
          </ul>

          {/* Desktop: tabla */}
          <div className="hidden overflow-x-auto rounded-xl border border-white/[0.04] md:block">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-white/[0.04] bg-[#0B1622]">
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Producto</th>
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Usuario</th>
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Etapa</th>
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Última actividad</th>
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((op) => {
                  const nextStages = followingStages(op.stage);
                  return (
                  <Fragment key={op.id}>
                    <tr className="border-b border-white/[0.04] align-top hover:bg-white/[0.02]">
                      <td className="max-w-[220px] px-4 py-3 text-[13px] text-white">
                        <span className="line-clamp-2">{productLabel(op.quote)}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-[#b0b8c9]">{op.user.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${operationStageBadgeClass(op.stage)}`}
                        >
                          {OPERATION_STAGE_LABEL_ES[op.stage as keyof typeof OPERATION_STAGE_LABEL_ES] ?? op.stage}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[12px] text-[#555c6b]">{fmtUpdated(op.updatedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/app/operaciones/${op.id}/operation`}
                            className="text-[12px] font-medium text-[#2b59ff] hover:underline"
                          >
                            Ver detalle
                          </Link>
                          <button
                            type="button"
                            disabled={nextStages.length === 0}
                            title={nextStages.length === 0 ? "No hay etapas siguientes" : undefined}
                            onClick={() => {
                              setStageFor((s) => (s === op.id ? null : op.id));
                              setStageErr(null);
                              setStageValue(nextStages[0] ?? "");
                            }}
                            className="text-[12px] text-[#b0b8c9] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Avanzar etapa
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEventFor((s) => (s === op.id ? null : op.id));
                              setEventErr(null);
                            }}
                            className="text-[12px] text-[#b0b8c9] hover:text-white"
                          >
                            Agregar evento
                          </button>
                        </div>
                      </td>
                    </tr>
                    {stageFor === op.id ? (
                      <tr className="border-b border-white/[0.04] bg-[#07111A]/80">
                        <td colSpan={5} className="px-4 py-3">
                          {nextStages.length === 0 ? (
                            <p className="text-[12px] text-[#555c6b]">
                              No hay etapas siguientes. Si necesitás otro cambio, usá la vista de detalle.
                            </p>
                          ) : (
                            <div className="flex max-w-xl flex-wrap items-end gap-2">
                              <div className="min-w-[200px] flex-1">
                                <label className="text-[10px] uppercase text-[#555c6b]">Nueva etapa</label>
                                <select
                                  value={stageValue}
                                  onChange={(e) => setStageValue(e.target.value)}
                                  className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#0B1622] px-3 py-2 text-[13px] text-white"
                                >
                                  {nextStages.map((s) => (
                                    <option key={s} value={s}>
                                      {OPERATION_STAGE_LABEL_ES[s]}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <button
                                type="button"
                                disabled={
                                  stagePending === op.id ||
                                  !nextStages.includes(stageValue as Stage)
                                }
                                onClick={() => void submitStage(op.id, nextStages)}
                                className="rounded-lg bg-emerald-600 px-4 py-2 text-[12px] font-medium text-white disabled:opacity-50"
                              >
                                {stagePending === op.id ? "Guardando…" : "Confirmar"}
                              </button>
                            </div>
                          )}
                          {stageErr ? <p className="mt-2 text-[11px] text-rose-400">{stageErr}</p> : null}
                        </td>
                      </tr>
                    ) : null}
                    {eventFor === op.id ? (
                      <tr className="border-b border-white/[0.04] bg-[#07111A]/80">
                        <td colSpan={5} className="px-4 py-3">
                          <label className="text-[10px] uppercase text-[#555c6b]">Nota / evento</label>
                          <textarea
                            value={eventText}
                            onChange={(e) => setEventText(e.target.value)}
                            rows={2}
                            className="mt-1 w-full max-w-xl rounded-lg border border-white/[0.08] bg-[#0B1622] px-3 py-2 text-[13px] text-white"
                            placeholder="Descripción visible en el timeline del cliente…"
                          />
                          <button
                            type="button"
                            disabled={eventPending === op.id || !eventText.trim()}
                            onClick={() => void submitEvent(op.id)}
                            className="mt-2 rounded-lg bg-[#2b59ff] px-4 py-2 text-[12px] font-medium text-white disabled:opacity-50"
                          >
                            {eventPending === op.id ? "Enviando…" : "Registrar evento"}
                          </button>
                          {eventErr ? <p className="mt-2 text-[11px] text-rose-400">{eventErr}</p> : null}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
