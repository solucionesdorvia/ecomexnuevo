"use client";

import { SimpleMarkdown } from "./SimpleMarkdown";

export function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[min(100%,620px)] rounded-2xl rounded-bl-md border border-white/[0.06] bg-[#0f172a]/95 px-4 py-3 text-[14px] leading-relaxed text-slate-300 shadow-lg shadow-black/25 backdrop-blur-sm">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#3b82f6]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Analista NCM
          </span>
        </div>
        <SimpleMarkdown text={content} />
      </div>
    </div>
  );
}
