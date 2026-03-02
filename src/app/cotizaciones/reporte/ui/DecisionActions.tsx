"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

export function DecisionActions({
  quoteId,
  canValidate,
}: {
  quoteId: string;
  canValidate: boolean;
}) {
  const [busy, setBusy] = useState<"" | "send_expert" | "save_draft">("");
  const [msg, setMsg] = useState<string | null>(null);

  async function act(action: "send_expert" | "save_draft") {
    setBusy(action);
    setMsg(null);
    try {
      const res = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}/decision`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; quote?: { stage: string } };
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo actualizar.");
      setMsg(action === "send_expert" ? "Enviado a experto para validación." : "Draft guardado.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error en la acción.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="button button-primary"
          disabled={busy !== ""}
          onClick={() => void act("save_draft")}
        >
          <Icon name="save" size={16} />
          {busy === "save_draft" ? "Guardando..." : "Guardar draft"}
        </button>
        <button
          type="button"
          className="button button-ghost"
          disabled={busy !== "" || !canValidate}
          onClick={() => void act("send_expert")}
          title={!canValidate ? "Tu rol no puede validar esta acción." : undefined}
        >
          <Icon name="support_agent" size={16} />
          {busy === "send_expert" ? "Enviando..." : "Enviar a experto"}
        </button>
      </div>
      {msg ? <div className="text-xs text-muted">{msg}</div> : null}
    </div>
  );
}

