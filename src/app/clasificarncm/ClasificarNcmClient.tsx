"use client";

import Image from "next/image";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import type { CaseState } from "@/lib/clasificar-ncm/types";
import { buildNuevaCotizacionUrl } from "@/lib/quote/cotizarFromClassifier";
import { useClasificarChat } from "./hooks/useClasificarChat";
import { ChatContainer } from "./components/ChatContainer";
import { ChatInput } from "./components/ChatInput";
import { ClassificationCard } from "./components/ClassificationCard";
import { FollowUpQuestions } from "./components/FollowUpQuestions";
import {
  CLASIFICAR_NCM_LANDING_DESCRIPTION,
  CLASIFICAR_NCM_LANDING_TITLE,
  CLASIFICAR_NCM_SUGGESTIONS,
} from "./uiConstants";
import { AMBIGUITY_REASON_LABELS } from "@/lib/clasificar-ncm/ncmAmbiguity";

function CotizarEsteProductoCta({ caseState }: { caseState: CaseState }) {
  const [sessionOk, setSessionOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((j: { ok?: boolean }) => {
        if (!cancelled) setSessionOk(!!j.ok);
      })
      .catch(() => {
        if (!cancelled) setSessionOk(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const target = buildNuevaCotizacionUrl(caseState);
  if (!target) return null;

  const href = sessionOk ? target : sessionOk === false ? `/login?redirect=${encodeURIComponent(target)}` : "#";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {sessionOk === null ? (
        <button
          type="button"
          disabled
          className="min-h-[48px] w-full touch-manipulation rounded-xl bg-[#18C3D6]/50 px-4 py-3 text-[13px] font-medium text-white shadow-lg shadow-[#18C3D6]/20 sm:min-h-0 sm:w-auto"
        >
          Cotizar este producto
        </button>
      ) : (
        <Link
          href={href}
          className="flex min-h-[48px] w-full touch-manipulation items-center justify-center rounded-xl bg-[#18C3D6] px-4 py-3 text-center text-[13px] font-medium text-[#030d18] shadow-lg shadow-[#18C3D6]/20 transition hover:bg-[#0ea5b9] sm:min-h-0 sm:w-auto"
        >
          Cotizar este producto
        </Link>
      )}
    </div>
  );
}

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

  const hasPendingQuestions = Boolean(
    caseState.messages.length > 0 &&
      caseState.pendingQuestions &&
      caseState.pendingQuestions.length > 0 &&
      !showResultCard,
  );

  return (
    <div
      className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-[#030712]"
      style={{ fontFamily: "var(--font-body, ui-sans-serif, system-ui)" }}
    >
      <header className="relative z-10 flex min-h-[52px] items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2 pt-safe sm:gap-3 sm:px-6 sm:py-3">
        <Link href="/" className="flex min-h-[44px] min-w-[44px] shrink-0 items-center gap-2 sm:min-h-0 sm:min-w-0">
          <Image src="/brand/ecomex-logo.png" alt="E-COMEX" width={90} height={20} className="h-5 brightness-0 invert" />
          <span className="hidden text-[13px] font-medium text-slate-400 sm:inline">Clasificación NCM</span>
        </Link>
        <button
          type="button"
          onClick={reset}
          className="flex min-h-[44px] items-center justify-center rounded-lg border border-white/[0.08] px-3 text-[12px] text-slate-500 transition hover:border-white/[0.15] hover:text-slate-300 sm:min-h-0 sm:py-1.5"
        >
          Nuevo caso
        </button>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {caseState.messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#18C3D6]/20 bg-[#18C3D6]/10">
                <Sparkles className="h-7 w-7 text-[#18C3D6]" />
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
                    className="min-h-[48px] w-full touch-manipulation rounded-xl border border-white/[0.08] bg-[#0f172a]/80 px-4 py-3 text-left text-[14px] leading-snug text-slate-400 transition hover:border-[#18C3D6]/30 hover:text-slate-200 active:scale-[0.99] disabled:opacity-40 sm:min-h-0 sm:w-auto sm:px-3 sm:py-2 sm:text-[12px]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ChatContainer messages={caseState.messages} pending={pending} />
          )}

          {hasPendingQuestions && caseState.pendingQuestions ? (
            <div className="shrink-0 border-t border-white/[0.04] px-3 py-3 sm:px-6">
              <div className="mx-auto max-w-[720px]">
                <FollowUpQuestions questions={caseState.pendingQuestions} context={followUpContext} />
              </div>
            </div>
          ) : null}

          {showResultCard && caseState.recommendedNcm && typeof caseState.confidence === "number" ? (
            <div className="shrink-0 border-t border-white/[0.04] bg-[#0b1220]/60 px-3 py-4 sm:px-6 sm:py-5">
              <div className="mx-auto flex max-w-[720px] flex-col gap-3">
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
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CotizarEsteProductoCta caseState={caseState} />
                  <button
                    type="button"
                    onClick={reset}
                    className="min-h-[44px] text-[12px] text-slate-500 transition hover:text-slate-300 sm:min-h-0 sm:self-center"
                  >
                    Consultar otro producto
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <ChatInput onSend={sendMessage} disabled={pending} />
        </div>
      </div>
    </div>
  );
}
