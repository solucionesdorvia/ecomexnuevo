"use client";

import { SimpleMarkdown } from "./SimpleMarkdown";

export function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="msg-in-assistant flex min-w-0 w-full items-start gap-2.5">
      {/* E-COMEX brand marker */}
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#18C3D6]/20 bg-[#060f1a]">
        <img
          src="/brand/ecomex-logo.png"
          alt="E-COMEX"
          className="h-2 brightness-0 invert opacity-50"
          aria-hidden
        />
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
