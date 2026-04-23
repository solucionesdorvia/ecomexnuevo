"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Paperclip, Sparkles } from "lucide-react";
import { useClasificarChat } from "@/app/clasificarncm/hooks/useClasificarChat";
import { ChatContainer } from "@/app/clasificarncm/components/ChatContainer";
import { ChatInput } from "@/app/clasificarncm/components/ChatInput";
import { ClassificationCard } from "@/app/clasificarncm/components/ClassificationCard";
import { FollowUpQuestions } from "@/app/clasificarncm/components/FollowUpQuestions";
import {
  CLASIFICAR_NCM_LANDING_DESCRIPTION,
  CLASIFICAR_NCM_LANDING_TITLE,
  CLASIFICAR_NCM_SUGGESTIONS,
} from "@/app/clasificarncm/uiConstants";
import { AMBIGUITY_REASON_LABELS } from "@/lib/clasificar-ncm/ncmAmbiguity";
import type { CaseSnapshot, CaseState } from "@/lib/clasificar-ncm/types";
import { QuoteCostBreakdown, type QuoteCostPayload } from "./QuoteCostBreakdown";
import { buildChatPrefillFromParams, stripNcmDigits } from "@/lib/quote/cotizarFromClassifier";

function stripMessages(s: CaseState): CaseSnapshot {
  const { messages, ...rest } = s;
  void messages;
  return rest;
}

type NuevaOperacionClientProps = {
  initialNcm?: string;
  initialProducto?: string;
  /** Solo operadores/admin ven el código NCM y la tarjeta de clasificación. */
  isOperator?: boolean;
};

