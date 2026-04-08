"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useClasificarChat } from "./hooks/useClasificarChat";
import { ChatContainer } from "./components/ChatContainer";
import { ChatInput } from "./components/ChatInput";
import { CaseSummaryPanel } from "./components/CaseSummaryPanel";
import { ClassificationCard } from "./components/ClassificationCard";
import { FollowUpQuestions } from "./components/FollowUpQuestions";
import { SuggestedCandidatesList } from "./components/SuggestedCandidatesList";

const SUGGESTIONS = [
  "Cargador USB-C de 65W",
  "Guantes de nitrilo descartables",
  "Bomba centrífuga de acero",
  "Pantalla LCD notebook",
  "Válvula hidráulica industrial",
];

export default function ClasificarNcmClient() {
  const { caseState, sendMessage, pending, reset } = useClasificarChat();

  const showResultCard =
    caseState.recommendedNcm &&
    typeof caseState.confidence === "number" &&
    (caseState.status === "resolved" || caseState.status === "tentative");

  return (
    <div
      className="flex min-h-[100dvh] flex-col bg-[#030712]"
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

      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/">
            <img src="/brand/ecomex-logo.png" alt="E-COMEX" className="h-5 brightness-0 invert" />
          </Link>
          <div className="hidden h-4 w-px bg-white/[0.08] sm:block" />
          <div className="hidden sm:block">
            <span className="text-[13px] font-medium text-slate-400">Clasificación NCM</span>
            <span className="ml-2 text-[11px] text-slate-600">conversacional</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-[12px] text-slate-500 transition hover:border-white/[0.15] hover:text-slate-300"
          >
            Nuevo caso
          </button>
          <Link href="/clasificador" className="text-[12px] text-slate-600 transition hover:text-slate-400">
            Cotización
          </Link>
          <Link href="/" className="text-[12px] text-slate-600 transition hover:text-slate-400">
            Inicio
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Main column */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {caseState.messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#3b82f6]/20 bg-[#3b82f6]/10">
                <Sparkles className="h-7 w-7 text-[#60a5fa]" />
              </div>
              <h1
                className="mt-6 max-w-lg text-center text-[22px] font-bold tracking-tight text-white sm:text-[24px]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Analista técnico NCM
              </h1>
              <p className="mt-3 max-w-md text-center text-[14px] leading-relaxed text-slate-500">
                Describí el producto por función y uso real. El sistema va a pedirte solo lo necesario antes de
                sugerir posiciones arancelarias con nivel de confianza.
              </p>
              <div className="mt-8 flex max-w-xl flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={pending}
                    onClick={() => sendMessage(s)}
                    className="rounded-xl border border-white/[0.08] bg-[#0f172a]/80 px-3 py-2 text-left text-[12px] text-slate-400 transition hover:border-[#3b82f6]/30 hover:text-slate-200 disabled:opacity-40"
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
                <FollowUpQuestions questions={caseState.pendingQuestions} />
              </div>
            </div>
          ) : null}

          {caseState.messages.length > 0 && (showResultCard || (caseState.candidates && caseState.candidates.length > 0)) ? (
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
                    variant={caseState.status === "resolved" ? "resolved" : "tentative"}
                  />
                ) : null}
                {caseState.candidates && caseState.candidates.length > 0 ? (
                  <SuggestedCandidatesList candidates={caseState.candidates} />
                ) : null}
              </div>
            </div>
          ) : null}

          <ChatInput onSend={sendMessage} disabled={pending} />
        </div>

        {/* Summary */}
        <div className="relative z-10 shrink-0 border-t border-white/[0.06] px-3 py-3 lg:w-[320px] lg:border-l lg:border-t-0 lg:px-4 lg:py-5">
          <CaseSummaryPanel caseState={caseState} pending={pending} />
        </div>
      </div>

      <footer className="relative z-10 border-t border-white/[0.04] px-4 py-3">
        <p className="mx-auto max-w-4xl text-center text-[10px] leading-relaxed text-slate-600">
          Motor: análisis conversacional + pipeline NCM (IA, nomenclador, PCRAM si hay credenciales). No sustituye
          dictamen de despachante matriculado.
        </p>
      </footer>
    </div>
  );
}
