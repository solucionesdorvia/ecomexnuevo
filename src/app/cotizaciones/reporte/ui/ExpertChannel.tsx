"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";

type CommentRow = {
  id: string;
  createdAt: string;
  authorRole: string;
  authorLabel: string | null;
  message: string;
};

export function ExpertChannel({
  quoteId,
  canComment,
}: {
  quoteId: string;
  canComment: boolean;
}) {
  const [rows, setRows] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}/comments`, {
        method: "GET",
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean; comments?: CommentRow[]; error?: string };
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudieron cargar comentarios.");
      setRows(Array.isArray(json.comments) ? json.comments : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando comentarios.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId]);

  async function submit() {
    const value = message.trim();
    if (!value) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: value }),
      });
      const json = (await res.json()) as { ok?: boolean; comment?: CommentRow; error?: string };
      if (!res.ok || !json?.ok || !json.comment) throw new Error(json?.error || "No se pudo enviar.");
      const createdComment = json.comment;
      setRows((prev) => [...prev, createdComment]);
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error enviando mensaje.");
    } finally {
      setSending(false);
    }
  }

  const hasRows = useMemo(() => rows.length > 0, [rows]);

  return (
    <section className="panel-strong overflow-hidden rounded-2xl p-0">
      <div className="flex items-center justify-between border-b border-subtle bg-[var(--surface2)] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full border-2 border-primary bg-primary/10">
            <span className="material-symbols-outlined text-primary">support_agent</span>
          </div>
          <div>
            <div className="text-sm font-bold text-strong">Consultor Experto</div>
            <div className="text-[11px] text-emerald-400">Online · Specialist in Industrial Logistics</div>
          </div>
        </div>
        <Badge tone="muted" icon="chat_bubble">Comentarios</Badge>
      </div>

      {loading ? (
        <div className="p-5 text-xs text-muted">Cargando hilo...</div>
      ) : hasRows ? (
        <div className="max-h-[320px] space-y-4 overflow-y-auto px-5 py-4 pr-2">
          {rows.map((row) => (
            <article
              key={row.id}
              className={row.authorRole === "expert" ? "max-w-[85%]" : "ml-auto max-w-[85%]"}
            >
              <div className={row.authorRole === "expert" ? "" : "text-right"}>
                <span className="text-[11px] font-bold text-slate-400">
                  {row.authorRole === "expert" ? "CONSULTOR EXPERTO" : "YOU"} ·{" "}
                  {new Date(row.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div
                className={[
                  "mt-1 rounded-2xl border p-4 text-sm leading-relaxed shadow-xl",
                  row.authorRole === "expert"
                    ? "rounded-bl-none border-slate-700 bg-[#101D34] text-slate-200"
                    : "rounded-br-none border-primary/40 bg-primary text-[#030d18]",
                ].join(" ")}
              >
                {row.message}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="m-5 rounded-lg border border-dashed border-white/15 bg-white/5 p-3 text-xs text-white/70">
          Sin mensajes todavía. Usá este canal para validar dudas técnicas de la cotización.
        </div>
      )}

      {canComment ? (
        <div className="space-y-2 border-t border-subtle bg-[var(--surface2)] p-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="field field-textarea min-h-[84px]"
            placeholder="Escribí un comentario para experto/cliente..."
          />
          <button type="button" className="button button-primary" disabled={sending} onClick={() => void submit()}>
            <Icon name="arrow_forward" size={16} />
            {sending ? "Enviando..." : "Enviar comentario"}
          </button>
        </div>
      ) : (
        <div className="mt-3 text-xs text-muted">
          Tu rol actual no puede escribir comentarios en este canal.
        </div>
      )}

      {error ? <div className="mt-2 text-xs text-red-300">{error}</div> : null}
    </section>
  );
}

