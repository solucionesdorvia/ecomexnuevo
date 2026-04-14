"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { Paperclip, Sparkles } from "lucide-react";
import { useClasificarChat } from "@/app/clasificarncm/hooks/useClasificarChat";
import { ChatContainer } from "@/app/clasificarncm/components/ChatContainer";
import { ChatInput } from "@/app/clasificarncm/components/ChatInput";
import { CaseSummaryPanel } from "@/app/clasificarncm/components/CaseSummaryPanel";
import { ClassificationCard } from "@/app/clasificarncm/components/ClassificationCard";
import { DiscardedCandidatesBlock } from "@/app/clasificarncm/components/DiscardedCandidatesBlock";
import { FollowUpQuestions } from "@/app/clasificarncm/components/FollowUpQuestions";
import { SuggestedCandidatesList } from "@/app/clasificarncm/components/SuggestedCandidatesList";
import { ClasificarNcmPipelineFooter } from "@/app/clasificarncm/components/ClasificarNcmPipelineFooter";
import {
  CLASIFICAR_NCM_LANDING_DESCRIPTION,
  CLASIFICAR_NCM_LANDING_TITLE,
  CLASIFICAR_NCM_SUGGESTIONS,
} from "@/app/clasificarncm/uiConstants";
import { AMBIGUITY_REASON_LABELS } from "@/lib/clasificar-ncm/ncmAmbiguity";
import type { CaseSnapshot, CaseState } from "@/lib/clasificar-ncm/types";

function stripMessages(s: CaseState): CaseSnapshot {
  const { messages: _m, ...rest } = s;
  return rest;
}

