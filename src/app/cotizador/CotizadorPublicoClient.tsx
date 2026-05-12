"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ArrowRight, Download, UserPlus, X } from "lucide-react";
import { useClasificarChat } from "@/app/clasificarncm/hooks/useClasificarChat";
import { ChatContainer } from "@/app/clasificarncm/components/ChatContainer";
import { ChatInput } from "@/app/clasificarncm/components/ChatInput";
import { ClassificationCard } from "@/app/clasificarncm/components/ClassificationCard";
import { FollowUpQuestions } from "@/app/clasificarncm/components/FollowUpQuestions";
import type { CaseSnapshot, CaseState } from "@/lib/clasificar-ncm/types";
import { QuoteCostBreakdown, type QuoteCostPayload } from "@/app/app/nueva/QuoteCostBreakdown";
import { FlowStepper } from "@/app/app/nueva/FlowStepper";
import { QuickReplies } from "@/app/app/nueva/QuickReplies";

const ANON_QUOTE_KEY = "ecomex_pq";

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

function getQuoteCount(): number {
  if (typeof localStorage === "undefined") return 0;
  return parseInt(localStorage.getItem(ANON_QUOTE_KEY) ?? "0", 10);
}

function incrementQuoteCount() {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(ANON_QUOTE_KEY, String(getQuoteCount() + 1));
}

