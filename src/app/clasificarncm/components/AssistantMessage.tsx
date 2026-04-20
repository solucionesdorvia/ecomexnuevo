"use client";

import { Sparkles } from "lucide-react";
import { SimpleMarkdown } from "./SimpleMarkdown";

export function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="flex min-w-0 justify-start gap-3 pl-0.5">
      <div
        className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#111827]/90 shadow-inner shadow-black/40"
        aria-hidden
      >
        <Sparkles className="h-4 w-4 text-[#38bdf8]" strokeWidth={1.75} />
      </div>
      <div className="w-full max-w-[min(100%,620px)] rounded-2xl rounded-tl-md border border-white/[0.08] bg-[#0c1220]/95 px-4 py-3.5 text-[15px] leading-relaxed text-slate-300 shadow-[0_16px_48px_-20px_rgba(0,0,0,0.75)] backdrop-blur-md sm:text-[14px]">
        <div className="mb-2.5 flex items-center gap-2 border-b border-white/[0.05] pb-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Analista NCM
          </span>
          <span className="h-1 w-1 rounded-full bg-slate-600" aria-hidden />
          <span className="text-[10px] font-medium text-slate-600">E-COMEX</span>
        </div>
        <div className="min-w-0 break-words text-slate-300/95">
          <SimpleMarkdown text={content} />
        </div>
      </div>
    </div>
  );
}