type QuoteResult = {
  quoteId: string;
  cards: Array<{ label: string; value: string; detail?: string; highlight?: boolean }>;
  totalMinUsd?: number;
  totalMaxUsd?: number;
};

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function NuevaOperacionClient() {
  const { caseState, sendMessage, pending, reset } = useClasificarChat({ credentials: "include" });
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([]);
  const [pendingExtract, setPendingExtract] = useState(false);
  const [pendingQuote, setPendingQuote] = useState(false);
  const [quoteResult, setQuoteResult] = useState<QuoteResult | null>(null);
  const invoiceInputRef = useRef<HTMLInputElement>(null);

  const showResultCard =
    caseState.recommendedNcm &&
    typeof caseState.confidence === "number" &&
    (caseState.status === "resolved" || caseState.status === "tentative");

  const followUpContext =
    caseState.ambiguity && caseState.pendingQuestions?.length
      ? `${AMBIGUITY_REASON_LABELS[caseState.ambiguity.reason]} — falta definir: ${caseState.ambiguity.decisiveField}.`
      : undefined;

  const hasConversation = caseState.messages.length > 0;

  const busy = pending || pendingExtract;

  const handleSend = useCallback(
    async (text: string) => {
      const hasInvoices = invoiceFiles.length > 0;
      const trimmed = text.trim();
      if (!trimmed && !hasInvoices) return;

      setPendingExtract(true);
      try {
        let payload = trimmed;

        if (hasInvoices) {
          const fd = new FormData();
          for (const f of invoiceFiles) fd.append("invoice", f);
          const res = await fetch("/api/app/nueva/extract-invoices", {
            method: "POST",
            body: fd,
            credentials: "include",
          });
          const json = (await res.json()) as { ok?: boolean; text?: string; error?: string };
          if (!res.ok) {
            throw new Error(json.error || "No se pudo leer la factura.");
          }
          const merged = String(json.text ?? "");
          const { stitchInvoiceIntoUserMessage } = await import("@/lib/invoice/extractTextFromInvoiceFile");
          const fallback =
            trimmed || `[SOURCE_INVOICE] ${invoiceFiles.map((f) => f.name).join(", ")}`;
          payload = stitchInvoiceIntoUserMessage(fallback, merged);
        }

        await sendMessage(payload);
        if (hasInvoices) setInvoiceFiles([]);
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "Error al enviar.");
      } finally {
        setPendingExtract(false);
      }
    },
    [invoiceFiles, sendMessage]
  );

  async function createQuoteFromClassifier() {
    if (pendingQuote || !showResultCard) return;
    setPendingQuote(true);
    setQuoteResult(null);
    try {
      const res = await fetch("/api/app/nueva/quote-from-classifier", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          snapshot: stripMessages(caseState),
          messages: caseState.messages,
        }),
      });
      const json = (await res.json()) as QuoteResult & { ok?: boolean; error?: string; quoteId?: string };
      if (!res.ok) {
        throw new Error(json.error || "No se pudo crear el presupuesto.");
      }
      if (json.quoteId && json.cards) {
        setQuoteResult({
          quoteId: json.quoteId,
          cards: json.cards,
          totalMinUsd: json.totalMinUsd,
          totalMaxUsd: json.totalMaxUsd,
        });
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Error inesperado.");
    } finally {
      setPendingQuote(false);
    }
  }

  const totalCard = quoteResult?.cards?.find((c) => c.label === "Total puesto en Argentina");

  return (
    <div
      className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#030712]"
      style={{ fontFamily: "var(--font-body, ui-sans-serif, system-ui)" }}
    >
      <input
        ref={invoiceInputRef}
        type="file"
        multiple
        accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg,.webp,application/pdf"
        className="hidden"
        aria-hidden
        onChange={(e) => {
          const list = e.target.files;
          setInvoiceFiles(list && list.length ? Array.from(list) : []);
          e.target.value = "";
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `linear-gradient(rgba(148,163,184,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.04) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {caseState.messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:py-10">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#3b82f6]/20 bg-[#3b82f6]/10">
                  <Sparkles className="h-7 w-7 text-[#60a5fa]" />
                </div>
                <h1
                  className="mt-6 max-w-lg text-center text-[22px] font-bold tracking-tight text-white sm:text-[24px]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {CLASIFICAR_NCM_LANDING_TITLE}
                </h1>
                <p className="mt-3 max-w-md text-center text-[14px] leading-relaxed text-slate-500">
                  {CLASIFICAR_NCM_LANDING_DESCRIPTION}
                </p>
                <p className="mt-2 max-w-md text-center text-[12px] leading-relaxed text-slate-600">
                  En la app: cuando el NCM esté listo, generá el presupuesto con el botón debajo del resultado.
                </p>
                <div className="mt-8 flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
                  {CLASIFICAR_NCM_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={busy}
                      onClick={() => void sendMessage(s)}
                      className="min-h-[48px] w-full touch-manipulation rounded-xl border border-white/[0.08] bg-[#0f172a]/80 px-4 py-3 text-left text-[14px] leading-snug text-slate-400 transition hover:border-[#3b82f6]/30 hover:text-slate-200 active:scale-[0.99] disabled:opacity-40 sm:min-h-0 sm:w-auto sm:px-3 sm:py-2 sm:text-[12px]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ChatContainer messages={caseState.messages} pending={busy} />
            )}

            {caseState.messages.length > 0 && caseState.pendingQuestions && caseState.pendingQuestions.length > 0 ? (
              <div className="shrink-0 border-t border-white/[0.04] px-3 py-3 sm:px-6">
                <div className="mx-auto max-w-[720px]">
                  <FollowUpQuestions questions={caseState.pendingQuestions} context={followUpContext} />
                </div>
              </div>
            ) : null}

            {caseState.messages.length > 0 &&
            (showResultCard ||
              (caseState.candidates && caseState.candidates.length > 0) ||
              (caseState.discardedCandidates && caseState.discardedCandidates.length > 0)) ? (
              <div className="shrink-0 space-y-4 border-t border-white/[0.04] px-3 py-4 sm:px-6">
                <div className="mx-auto flex max-w-[720px] flex-col gap-4">
                  {showResultCard && caseState.recommendedNcm && typeof caseState.confidence === "number" ? (
                    <ClassificationCard
                      ncm={caseState.recommendedNcm}
                      description={caseState.classificationRationale}
                      confidence={caseState.confidence}
                      rationale={
                        caseState.status === "tentative"
                          ? "Confianza por debajo del 70% o posición ambigua: validá con documentación y despachante."
                          : undefined
                      }
                      discardedNotes={caseState.discardedNotes}
                      discardedCandidates={caseState.discardedCandidates}
                      variant={caseState.status === "resolved" && !caseState.ambiguity ? "resolved" : "tentative"}
                    />
                  ) : caseState.discardedCandidates && caseState.discardedCandidates.length > 0 ? (
                    <div className="rounded-2xl border border-rose-500/15 bg-rose-500/[0.04] p-3 shadow-xl sm:p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-rose-400/90">
                        Sin NCM prioritaria
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-slate-400">
                        El motor descartó las posiciones siguientes por incompatibilidad con el producto descrito.
                      </p>
                      <DiscardedCandidatesBlock items={caseState.discardedCandidates} variant="full" className="mt-3" />
                    </div>
                  ) : null}
                  {caseState.candidates && caseState.candidates.length > 0 ? (
                    <SuggestedCandidatesList candidates={caseState.candidates} />
                  ) : null}

                  {showResultCard ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <button
                        type="button"
                        disabled={pendingQuote}
                        onClick={() => void createQuoteFromClassifier()}
                        className="min-h-[48px] rounded-xl bg-[#2563eb] px-4 py-3 text-[13px] font-medium text-white shadow-lg shadow-[#2563eb]/20 transition hover:bg-[#1d4ed8] disabled:opacity-40 sm:min-h-0"
                      >
                        {pendingQuote ? "Creando presupuesto…" : "Crear presupuesto con este NCM"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          reset();
                          setQuoteResult(null);
                          setInvoiceFiles([]);
                        }}
                        className="min-h-[44px] rounded-xl border border-white/[0.08] px-4 py-3 text-[12px] text-slate-500 transition hover:border-white/[0.15] hover:text-slate-300 sm:min-h-0"
                      >
                        Nuevo caso
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <ChatInput
            onSend={handleSend}
            disabled={busy}
            canSubmitEmpty={invoiceFiles.length > 0}
            leading={
              <button
                type="button"
                title="Adjuntar factura o proforma"
                onClick={() => invoiceInputRef.current?.click()}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/[0.04] hover:text-slate-300"
              >
                <Paperclip className="h-5 w-5" />
              </button>
            }
            extraAboveField={
              invoiceFiles.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#3b82f6]/20 bg-[#3b82f6]/5 px-3 py-2 text-[12px] text-slate-400">
                  <span className="text-slate-500">Factura:</span>
                  {invoiceFiles.map((f) => (
                    <span
                      key={`${f.name}-${f.size}`}
                      className="rounded-md bg-white/[0.06] px-2 py-0.5 font-medium text-slate-200"
                    >
                      {f.name}
                    </span>
                  ))}
                  <button
                    type="button"
                    className="ml-auto text-[11px] text-[#60a5fa] underline hover:text-white"
                    onClick={() => setInvoiceFiles([])}
                  >
                    Quitar
                  </button>
                </div>
              ) : null
            }
            helperText={
              <span>
                <span className="hidden sm:inline">Enter envía · Shift+Enter nueva línea</span>
                <span className="sm:hidden">Enter envía · Shift+Enter salto de línea</span>
                <span className="text-slate-500"> · Facturas: texto extraído y enviado al analista (igual que el flujo de documentación).</span>
              </span>
            }
          />
        </div>

        <div
          className={`relative z-10 shrink-0 border-t border-white/[0.06] px-3 py-3 lg:w-[320px] lg:border-l lg:border-t-0 lg:px-4 lg:py-5 ${!hasConversation && !quoteResult ? "hidden lg:block" : ""}`}
        >
          <div className="mb-3 flex items-center justify-between gap-2 lg:hidden">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Caso y presupuesto</span>
            {hasConversation ? (
              <button
                type="button"
                onClick={() => {
                  reset();
                  setQuoteResult(null);
                  setInvoiceFiles([]);
                }}
                className="text-[11px] text-slate-500 hover:text-slate-300"
              >
                Nuevo
              </button>
            ) : null}
          </div>

          <CaseSummaryPanel caseState={caseState} pending={busy} />

          {quoteResult ? (
            <div className="mt-6 space-y-3 border-t border-white/[0.06] pt-6">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Presupuesto</p>
              <p className="text-[11px] text-slate-600">ID: {quoteResult.quoteId.slice(0, 12)}…</p>
              {totalCard ? (
                <div className="rounded-lg border border-white/[0.06] bg-[#0f172a]/80 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{totalCard.label}</p>
                  <p
                    className="mt-1 text-[17px] font-bold text-amber-400/90"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {totalCard.value}
                  </p>
                  {quoteResult.totalMinUsd != null && quoteResult.totalMaxUsd != null ? (
                    <p className="mt-1 text-[10px] text-slate-600">
                      Rango numérico: {fmtUsd(quoteResult.totalMinUsd)} – {fmtUsd(quoteResult.totalMaxUsd)}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <Link
                href="/app/operaciones"
                className="flex w-full items-center justify-center rounded-lg bg-[#2563eb] py-2.5 text-[12px] font-medium text-white transition-colors hover:bg-[#1d4ed8]"
              >
                Ver operaciones
              </Link>
              <Link
                href={`/api/quote/pdf?mode=quote&id=${encodeURIComponent(quoteResult.quoteId)}`}
                className="flex w-full items-center justify-center rounded-lg border border-white/[0.06] py-2 text-[12px] text-slate-500 transition-colors hover:text-slate-300"
              >
                Descargar PDF
              </Link>
            </div>
          ) : (
            <p className="mt-6 text-[12px] leading-relaxed text-slate-600">
              Cuando el NCM esté listo, tocá <span className="text-slate-400">Crear presupuesto con este NCM</span> para
              guardar la operación y ver totales acá.
            </p>
          )}

          <div className="mt-4 hidden lg:block">
            {hasConversation ? (
              <button
                type="button"
                onClick={() => {
                  reset();
                  setQuoteResult(null);
                  setInvoiceFiles([]);
                }}
                className="w-full rounded-lg border border-white/[0.08] py-2 text-[12px] text-slate-500 transition hover:border-white/[0.15] hover:text-slate-300"
              >
                Nuevo caso
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <ClasificarNcmPipelineFooter />
    </div>
  );
}