function EmailModal({
  reason,
  onSubmit,
  onSkip,
}: {
  reason: "second_quote" | "pdf";
  onSubmit: (email: string) => void;
  onSkip: () => void;
}) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!email.includes("@")) return;
    setPending(true);
    try {
      await fetch("/api/cotizador/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // silent — lead capture is best-effort
    }
    onSubmit(email);
    setPending(false);
  }

  const title =
    reason === "pdf" ? "¿A dónde te enviamos el PDF?" : "Dejá tu email para seguir cotizando";
  const desc =
    reason === "pdf"
      ? "También podés descargarlo directamente sin registrarte."
      : "Es gratis. Te avisamos cuando tengamos novedades para tu operación.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
        style={{ background: "#0d1826", borderColor: "rgba(255,255,255,0.1)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[16px] font-bold text-white">{title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-400">{desc}</p>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="mt-0.5 text-slate-500 transition hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            placeholder="tu@email.com"
            className="min-h-[44px] flex-1 rounded-xl border border-white/[0.08] bg-[#07111A] px-3 text-[14px] text-white outline-none placeholder:text-slate-600 focus:border-[#18C3D6]/40"
            autoFocus
          />
          <button
            type="button"
            onClick={() => void submit()}
            disabled={pending || !email.includes("@")}
            className="min-h-[44px] rounded-xl bg-[#18C3D6] px-4 text-[13px] font-medium text-[#030d18] transition hover:bg-[#0ea5b9] disabled:opacity-50"
          >
            {pending ? "..." : reason === "pdf" ? "Enviar" : "Continuar"}
          </button>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="mt-3 w-full text-center text-[12px] text-slate-500 transition hover:text-slate-300"
        >
          {reason === "pdf" ? "Descargar sin registrarme" : "Omitir por ahora"}
        </button>
      </div>
    </div>
  );
}

export default function CotizadorPublicoClient() {
  const { caseState, sendMessage, pending, reset } = useClasificarChat();
  const [pendingQuote, setPendingQuote] = useState(false);
  const [quoteResult, setQuoteResult] = useState<QuoteCostPayload | null>(null);
  const [emailModal, setEmailModal] = useState<null | "second_quote" | "pdf">(null);
  const [pendingAction, setPendingAction] = useState<null | "new_quote" | "pdf">(null);
  const [capturedEmail, setCapturedEmail] = useState<string | null>(null);

  const hasProduct = Boolean(caseState.productName || caseState.technicalName);
  const hasCommercialData = Boolean(
    caseState.purchase?.fobUnitUsd && caseState.purchase?.quantity && caseState.purchase?.origin
  );
  const showResultCard =
    (caseState.recommendedNcm &&
      typeof caseState.confidence === "number" &&
      (caseState.status === "resolved" || caseState.status === "tentative")) ||
    (hasCommercialData && (caseState.status === "resolved" || caseState.status === "tentative"));
  const hasBudget = Boolean(quoteResult);

  const stepperStep: "product" | "data" | "analysis" | "budget" | "operation" = hasBudget
    ? "operation"
    : showResultCard
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
      const t = text.trim();
      if (!t) return;
      await sendMessage(t);
    },
    [sendMessage]
  );

  async function createQuote() {
    if (pendingQuote || !showResultCard) return;
    setPendingQuote(true);
    setQuoteResult(null);
    try {
      const res = await fetch("/api/cotizador/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          snapshot: stripMessages(caseState),
          messages: caseState.messages,
        }),
      });
      const json = (await res.json()) as QuoteCostPayload & { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error || "No se pudo crear el presupuesto.");
      if (json.quoteId && json.cards) {
        setQuoteResult({
          quoteId: json.quoteId,
          ncm: json.ncm,
          cards: json.cards,
          totalMinUsd: json.totalMinUsd,
          totalMaxUsd: json.totalMaxUsd,
          explanation: json.explanation,
          assumptions: json.assumptions,
          quality: json.quality,
          quantity: caseState.purchase?.quantity,
        });
        incrementQuoteCount();
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Error inesperado.");
    } finally {
      setPendingQuote(false);
    }
  }

  function handleNewQuote() {
    if (getQuoteCount() >= 1 && !capturedEmail) {
      setPendingAction("new_quote");
      setEmailModal("second_quote");
    } else {
      reset();
      setQuoteResult(null);
    }
  }

  function handlePdfDownload() {
    if (!quoteResult) return;
    if (!capturedEmail) {
      setPendingAction("pdf");
      setEmailModal("pdf");
    } else {
      triggerDownload();
    }
  }

  function triggerDownload() {
    if (!quoteResult) return;
    window.open(
      `/api/quote/pdf?mode=quote&id=${encodeURIComponent(quoteResult.quoteId)}`,
      "_blank"
    );
  }

  function onEmailSubmit(email: string) {
    setCapturedEmail(email);
    setEmailModal(null);
    const action = pendingAction;
    setPendingAction(null);
    if (action === "new_quote") {
      reset();
      setQuoteResult(null);
    } else if (action === "pdf") {
      triggerDownload();
    }
  }

  function onEmailSkip() {
    setEmailModal(null);
    const action = pendingAction;
    setPendingAction(null);
    if (action === "new_quote") {
      reset();
      setQuoteResult(null);
    } else if (action === "pdf") {
      triggerDownload();
    }
  }

  return (
    <div
      className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#030712]"
      style={{ fontFamily: "var(--font-body, ui-sans-serif, system-ui)" }}
    >
      {emailModal && (
        <EmailModal reason={emailModal} onSubmit={onEmailSubmit} onSkip={onEmailSkip} />
      )}

      <FlowStepper
        currentStep={stepperStep}
        hasProduct={hasProduct}
        hasCommercialData={hasCommercialData}
        hasAnalysis={Boolean(showResultCard)}
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
                    ¿Cuánto cuesta importar<br className="hidden sm:block" /> a Argentina?
                  </h1>
                  <p className="nueva-fade-in nueva-fade-in-delay-1 mt-3 text-[14px] leading-relaxed text-slate-500">
                    Decinos qué producto, precio y país de origen. Calculamos NCM, aranceles, flete, impuestos y landed cost.
                  </p>
                  <div className="nueva-fade-in nueva-fade-in-delay-2 mt-7 grid gap-2 sm:grid-cols-2">
                    {HERO_SUGGESTIONS.map((s, i) => (
                      <button
                        key={s.title}
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          void sendMessage(`${s.title}, ${s.hint.replace(/\s·\s/g, ", ")}`)
                        }
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
              <ChatContainer messages={caseState.messages} pending={pending} />
            )}

            {caseState.messages.length > 0 &&
            caseState.pendingQuestions &&
            caseState.pendingQuestions.length > 0 &&
            !showResultCard &&
            !hasCommercialData ? (
              <div className="shrink-0 border-t border-white/[0.04] px-3 py-3 sm:px-6">
                <div className="mx-auto max-w-[720px]">
                  <FollowUpQuestions
                    questions={caseState.pendingQuestions}
                    context={undefined}
                  />
                </div>
              </div>
            ) : null}

            {showResultCard ? (
              <div className="nueva-reveal shrink-0 border-t border-white/[0.04] bg-[#0b1220]/60 px-3 py-4 sm:px-6 sm:py-5">
                <div className="mx-auto flex max-w-[720px] flex-col gap-3">
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
                      variant={
                        caseState.status === "resolved" && !caseState.ambiguity
                          ? "resolved"
                          : "tentative"
                      }
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
                      onClick={() => void createQuote()}
                      className="min-h-[48px] rounded-xl bg-[#18C3D6] px-4 py-3 text-[13px] font-medium text-[#030d18] shadow-lg shadow-[#18C3D6]/20 transition hover:bg-[#0ea5b9] disabled:opacity-40 sm:min-h-0"
                    >
                      {pendingQuote ? "Calculando presupuesto…" : "Ver presupuesto"}
                    </button>
                    <button
                      type="button"
                      onClick={handleNewQuote}
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
                  <div className="card-in rounded-2xl border border-white/[0.09] bg-[#0a1422] p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] pb-4">
                      <p className="text-[13px] font-semibold text-white">
                        ¿Querés avanzar con esta importación?
                      </p>
                      {(quoteResult.ncm || caseState.recommendedNcm) ? (
                        <span className="ml-auto rounded-md border border-white/[0.1] bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-slate-400">
                          NCM {quoteResult.ncm || caseState.recommendedNcm}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3.5 text-[13px] leading-relaxed text-slate-400">
                      Creá tu cuenta gratis y nuestro equipo coordina proveedor, flete y documentación.
                    </p>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Link
                        href="/register"
                        className="group flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#18C3D6] px-5 py-3 text-center text-[14px] font-semibold text-[#030712] transition hover:bg-[#15afc1] sm:min-h-[44px]"
                      >
                        <UserPlus className="h-4 w-4" aria-hidden />
                        Crear cuenta gratis
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </Link>
                      <button
                        type="button"
                        onClick={handlePdfDownload}
                        className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] px-4 py-2.5 text-center text-[13px] font-medium text-slate-400 transition hover:border-white/[0.18] hover:text-slate-200 sm:min-h-0"
                      >
                        <Download className="h-4 w-4" aria-hidden />
                        Descargar PDF
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleNewQuote}
                      className="mt-3 w-full text-center text-[12px] text-slate-600 transition hover:text-slate-400"
                    >
                      Cotizar otro producto
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {!showResultCard && !pending && lastAssistant ? (
            <QuickReplies
              lastAssistantText={lastAssistant}
              disabled={pending}
              onPick={(v) => void handleSend(v)}
            />
          ) : null}

          <ChatInput
            onSend={handleSend}
            disabled={pending}
            canSubmitEmpty={false}
            helperText={
              <span>
                <span className="hidden sm:inline">Enter envía · Shift+Enter nueva línea</span>
                <span className="sm:hidden">Enter envía · Shift+Enter salto de línea</span>
              </span>
            }
          />
        </div>
      </div>
    </div>
  );
}