export default function NuevaOperacionClient({
  initialNcm,
  initialProducto,
  isOperator = false,
}: NuevaOperacionClientProps = {}) {
  const router = useRouter();
  const { caseState, sendMessage, pending, reset } = useClasificarChat({ credentials: "include" });
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([]);
  const [pendingExtract, setPendingExtract] = useState(false);
  const [pendingQuote, setPendingQuote] = useState(false);
  const [quoteResult, setQuoteResult] = useState<QuoteCostPayload | null>(null);
  const [ncmBannerDismissed, setNcmBannerDismissed] = useState(false);
  const invoiceInputRef = useRef<HTMLInputElement>(null);

  const cleanNcm = initialNcm?.trim() ? stripNcmDigits(initialNcm) : "";
  const productoDecoded = initialProducto?.trim() ?? "";
  const hasValidPrefillNcm = cleanNcm.length >= 6;
  const messagePrefill = hasValidPrefillNcm ? buildChatPrefillFromParams(cleanNcm, productoDecoded || null) : "";
  const showNcmBanner = hasValidPrefillNcm && !ncmBannerDismissed;

  const showResultCard =
    caseState.recommendedNcm &&
    typeof caseState.confidence === "number" &&
    (caseState.status === "resolved" || caseState.status === "tentative");

  const followUpContext =
    caseState.ambiguity && caseState.pendingQuestions?.length
      ? `${AMBIGUITY_REASON_LABELS[caseState.ambiguity.reason]} — falta definir: ${caseState.ambiguity.decisiveField}.`
      : undefined;

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
      const json = (await res.json()) as QuoteCostPayload & { ok?: boolean; error?: string };
      if (!res.ok) {
        throw new Error(json.error || "No se pudo crear el presupuesto.");
      }
      if (json.quoteId && json.cards) {
        setQuoteResult({
          quoteId: json.quoteId,
          cards: json.cards,
          totalMinUsd: json.totalMinUsd,
          totalMaxUsd: json.totalMaxUsd,
          explanation: json.explanation,
          assumptions: json.assumptions,
          quality: json.quality,
        });
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Error inesperado.");
    } finally {
      setPendingQuote(false);
    }
  }

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

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {caseState.messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:py-14">
                <div className="relative">
                  <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-[#38bdf8]/15 via-transparent to-[#3b82f6]/10 blur-xl" aria-hidden />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[#38bdf8]/25 bg-[#0f172a]/90 shadow-[0_20px_50px_-24px_rgba(56,189,248,0.45)]">
                    <Sparkles className="h-8 w-8 text-[#38bdf8]" strokeWidth={1.5} />
                  </div>
                </div>
                <h1
                  className="mt-8 max-w-lg text-center text-[22px] font-bold tracking-tight text-white sm:text-[26px]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {CLASIFICAR_NCM_LANDING_TITLE}
                </h1>
                <p className="mt-3 max-w-md text-center text-[15px] leading-relaxed text-slate-400 sm:text-[14px]">
                  {CLASIFICAR_NCM_LANDING_DESCRIPTION}
                </p>
                <p className="mt-2 max-w-md text-center text-[12px] leading-relaxed text-slate-600">
                  En la app: cuando el NCM esté listo, generá el presupuesto con el botón debajo del resultado.
                </p>
                <div className="mt-10 flex w-full max-w-xl flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center">
                  {CLASIFICAR_NCM_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={busy}
                      onClick={() => void sendMessage(s)}
                      className="min-h-[48px] w-full touch-manipulation rounded-xl border border-white/[0.09] bg-[#0c1220]/90 px-4 py-3 text-left text-[14px] leading-snug text-slate-400 shadow-sm shadow-black/20 transition hover:border-[#38bdf8]/30 hover:text-slate-200 active:scale-[0.99] disabled:opacity-40 sm:min-h-0 sm:w-auto sm:px-3.5 sm:py-2.5 sm:text-[12px]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ChatContainer messages={caseState.messages} pending={busy} />
            )}

            {caseState.messages.length > 0 &&
            caseState.pendingQuestions &&
            caseState.pendingQuestions.length > 0 &&
            !showResultCard ? (
              <div className="shrink-0 border-t border-white/[0.04] px-3 py-3 sm:px-6">
                <div className="mx-auto max-w-[720px]">
                  <FollowUpQuestions questions={caseState.pendingQuestions} context={followUpContext} />
                </div>
              </div>
            ) : null}

            {showResultCard && caseState.recommendedNcm && typeof caseState.confidence === "number" ? (
              <div className="shrink-0 border-t border-white/[0.04] bg-[#0b1220]/60 px-3 py-4 sm:px-6 sm:py-5">
                <div className="mx-auto flex max-w-[720px] flex-col gap-3">
                  {isOperator ? (
                    <ClassificationCard
                      ncm={caseState.recommendedNcm}
                      description={caseState.classificationRationale}
                      confidence={caseState.confidence}
                      rationale={
                        caseState.status === "tentative"
                          ? "Confianza por debajo del 70% o posición ambigua: validá con documentación y despachante."
                          : undefined
                      }
                      variant={caseState.status === "resolved" && !caseState.ambiguity ? "resolved" : "tentative"}
                    />
                  ) : (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3 sm:p-4">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-emerald-400/80">
                        Producto analizado
                      </p>
                      <p className="mt-1 text-[14px] leading-relaxed text-slate-200">
                        Tenemos lo necesario para armarte el presupuesto.
                      </p>
                    </div>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      disabled={pendingQuote}
                      onClick={() => void createQuoteFromClassifier()}
                      className="min-h-[48px] rounded-xl bg-[#2563eb] px-4 py-3 text-[13px] font-medium text-white shadow-lg shadow-[#2563eb]/20 transition hover:bg-[#1d4ed8] disabled:opacity-40 sm:min-h-0"
                    >
                      {pendingQuote ? "Calculando presupuesto…" : "Ver presupuesto"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        reset();
                        setQuoteResult(null);
                        setInvoiceFiles([]);
                      }}
                      className="min-h-[44px] text-[12px] text-slate-500 transition hover:text-slate-300 sm:min-h-0"
                    >
                      Consultar otro producto
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {quoteResult ? (
              <div
                className="shrink-0 border-t border-white/[0.06] bg-[#0b1220]/60 px-3 py-4 sm:px-6 sm:py-5"
                aria-live="polite"
              >
                <div className="mx-auto flex max-w-[720px] flex-col gap-4">
                  <QuoteCostBreakdown quote={quoteResult} scrollIntoViewOnMount />
                  <div className="rounded-2xl border border-[#2563eb]/30 bg-gradient-to-br from-[#1e3a8a]/40 to-[#1e40af]/20 p-4 sm:p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#93c5fd]">
                      Listo para avanzar
                    </p>
                    <p className="mt-1 text-[14px] leading-relaxed text-slate-200 sm:text-[15px]">
                      Cotización armada. Si querés que un operador coordine la importación (proveedor, flete, documentación), avanzá al siguiente paso.
                    </p>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Link
                        href={`/app/operaciones/${encodeURIComponent(quoteResult.quoteId)}/operation`}
                        className="min-h-[48px] flex-1 rounded-xl bg-[#2563eb] px-4 py-3 text-center text-[14px] font-semibold text-white shadow-lg shadow-[#2563eb]/30 transition hover:bg-[#1d4ed8] sm:min-h-[44px]"
                      >
                        Avanzar con la importación
                      </Link>
                      <Link
                        href={`/api/quote/pdf?mode=quote&id=${encodeURIComponent(quoteResult.quoteId)}`}
                        className="min-h-[44px] rounded-xl border border-white/[0.08] px-4 py-2.5 text-center text-[12px] text-slate-400 transition hover:border-white/[0.18] hover:text-slate-200 sm:min-h-0"
                      >
                        Descargar PDF
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {showNcmBanner ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-white/[0.06] bg-[#3b82f6]/10 px-3 py-2.5 text-[12px] text-slate-300 sm:px-5">
              <span className="rounded-md border border-[#3b82f6]/25 bg-[#0f172a]/80 px-2 py-0.5 font-mono text-[11px] text-slate-200">
                NCM precargado: {cleanNcm}
              </span>
              <button
                type="button"
                onClick={() => {
                  setNcmBannerDismissed(true);
                  router.replace("/app/nueva");
                }}
                className="ml-auto text-[11px] font-medium text-[#60a5fa] underline-offset-2 hover:text-white hover:underline"
              >
                Cerrar
              </button>
            </div>
          ) : null}

          <ChatInput
            key={messagePrefill || "chat-no-prefill"}
            onSend={handleSend}
            disabled={busy}
            canSubmitEmpty={invoiceFiles.length > 0}
            messagePrefill={messagePrefill || undefined}
            leading={
              <button
                type="button"
                title="Adjuntar factura o proforma"
                aria-label="Adjuntar factura o proforma"
                onClick={() => invoiceInputRef.current?.click()}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/[0.04] hover:text-slate-300 sm:h-10 sm:w-10"
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
      </div>
    </div>
  );
}
