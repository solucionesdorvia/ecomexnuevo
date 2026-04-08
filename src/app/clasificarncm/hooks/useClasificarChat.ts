"use client";

import { useCallback, useRef, useState } from "react";
import type { CaseSnapshot, CaseState, ChatMessage } from "@/lib/clasificar-ncm/types";
import { initialCaseState } from "@/lib/clasificar-ncm/types";

function stripMessages(s: CaseState): CaseSnapshot {
  const { messages: _m, ...rest } = s;
  return rest;
}

export function useClasificarChat() {
  const [caseState, setCaseState] = useState<CaseState>(initialCaseState);
  const [pending, setPending] = useState(false);
  const stateRef = useRef(caseState);
  const pendingRef = useRef(false);
  stateRef.current = caseState;

  const sendMessage = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t || pendingRef.current) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: t,
      ts: Date.now(),
    };

    const prev = stateRef.current;
    const nextMessages = [...prev.messages, userMsg];

    pendingRef.current = true;
    setPending(true);
    setCaseState({
      ...prev,
      messages: nextMessages,
      status: "analyzing",
      errorMessage: undefined,
    });

    const snapshot = stripMessages(prev);

    try {
      const res = await fetch("/api/clasificar-ncm/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          snapshot,
        }),
      });

      const json = (await res.json()) as {
        assistantMessage?: string;
        snapshot?: CaseSnapshot;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(json.error || "Error del servidor");
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: json.assistantMessage ?? "",
        ts: Date.now(),
      };

      const snap = json.snapshot ?? stripMessages(prev);

      setCaseState({
        ...snap,
        messages: [...nextMessages, assistantMsg],
      });
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error de conexión";
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `**Error:** ${err}`,
        ts: Date.now(),
      };
      setCaseState((s) => ({
        ...s,
        status: "error",
        errorMessage: err,
        messages: [...nextMessages, assistantMsg],
      }));
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, []);

  const reset = useCallback(() => {
    pendingRef.current = false;
    setPending(false);
    setCaseState(initialCaseState());
  }, []);

  return { caseState, sendMessage, pending, reset };
}
