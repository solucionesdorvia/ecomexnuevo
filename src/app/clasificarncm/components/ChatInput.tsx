"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { SendHorizontal } from "lucide-react";

export function ChatInput({
  onSend,
  disabled,
  placeholder = "Escribí acá tu consulta…",
  leading,
  extraAboveField,
  /** Si hay adjuntos (ej. factura), permite enviar sin texto. */
  canSubmitEmpty = false,
  helperText,
  messagePrefill,
}: {
  onSend: (text: string) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  leading?: ReactNode;
  extraAboveField?: ReactNode;
  canSubmitEmpty?: boolean;
  /** Reemplaza la línea de ayuda bajo el campo (Enter / Shift+Enter). */
  helperText?: ReactNode;
  /** Texto inicial (ej. llegada desde clasificador con ?ncm=). Solo se aplica una vez. */
  messagePrefill?: string;
}) {
  const [value, setValue] = useState(() => messagePrefill ?? "");

  async function submit() {
    const t = value.trim();
    if (disabled) return;
    if (!t && !canSubmitEmpty) return;
    setValue("");
    await onSend(t);
  }

  const canSend = canSubmitEmpty || !!value.trim();

  return (
    <div className="border-t border-white/[0.07] bg-gradient-to-t from-[#030712] via-[#070b14]/98 to-[#070b14]/88 px-3 pb-[max(0.85rem,env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur-xl sm:px-5">
      {extraAboveField ? (
        <div className="mx-auto mb-3 max-w-[min(100%,720px)]">{extraAboveField}</div>
      ) : null}
      <div className="mx-auto max-w-[min(100%,720px)] rounded-2xl border border-white/[0.09] bg-[#0b1220]/95 p-1.5 shadow-[0_-8px_40px_-18px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.04)] focus-within:border-[#38bdf8]/25 focus-within:shadow-[0_0_0_1px_rgba(56,189,248,0.12),0_-8px_40px_-18px_rgba(0,0,0,0.85)]">
        <div className="flex items-end gap-2 pl-1 sm:pl-1.5">
          {leading ? (
            <div className="flex shrink-0 items-center self-stretch pb-1 pt-0.5">{leading}</div>
          ) : null}
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            disabled={disabled}
            placeholder={placeholder}
            enterKeyHint="send"
            autoComplete="off"
            className="max-h-36 min-h-[52px] min-w-0 flex-1 resize-none bg-transparent py-3 text-[16px] leading-relaxed text-slate-100 outline-none placeholder:text-slate-500 disabled:opacity-40 sm:min-h-[48px] sm:py-2.5 sm:text-[15px]"
          />
          <button
            type="button"
            disabled={disabled || !canSend}
            onClick={submit}
            className="mb-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#18C3D6] text-[#030d18] shadow-lg shadow-[#18C3D6]/20 transition hover:bg-[#0ea5b9] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-25 sm:h-11 sm:w-11"
            aria-label="Enviar mensaje"
          >
            <SendHorizontal className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      </div>
      {helperText != null ? (
        <div className="mx-auto mt-2 max-w-[min(100%,720px)] px-1 text-center text-[10px] leading-snug text-slate-600">
          {helperText}
        </div>
      ) : null}
    </div>
  );
}
