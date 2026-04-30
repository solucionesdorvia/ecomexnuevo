"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { ArrowRight, Paperclip, Sparkles } from "lucide-react";
import { useClasificarChat } from "@/app/clasificarncm/hooks/useClasificarChat";
import { ChatContainer } from "@/app/clasificarncm/components/ChatContainer";
import { ChatInput } from "@/app/clasificarncm/components/ChatInput";
import { ClassificationCard } from "@/app/clasificarncm/components/ClassificationCard";
import { FollowUpQuestions } from "@/app/clasificarncm/components/FollowUpQuestions";
import type { CaseSnapshot, CaseState } from "@/lib/clasificar-ncm/types";
import { QuoteCostBreakdown, type QuoteCostPayload } from "./QuoteCostBreakdown";
import { buildChatPrefillFromParams, stripNcmDigits } from "@/lib/quote/cotizarFromClassifier";
import { FlowStepper } from "./FlowStepper";
import { QuickReplies } from "./QuickReplies";

const HERO_SUGGESTIONS = [
  { title: "MacBook Pro M2", hint: "1 unidad · USA · USD 1.200" },
  { title: "Auriculares bluetooth", hint: "100u · China · USD 8" },
  { title: "Cargador USB-C 65W", hint: "500u · China · USD 3" },
  { title: "Remeras algodón básicas", hint: "200u · China · USD 4" },
];

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
  const [pendingOperation, setPendingOperation] = useState(false);
  const invoiceInputRef = useRef<HTMLInputElement>(null);

  const cleanNcm = initialNcm?.trim() ? stripNcmDigits(initialNcm) : "";
  const productoDecoded = initialProducto?.trim() ?? "";
  const hasValidPrefillNcm = cleanNcm.length >= 6;
  const messagePrefill = hasValidPrefillNcm ? buildChatPrefillFromParams(cleanNcm, productoDecoded || null) : "";
  const showNcmBanner = hasValidPrefillNcm && !ncmBannerDismissed;

  /**
   * Mostrar la tarjeta de resultado cuando:
   *  (a) el motor dio NCM + confianza con status resolved/tentative, o
   *  (b) el analista cerró el análisis y ya tenemos los datos comerciales
   *      completos (FOB + cantidad + origen). Sirve para los casos donde
   *      el motor no alcanza a dar NCM pero igual podemos seguir al
   *      presupuesto (el endpoint resuelve NCM del lado del server).
   */
  const hasCommercialDataRaw = Boolean(
    caseState.purchase?.fobUnitUsd &&
      caseState.purchase?.quantity &&
      caseState.purchase?.origin
  );
  const showResultCard =
    (caseState.recommendedNcm &&
      typeof caseState.confidence === "number" &&
      (caseState.status === "resolved" || caseState.status === "tentative")) ||
    (hasCommercialDataRaw &&
      (caseState.status === "resolved" || caseState.status === "tentative"));

  /**
   * No exponer al usuario: etiquetas como "Varias posiciones plausibles (afinar
   * criterio) — falta definir: Función principal / encuadre legal." son jerga
   * aduanera interna. Las ocultamos siempre en el card de datos pendientes.
   * Si hace falta pedir un dato, el analista lo pregunta en el mensaje
   * (ya está en tono humano).
   */
  const followUpContext = undefined;

  const busy = pending || pendingExtract;

  const hasProduct = Boolean(caseState.productName || caseState.technicalName);
  const hasCommercialData = hasCommercialDataRaw;
  const hasAnalysis = Boolean(showResultCard);
  const hasBudget = Boolean(quoteResult);

  const stepperStep: "product" | "data" | "analysis" | "budget" | "operation" = hasBudget
    ? "operation"
    : hasAnalysis
      ? "budget"
      : hasCommercialData
        ? "analysis"
        : hasProduct
          ? "data"
          : "product";

  const lastAssistant = useMemo(() => {
    for (let i = caseState.messages.length - 1; i >= 0; i--) {
      const m = caseState.messages[i]!;
      if (m.role === "assistant") return m.content;
    }
    return "";
  }, [caseState.messages]);

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

  /**
   * Crea la Operation a partir del Quote y redirige al detalle de la
   * importación. El endpoint /api/app/operations exige stage="quoted" y un
   * Quote sin Operation previa; la página /app/operaciones/[id]/operation
   * espera un OPERATION ID, NO un quoteId — por eso hay que crear la
   * Operation primero y usar el id devuelto para navegar.
   */
  async function startOperation() {
    if (!quoteResult || pendingOperation) return;
    setPendingOperation(true);
    try {
      const res = await fetch("/api/app/operations", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quoteId: quoteResult.quoteId }),
      });
      const json = (await res.json()) as { operationId?: string; error?: string };
      if (!res.ok || !json.operationId) {
        // Si ya había una operación creada para este quote, redirigimos a la
        // que existe (UX defensiva: el usuario clickeó dos veces o vino con
        // backbutton).
        if (res.status === 409) {
          const detail = await fetch(
            `/api/app/operations?ts=${Date.now()}`,
            { credentials: "include" }
          ).then((r) => r.json()).catch(() => null);
          const existing =
            Array.isArray(detail?.operations)
              ? detail.operations.find(
                  (op: { quoteId?: string; id?: string }) =>
                    op.quoteId === quoteResult.quoteId
                )
              : null;
          if (existing?.id) {
            router.push(`/app/operaciones/${existing.id}/operation`);
            return;
          }
        }
        throw new Error(json.error || "No se pudo iniciar la importación.");
      }
      router.push(`/app/operaciones/${json.operationId}/operation`);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Error al iniciar la importación.");
      setPendingOperation(false);
    }
    // No reseteamos pendingOperation en el happy-path: el unmount al navegar
    // se encarga; mantener el botón disabled previene doble-click.
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

      <FlowStepper
        currentStep={stepperStep}
        hasProduct={hasProduct}
        hasCommercialData={hasCommercialData}
        hasAnalysis={hasAnalysis}
        hasBudget={hasBudget}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {caseState.messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:py-14">
                <div className="nueva-fade-in relative">
                  <div
                    className="absolute -inset-6 rounded-full bg-gradient-to-br from-[#38bdf8]/25 via-[#3b82f6]/15 to-transparent blur-2xl"
                    aria-hidden
                  />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-[#38bdf8]/30 bg-gradient-to-br from-[#0f172a]/95 to-[#0b1220] shadow-[0_24px_60px_-18px_rgba(56,189,248,0.5)]">
                    <Sparkles className="h-9 w-9 text-[#38bdf8]" strokeWidth={1.4} />
                  </div>
                </div>
                <div
                  className="nueva-fade-in nueva-fade-in-delay-1 mt-6 inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400"
                >
                  Análisis inteligente de importación
                </div>
                <h1
                  className="nueva-fade-in nueva-fade-in-delay-2 mt-4 max-w-xl text-center text-[26px] font-extrabold leading-[1.1] tracking-tight text-white sm:text-[32px]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Contanos qué vas a importar
                </h1>
                <p className="nueva-fade-in nueva-fade-in-delay-3 mt-4 max-w-md text-center text-[15px] leading-relaxed text-slate-400">
                  Producto, precio y país de origen. Con eso armamos tu cotización completa.
                </p>
                <div className="nueva-fade-in nueva-fade-in-delay-4 mt-10 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                  {HERO_SUGGESTIONS.map((s, i) => (
                    <button
                      key={s.title}
                      type="button"
                      disabled={busy}
                      onClick={() => void sendMessage(`${s.title}, ${s.hint.replace(/\s·\s/g, ", ")}`)}
                      className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c1220]/90 px-4 py-3 text-left shadow-sm shadow-black/20 transition-all hover:-translate-y-0.5 hover:border-[#38bdf8]/40 hover:shadow-[0_16px_40px_-16px_rgba(56,189,248,0.35)] disabled:pointer-events-none disabled:opacity-40"
                      style={{ animationDelay: `${360 + i * 60}ms` }}
                    >
                      <span className="block text-[14px] font-semibold text-white transition-colors group-hover:text-[#7dd3fc]">
                        {s.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
                        {s.hint}
                      </span>
                      <ArrowRight
                        className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 translate-x-2 text-[#38bdf8] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                        aria-hidden
                      />
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
            !showResultCard &&
            !hasCommercialData ? (
              <div className="shrink-0 border-t border-white/[0.04] px-3 py-3 sm:px-6">
                <div className="mx-auto max-w-[720px]">
                  <FollowUpQuestions questions={caseState.pendingQuestions} context={followUpContext} />
                </div>
              </div>
            ) : null}

            {showResultCard ? (
              <div className="nueva-reveal shrink-0 border-t border-white/[0.04] bg-[#0b1220]/60 px-3 py-4 sm:px-6 sm:py-5">
                <div className="mx-auto flex max-w-[720px] flex-col gap-3">
                  {/*
                    NCM visible para todos (provisorio): antes estaba gated por
                    isOperator, pero el cliente final también necesita verlo
                    como referencia (queda explicado el carácter estimativo en
                    el banner del reporte y en el PDF).
                  */}
                  {caseState.recommendedNcm && typeof caseState.confidence === "number" ? (
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
                    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.08] to-emerald-500/[0.02] p-4 sm:p-5">
                      <div
                        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/20 blur-3xl"
                        aria-hidden
                      />
                      <p className="relative text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300/90">
                        ✓ Producto analizado
                      </p>
                      <p className="relative mt-2 text-[15px] font-medium leading-relaxed text-slate-100">
                        Ya tenemos lo necesario para armarte el presupuesto completo.
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
                className="nueva-reveal shrink-0 border-t border-white/[0.06] bg-[#0b1220]/60 px-3 py-4 sm:px-6 sm:py-5"
                aria-live="polite"
              >
                <div className="mx-auto flex max-w-[720px] flex-col gap-4">
                  <QuoteCostBreakdown quote={quoteResult} scrollIntoViewOnMount />
                  <div className="relative overflow-hidden rounded-2xl border border-[#2563eb]/40 bg-gradient-to-br from-[#1e40af]/50 via-[#1e3a8a]/35 to-[#0b1220] p-5 sm:p-6">
                    <div
                      className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#3b82f6]/30 blur-3xl"
                      aria-hidden
                    />
                    <div
                      className="pointer-events-none absolute -left-16 -bottom-16 h-40 w-40 rounded-full bg-[#60a5fa]/20 blur-3xl"
                      aria-hidden
                    />
                    <div className="relative">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#93c5fd]">
                          Listo para avanzar
                        </p>
                        {caseState.recommendedNcm ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-[#3b82f6]/35 bg-[#0f172a]/70 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-[#93c5fd]">
                            NCM <span className="text-white">{caseState.recommendedNcm}</span>
                          </span>
                        ) : null}
                      </div>
                      <p
                        className="mt-2 text-[20px] font-extrabold leading-tight text-white sm:text-[22px]"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        Cotización lista.
                      </p>
                      <p className="mt-1.5 text-[14px] leading-relaxed text-slate-300">
                        El siguiente paso es que un operador coordine proveedor, flete y documentación.
                      </p>
                      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <button
                          type="button"
                          onClick={() => void startOperation()}
                          disabled={pendingOperation}
                          className="nueva-cta-pulse group flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#3b82f6] px-5 py-3 text-center text-[15px] font-semibold text-white transition-all hover:from-[#1d4ed8] hover:to-[#2563eb] disabled:cursor-not-allowed disabled:opacity-70 sm:min-h-[48px]"
                        >
                          {pendingOperation ? "Iniciando importación…" : "Avanzar con la importación"}
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </button>
                        <Link
                          href={`/api/quote/pdf?mode=quote&id=${encodeURIComponent(quoteResult.quoteId)}`}
                          className="min-h-[44px] rounded-xl border border-white/[0.12] px-4 py-2.5 text-center text-[13px] font-medium text-slate-300 transition hover:border-white/[0.22] hover:bg-white/[0.03] hover:text-white sm:min-h-0"
                        >
                          Descargar PDF
                        </Link>
                      </div>
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

          {!showResultCard && !busy && lastAssistant ? (
            <QuickReplies
              lastAssistantText={lastAssistant}
              disabled={busy}
              onPick={(v) => void handleSend(v)}
            />
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
