"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type NotifRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
  operation: { id: string; quote: { productJson: unknown; userText: string } } | null;
};

const TYPE_LABEL: Record<string, string> = {
  STAGE_CHANGED: "Etapa",
  EVENT_ADDED: "Evento",
  DOCUMENT_ADDED: "Documento",
};

function fmtWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-AR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NotifRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetch("/api/app/notifications", { credentials: "include" });
      const json = (await res.json()) as {
        notifications?: NotifRow[];
        unreadCount?: number;
        error?: string;
      };
      if (!res.ok) return;
      setRows(json.notifications ?? []);
      setUnreadCount(typeof json.unreadCount === "number" ? json.unreadCount : 0);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function markAllRead() {
    try {
      const res = await fetch("/api/app/notifications/read", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) await load({ silent: true });
    } catch {
      /* ignore */
    }
  }

  function onToggle() {
    const next = !open;
    setOpen(next);
    if (next) void markAllRead();
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        data-testid="notifications-bell"
        onClick={onToggle}
        aria-expanded={open}
        className="relative rounded-lg border border-white/[0.04] p-2 text-[#4a5568] transition-colors hover:text-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unreadCount > 0 ? (
          <span
            data-testid="notifications-unread-badge"
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panelRef}
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(100vw-2rem,380px)] rounded-xl border border-white/[0.08] bg-[#0B1622] shadow-2xl shadow-black/50"
        >
          <div className="border-b border-white/[0.06] px-4 py-3">
            <p className="text-[12px] font-semibold text-white">Notificaciones</p>
            {loading ? <p className="mt-1 text-[11px] text-[#555c6b]">Cargando…</p> : null}
          </div>
          <div className="max-h-[min(70vh,420px)] overflow-y-auto">
            {rows.length === 0 && !loading ? (
              <p className="px-4 py-8 text-center text-[13px] text-[#555c6b]">No hay notificaciones nuevas.</p>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {rows.map((n) => {
                  const unread = !n.readAt;
                  const href = n.operation?.id ? `/app/operaciones/${n.operation.id}/operation` : "/app/operaciones";
                  return (
                    <li key={n.id}>
                      <Link
                        href={href}
                        onClick={() => setOpen(false)}
                        className={`block px-4 py-3 transition-colors hover:bg-white/[0.04] ${unread ? "bg-[#2b59ff]/[0.06]" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13px] font-medium leading-snug text-white">{n.title}</p>
                          <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-medium uppercase text-[#555c6b]">
                            {TYPE_LABEL[n.type] ?? n.type}
                          </span>
                        </div>
                        {n.body ? <p className="mt-1 line-clamp-3 text-[12px] text-[#b0b8c9]">{n.body}</p> : null}
                        <p className="mt-2 text-[10px] text-[#555c6b]">{fmtWhen(n.createdAt)}</p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
