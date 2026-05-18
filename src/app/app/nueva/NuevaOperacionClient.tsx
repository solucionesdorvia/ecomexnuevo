"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Paperclip } from "lucide-react";
import { useClasificarChat } from "@/app/clasificarncm/hooks/useClasificarChat";
import { ChatContainer } from "@/app/clasificarncm/components/ChatContainer";
import { ChatInput } from "@/app/clasificarncm/components/ChatInput";
import { ClassificationCard } from "@/app/clasificarncm/components/ClassificationCard";
import { FollowUpQuestions } from "@/app/clasificarncm/components/FollowUpQuestions";
import type { CaseSnapshot, CaseState } from "@/lib/clasificar-ncm/types";
import { QuoteCostBreakdown, type QuoteCostPayload } from "./QuoteCostBreakdown";
import { buildChatPrefillFromParams, stripNcmDigits } from "@/lib/quote/cotizarFromClassifier";
import { ncmToPartida } from "@/lib/ncmDisplay";
import { FlowStepper } from "./FlowStepper";
import { QuickReplies } from "./QuickReplies";

const QUALIFICATIONS = [
  "Ya definí el producto que quiero importar",
  "Sé cuántas unidades (o cuánto peso) necesito",
  "Tengo identificado el proveedor o el país de origen",
  "Estoy listo para abrir la operación y que el equipo me contacte",
] as const;

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
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [quoteResult, setQuoteResult] = useState<QuoteCostPayload | null>(null);
  const [qualChecked, setQualChecked] = useState(QUALIFICATIONS.map(() => false));
  const allQualified = qualChecked.every(Boolean);

  function toggleQual(i: number) {
    setQualChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  }
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
        setQuoteError(e instanceof Error ? e.message : "Error al enviar el mensaje.");
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
    setQuoteError(null);
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
        setQuoteError(json.error || "No se pudo crear el presupuesto.");
        return;
      }
      if (json.quoteId && json.cards) {
        setQuoteResult({
          quoteId: json.quoteId,
          ncm: (json as QuoteCostPayload).ncm,
          cards: json.cards,
          totalMinUsd: json.totalMinUsd,
          totalMaxUsd: json.totalMaxUsd,
          explanation: json.explanation,
          assumptions: json.assumptions,
          quality: json.quality,
          quantity: caseState.purchase?.quantity,
          breakdown: (json as any).breakdown ?? undefined,
        });
      }
    } catch (e) {
      setQuoteError(e instanceof Error ? e.message : "Error inesperado.");
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
      setOperationError(e instanceof Error ? e.message : "Error al iniciar la importación. Intentá de nuevo.");
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
              <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:py-12">
                <div className="w-full max-w-2xl">
                  <h1
                    className="nueva-fade-in text-[26px] font-extrabold leading-[1.1] tracking-tight text-white sm:text-[30px]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    ¿Qué vas a importar?
                  </h1>
                  <p className="nueva-fade-in nueva-fade-in-delay-1 mt-3 text-[14px] leading-relaxed text-slate-500">
                    Producto, precio y país de origen. Con eso armamos la cotización completa: NCM, aranceles, flete e impuestos.
                  </p>
                  <div className="nueva-fade-in nueva-fade-in-delay-2 mt-7 grid gap-2 sm:grid-cols-2">
                    {HERO_SUGGESTIONS.map((s, i) => (
                      <button
                        key={s.title}
                        type="button"
                        disabled={busy}
                        onClick={() => void sendMessage(`${s.title}, ${s.hint.replace(/\s·\s/g, ", ")}`)}
                        className="group flex items-center justify-between rounded-lg border border-white/[0.07] bg-[#0a1422]/80 px-4 py-3 text-left transition hover:border-white/[0.14] hover:bg-[#0d1a2e] disabled:pointer-events-none disabled:opacity-40"
                        style={{ animationDelay: `${240 + i * 50}ms` }}
                      >
                        <div>
                          <span className="block text-[13px] font-semibold text-slate-200 transition-colors group-hover:text-white">
                            {s.title}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-slate-500">
                            {s.hint}
                          </span>
                        </div>
                        <ArrowRight
                          className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:text-slate-400"
                          aria-hidden
                        />
                      </button>
                    ))}
                  </div>
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
                    <div className="card-in rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3.5">
                      <p className="text-[13px] font-medium text-slate-200">
                        Tenemos todo lo necesario para calcular el presupuesto.
                      </p>
                    </div>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      disabled={pendingQuote}
                      onClick={() => void createQuoteFromClassifier()}
                      className="min-h-[48px] rounded-xl bg-[#18C3D6] px-4 py-3 text-[13px] font-semibold text-[#030d18] shadow-lg shadow-[#18C3D6]/20 transition hover:bg-[#0ea5b9] disabled:opacity-40 sm:min-h-0"
                    >
                      {pendingQuote ? "Calculando presupuesto…" : "Ver presupuesto"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        reset();
                        setQuoteResult(null);
                        setInvoiceFiles([]);
                        setQuoteError(null);
                        setQualChecked(QUALIFICATIONS.map(() => false));
                      }}
                      className="min-h-[44px] text-[12px] text-slate-500 transition hover:text-slate-300 sm:min-h-0"
                    >
                      Consultar otro producto
                    </button>
                  </div>
                  {quoteError ? (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/[0.07] px-3.5 py-3">
                      <p className="text-[12px] leading-relaxed text-red-300">{quoteError}</p>
                    </div>
                  ) : null}
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
                  <div className="card-in rounded-2xl border border-white/[0.09] bg-[#0a1422] p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] pb-4">
                      <p className="text-[13px] font-semibold text-white">
                        Abrir operación formal
                      </p>
                      {(quoteResult.ncm || caseState.recommendedNcm) ? (
                        <span className="ml-auto rounded-md border border-white/[0.1] bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-slate-400">
                          Pos. {ncmToPartida(quoteResult.ncm || caseState.recommendedNcm || "") || quoteResult.ncm || caseState.recommendedNcm}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-3.5 text-[12px] leading-relaxed text-slate-500">
                      Al confirmar, abrís la operación en el sistema. El equipo revisa la clasificación
                      aduanera, verifica los costos reales y te contacta con el presupuesto definitivo.
                      Confirmá que estás en condiciones de avanzar:
                    </p>

                    <div className="mt-4 space-y-3">
                      {QUALIFICATIONS.map((q, i) => (
                        <label
                          key={i}
                          className="flex cursor-pointer items-start gap-3 select-none"
                        >
                          <input
                            type="checkbox"
                            checked={qualChecked[i]}
                            onChange={() => toggleQual(i)}
                            className="sr-only"
                          />
                          <div
                            className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition-all ${
                              qualChecked[i]
                                ? "border-[#18C3D6] bg-[#18C3D6]"
                                : "border-white/20 bg-white/[0.03] hover:border-white/30"
                            }`}
                            aria-hidden
                          >
                            {qualChecked[i] && (
                              <Check className="h-3 w-3 text-[#030712]" strokeWidth={3} />
                            )}
                          </div>
                          <span
                            className={`text-[12.5px] leading-snug transition-colors ${
                              qualChecked[i] ? "text-slate-200" : "text-slate-500"
                            }`}
                          >
                            {q}
                          </span>
                        </label>
                      ))}
                    </div>

                    <div className="mt-5 flex flex-col gap-2">
                      {operationError ? (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.07] px-3.5 py-3">
                          <p className="text-[12px] leading-relaxed text-red-300">{operationError}</p>
                        </div>
                      ) : null}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <button
                          type="button"
                          onClick={() => { setOperationError(null); void startOperation(); }}
                          disabled={!allQualified || pendingOperation}
                          className="group flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#18C3D6] px-5 py-3 text-center text-[14px] font-semibold text-[#030712] transition hover:bg-[#15afc1] disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-[44px]"
                        >
                          {pendingOperation ? "Abriendo operación…" : "Confirmar y abrir operación"}
                          {!pendingOperation && (
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                          )}
                        </button>
                        <Link
                          href={`/api/quote/pdf?mode=quote&id=${encodeURIComponent(quoteResult.quoteId)}`}
                          className="min-h-[44px] rounded-xl border border-white/[0.1] px-4 py-2.5 text-center text-[13px] font-medium text-slate-400 transition hover:border-white/[0.18] hover:text-slate-200 sm:min-h-0"
                        >
                          Descargar PDF
                        </Link>
                      </div>
                      {!allQualified && (
                        <p className="text-center text-[11px] text-slate-600">
                          Confirmá los puntos anteriores para habilitar la operación
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {showNcmBanner ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-white/[0.06] bg-[#18C3D6]/10 px-3 py-2.5 text-[12px] text-slate-300 sm:px-5">
              <span className="rounded-md border border-[#18C3D6]/25 bg-[#0f172a]/80 px-2 py-0.5 font-mono text-[11px] text-slate-200">
                NCM precargado: {cleanNcm}
              </span>
              <button
                type="button"
                onClick={() => {
                  setNcmBannerDismissed(true);
                  router.replace("/app/nueva");
                }}
                className="ml-auto text-[11px] font-medium text-[#18C3D6] underline-offset-2 hover:text-white hover:underline"
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
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#18C3D6]/20 bg-[#18C3D6]/5 px-3 py-2 text-[12px] text-slate-400">
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
                    className="ml-auto text-[11px] text-[#18C3D6] underline hover:text-white"
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
