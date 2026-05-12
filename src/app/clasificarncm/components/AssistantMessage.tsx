"use client";

import { SimpleMarkdown } from "./SimpleMarkdown";

export function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="flex min-w-0 w-full gap-3">
      <div className="mt-[5px] w-[2px] shrink-0 self-stretch rounded-full bg-gradient-to-b from-[#18C3D6]/50 via-[#18C3D6]/20 to-transparent" />
      <div className="min-w-0 flex-1 text-[15px] leading-relaxed text-slate-200 sm:text-[14px]">
        <SimpleMarkdown text={content} />
      </div>
    </div>
  );
}
