"use client";

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-2" aria-hidden>
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#3b82f6]" style={{ animationDelay: "0ms" }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#3b82f6]" style={{ animationDelay: "120ms" }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#3b82f6]" style={{ animationDelay: "240ms" }} />
      <span className="ml-2 text-[11px] font-medium text-[#64748b]">Analizando…</span>
    </div>
  );
}
