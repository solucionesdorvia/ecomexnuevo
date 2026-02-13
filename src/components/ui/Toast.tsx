"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { cn } from "./cn";

type ToastTone = "muted" | "success" | "gold" | "danger";
type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastApi = {
  push: (t: Omit<ToastItem, "id">) => void;
};

const ToastCtx = createContext<ToastApi | null>(null);

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((t: Omit<ToastItem, "id">) => {
    const id = uid();
    setItems((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  const api = useMemo(() => ({ push }), [push]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <ToastViewport items={items} onClose={(id) => setItems((p) => p.filter((x) => x.id !== id))} />
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function ToastViewport({
  items,
  onClose,
}: {
  items: ToastItem[];
  onClose: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[360px] max-w-[90vw] flex-col gap-3">
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto rounded-xl border bg-background-deeper/90 p-4 shadow-2xl backdrop-blur-xl",
            t.tone === "success"
              ? "border-emerald-400/20"
              : t.tone === "gold"
                ? "border-gold/30"
                : t.tone === "danger"
                  ? "border-red-400/30"
                  : "border-white/10"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-muted">
                {t.title}
              </div>
              {t.description ? (
                <div className="mt-2 text-sm leading-relaxed text-white/85">
                  {t.description}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onClose(t.id)}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-muted hover:bg-white/10"
              aria-label="Cerrar"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

