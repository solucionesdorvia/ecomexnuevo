"use client";

import { SimpleMarkdown } from "./SimpleMarkdown";

function EcomexMark() {
  return (
    <svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden>
      <rect x="0" y="0"   width="12" height="1.8" rx="0.9" fill="#18C3D6" opacity="0.7" />
      <rect x="0" y="4.1" width="12" height="1.8" rx="0.9" fill="#18C3D6" opacity="0.7" />
      <rect x="0" y="8.2" width="12" height="1.8" rx="0.9" fill="#18C3D6" opacity="0.7" />
    </svg>
  );
}

export function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="msg-in-assistant flex min-w-0 w-full items-start gap-2.5">
      {/* E-COMEX brand marker */}
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#18C3D6]/20 bg-[#060f1a]">
        <EcomexMark />
      </div>
      {/* Accent + content */}
      <div className="flex min-w-0 flex-1 items-stretch gap-3">
        <div className="mt-[3px] w-[2px] shrink-0 self-stretch rounded-full bg-gradient-to-b from-[#18C3D6]/50 via-[#18C3D6]/15 to-transparent" />
        <div className="min-w-0 flex-1 text-[15px] leading-relaxed text-slate-200 sm:text-[14px]">
          <SimpleMarkdown text={content} />
        </div>
      </div>
    </div>
  );
}
