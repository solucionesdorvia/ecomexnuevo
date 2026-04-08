"use client";

import { SimpleMarkdown } from "./SimpleMarkdown";

export function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="flex min-w-0 justify-start">
      <div className="w-full max-w-[min(100%,620px)] rounded-2xl rounded-bl-md border border-white/[0.06] bg-[#0f172a]/95 px-3 py-3 text-[15px] leading-relaxed text-slate-300 shadow-lg shadow-black/25 backdrop-blur-sm sm:px-4 sm:text-[14px]">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#3b82f6]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Analista NCM
          </span>
        </div>
        <div className="min-w-0 break-words">
          <SimpleMarkdown text={content} />
        </div>
      </div>
    </div>
  );
}
