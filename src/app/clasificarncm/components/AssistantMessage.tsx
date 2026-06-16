"use client";

import Image from "next/image";
import { SimpleMarkdown } from "./SimpleMarkdown";

export function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="msg-in-assistant flex min-w-0 w-full items-start gap-2.5">
      {/* E-COMEX brand marker */}
      <div className="mt-0.5 h-6 w-6 shrink-0 overflow-hidden rounded-md">
        <Image src="/favicon-ecomex.png" alt="E-COMEX" width={24} height={24} className="h-full w-full object-cover" />
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
