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
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "Error al enviar.");
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
        {initialComments.length === 0 ? (
          <li className="text-[13px] text-[#555c6b]">Sin mensajes aún.</li>
        ) : (
          initialComments.map((c) => (
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
          rows={3}
          placeholder="Escribí un comentario…"
          className="w-full rounded-lg border border-white/[0.08] bg-[#07111A] px-3 py-2 text-[13px] text-white outline-none placeholder:text-[#555c6b]"
        />
        {error ? <p className="text-[11px] text-rose-400">{error}</p> : null}
        <button
          type="submit"
          disabled={pending || !message.trim()}
          className="rounded-lg bg-[#2b59ff] px-4 py-2 text-[12px] font-medium text-white disabled:opacity-40"
        >
          {pending ? "Enviando…" : "Enviar comentario"}
        </button>
      </form>
    </div>
  );
}
