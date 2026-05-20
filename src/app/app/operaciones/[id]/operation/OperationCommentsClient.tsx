"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Comment = {
  id: string;
  createdAt: Date | string;
  authorRole: string;
  authorLabel: string | null;
  message: string;
};

export function OperationCommentsClient({ quoteId, initialComments }: { quoteId: string; initialComments: Comment[] }) {
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = message.trim();
    if (!t) return;
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: t }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; comment?: Comment };
      if (!res.ok || !json.ok) throw new Error(json.error || "Error al enviar.");
      // Optimistic: add to local state immediately, then refresh in background
      const newComment: Comment = json.comment ?? {
        id: `temp-${Date.now()}`,
        createdAt: new Date().toISOString(),
        authorRole: "user",
        authorLabel: "Vos",
        message: t,
      };
      setComments((prev) => [...prev, newComment]);
      setMessage("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setPending(false);
    }
  }

  function fmtDate(d: Date | string) {
    const x = typeof d === "string" ? new Date(d) : d;
    return x.toLocaleString("es-AR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Comentarios (cotización)</p>
      <ul className="mt-3 max-h-[280px] space-y-3 overflow-y-auto rounded-lg border border-white/[0.04] bg-[#0B1622] p-3">
        {comments.length === 0 ? (
          <li className="text-[13px] text-[#555c6b]">Sin mensajes aún.</li>
        ) : (
          comments.map((c) => (
            <li key={c.id} className="border-b border-white/[0.04] pb-3 last:border-0 last:pb-0">
              <p className="text-[10px] text-[#555c6b]">
                {fmtDate(c.createdAt)} · {c.authorLabel ?? c.authorRole}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-[#b0b8c9]">{c.message}</p>
            </li>
          ))
        )}
      </ul>
      <form onSubmit={(e) => void submit(e)} className="mt-3 space-y-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              if (!pending && message.trim()) void submit(e as unknown as React.FormEvent);
            }
          }}
          rows={3}
          maxLength={2000}
          placeholder="Escribí un comentario… (Ctrl+Enter para enviar)"
          className="w-full rounded-lg border border-white/[0.08] bg-[#07111A] px-3 py-2 text-[13px] text-white outline-none placeholder:text-[#555c6b]"
          aria-label="Escribí un comentario"
        />
        <div className="flex items-center justify-between gap-3">
          {error ? <p className="text-[11px] text-rose-400">{error}</p> : <span />}
          <p className={`shrink-0 text-[10px] ${message.length > 1800 ? "text-amber-400" : "text-[#555c6b]"}`}>
            {message.length}/2000
          </p>
        </div>
        <button
          type="submit"
          disabled={pending || !message.trim()}
          className="rounded-lg bg-[#18C3D6] px-4 py-2 text-[12px] font-medium text-[#030d18] disabled:opacity-40"
        >
          {pending ? "Enviando…" : "Enviar comentario"}
        </button>
      </form>
    </div>
  );
}
