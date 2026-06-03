"use client";

import { useCallback, useRef, useState } from "react";
import type { CaseSnapshot, CaseState, ChatMessage } from "@/lib/clasificar-ncm/types";
import { initialCaseState } from "@/lib/clasificar-ncm/types";

function stripMessages(s: CaseState): CaseSnapshot {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { messages: _, ...rest } = s;
  return rest;
}

export function useClasificarChat(opts?: { credentials?: RequestCredentials }) {
  const credentials = opts?.credentials ?? "same-origin";
  const [caseState, setCaseState] = useState<CaseState>(initialCaseState);
  const [pending, setPending] = useState(false);
  const stateRef = useRef(caseState);
  const pendingRef = useRef(false);
  stateRef.current = caseState;

  const sendMessage = useCallback(async (text: string, files?: File[]) => {
    const t = text.trim();
    const hasFiles = Array.isArray(files) && files.length > 0;
    if (!t && !hasFiles) return;
    if (pendingRef.current) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: t || "(archivos adjuntos)",
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
      let res: Response;

      if (hasFiles) {
        // Multipart: send files + JSON body
        const form = new FormData();
        form.append(
          "json",
          JSON.stringify({ messages: nextMessages, snapshot })
        );
        for (const f of files!) {
          form.append("invoice", f);
        }
        res = await fetch("/api/clasificar-ncm/chat", {
          method: "POST",
          credentials,
          body: form,
        });
      } else {
        res = await fetch("/api/clasificar-ncm/chat", {
          method: "POST",
          credentials,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: nextMessages, snapshot }),
        });
      }

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
  }, [credentials]);

  const reset = useCallback(() => {
    pendingRef.current = false;
    setPending(false);
    setCaseState(initialCaseState());
  }, []);

  return { caseState, sendMessage, pending, reset };
}
