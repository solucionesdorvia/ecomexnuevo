"use client";

import { useState } from "react";
import { SendHorizontal } from "lucide-react";

export function ChatInput({
  onSend,
  disabled,
  placeholder = "Describí el producto o respondé al analista…",
}: {
  onSend: (text: string) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");

  async function submit() {
    const t = value.trim();
    if (!t || disabled) return;
    setValue("");
    await onSend(t);
  }

  return (
    <div className="border-t border-white/[0.06] bg-[#070b14]/95 px-3 py-3 backdrop-blur-md sm:px-5">
      <div className="mx-auto flex max-w-[720px] items-end gap-2 rounded-2xl border border-white/[0.08] bg-[#0f172a]/90 p-1.5 pl-3 shadow-inner shadow-black/40 focus-within:border-[#3b82f6]/35">
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
          className="max-h-36 min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[14px] leading-relaxed text-slate-100 outline-none placeholder:text-slate-600 disabled:opacity-40"
        />
        <button
          type="button"
          disabled={disabled || !value.trim()}
          onClick={submit}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2563eb] text-white shadow-lg shadow-[#2563eb]/20 transition hover:bg-[#1d4ed8] disabled:opacity-25"
          aria-label="Enviar"
        >
          <SendHorizontal className="h-5 w-5" />
        </button>
      </div>
      <p className="mx-auto mt-2 max-w-[720px] text-center text-[10px] text-slate-600">
        Enter envía · Shift+Enter nueva línea
      </p>
    </div>
  );
}
