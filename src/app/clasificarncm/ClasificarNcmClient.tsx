"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useClasificarChat } from "./hooks/useClasificarChat";
import { ChatContainer } from "./components/ChatContainer";
import { ChatInput } from "./components/ChatInput";
import { CaseSummaryPanel } from "./components/CaseSummaryPanel";
import { ClassificationCard } from "./components/ClassificationCard";
import { DiscardedCandidatesBlock } from "./components/DiscardedCandidatesBlock";
import { FollowUpQuestions } from "./components/FollowUpQuestions";
import { SuggestedCandidatesList } from "./components/SuggestedCandidatesList";
import { ClasificarNcmPipelineFooter } from "./components/ClasificarNcmPipelineFooter";
import {
  CLASIFICAR_NCM_LANDING_DESCRIPTION,
  CLASIFICAR_NCM_LANDING_TITLE,
  CLASIFICAR_NCM_SUGGESTIONS,
} from "./uiConstants";
import { AMBIGUITY_REASON_LABELS } from "@/lib/clasificar-ncm/ncmAmbiguity";

export default function ClasificarNcmClient() {
  const { caseState, sendMessage, pending, reset } = useClasificarChat();

  const showResultCard =
    caseState.recommendedNcm &&
    typeof caseState.confidence === "number" &&
    (caseState.status === "resolved" || caseState.status === "tentative");

  const followUpContext =
    caseState.ambiguity && caseState.pendingQuestions?.length
      ? `${AMBIGUITY_REASON_LABELS[caseState.ambiguity.reason]} — falta definir: ${caseState.ambiguity.decisiveField}.`
      : undefined;

  const hasConversation = caseState.messages.length > 0;

  return (
    <div
      className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-[#030712] pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)]"
      style={{ fontFamily: "var(--font-body, ui-sans-serif, system-ui)" }}
    >
      {/* subtle grid */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `linear-gradient(rgba(148,163,184,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.04) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <header className="relative z-10 flex min-h-[52px] flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2 sm:min-h-0 sm:gap-3 sm:px-6 sm:py-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link href="/" className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center sm:min-h-0 sm:min-w-0">
            <img src="/brand/ecomex-logo.png" alt="E-COMEX" className="h-5 brightness-0 invert" />
          </Link>
          <div className="hidden h-4 w-px bg-white/[0.08] sm:block" />
          <div className="hidden min-w-0 sm:block">
            <span className="text-[13px] font-medium text-slate-400">Clasificación NCM</span>
            <span className="ml-2 text-[11px] text-slate-600">conversacional</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
          <button
            type="button"
            onClick={reset}
            className="flex min-h-[44px] items-center justify-center rounded-lg border border-white/[0.08] px-3 text-[12px] text-slate-500 transition hover:border-white/[0.15] hover:text-slate-300 active:bg-white/[0.04] sm:min-h-0 sm:py-1.5"
          >
            Nuevo caso
          </button>
          <Link
            href="/clasificador"
            className="flex min-h-[44px] items-center px-3 text-[12px] text-slate-600 transition hover:text-slate-400 active:text-slate-300 sm:min-h-0 sm:px-2"
          >
            Cotización
          </Link>
          <Link
            href="/"
            className="flex min-h-[44px] items-center px-3 text-[12px] text-slate-600 transition hover:text-slate-400 active:text-slate-300 sm:min-h-0 sm:px-2"
          >
            Inicio
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Main column */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
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
              <div className="mt-8 flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
                {CLASIFICAR_NCM_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={pending}
                    onClick={() => sendMessage(s)}
                    className="min-h-[48px] w-full touch-manipulation rounded-xl border border-white/[0.08] bg-[#0f172a]/80 px-4 py-3 text-left text-[14px] leading-snug text-slate-400 transition hover:border-[#3b82f6]/30 hover:text-slate-200 active:scale-[0.99] disabled:opacity-40 sm:min-h-0 sm:w-auto sm:px-3 sm:py-2 sm:text-[12px]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ChatContainer messages={caseState.messages} pending={pending} />
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
              </div>
            </div>
          ) : null}

          <ChatInput onSend={sendMessage} disabled={pending} />
        </div>

        {/* Oculto en móvil hasta que haya mensajes (landing más limpia); visible siempre en desktop */}
        <div
          className={`relative z-10 shrink-0 border-t border-white/[0.06] px-3 py-3 lg:w-[320px] lg:border-l lg:border-t-0 lg:px-4 lg:py-5 ${!hasConversation ? "hidden lg:block" : ""}`}
        >
          <CaseSummaryPanel caseState={caseState} pending={pending} />
        </div>
      </div>

      <ClasificarNcmPipelineFooter />
    </div>
  );
}
