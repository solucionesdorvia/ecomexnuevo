"use client";

export function TypingIndicator() {
  return (
    <div className="flex min-w-0 justify-start gap-3 pl-0.5" aria-busy="true" aria-label="El analista está escribiendo">
      <div className="mt-1 h-9 w-9 shrink-0 rounded-xl border border-white/[0.06] bg-[#111827]/60 opacity-60" aria-hidden />
      <div className="flex items-center gap-3 rounded-2xl rounded-tl-md border border-white/[0.07] bg-[#0c1220]/90 px-4 py-3 shadow-lg shadow-black/30">
        <div className="flex items-center gap-1">
          <span className="chat-typing-dot h-2 w-2 rounded-full bg-[#38bdf8]" />
          <span className="chat-typing-dot chat-typing-dot-delay-1 h-2 w-2 rounded-full bg-[#38bdf8]" />
          <span className="chat-typing-dot chat-typing-dot-delay-2 h-2 w-2 rounded-full bg-[#38bdf8]" />
        </div>
        <span className="text-[12px] font-medium text-slate-500">Analizando…</span>
      </div>
    </div>
  );
}
