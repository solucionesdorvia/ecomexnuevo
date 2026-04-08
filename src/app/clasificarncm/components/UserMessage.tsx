"use client";

export function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[min(100%,560px)] rounded-2xl rounded-br-md border border-white/[0.08] bg-[#1e3a5f]/90 px-3 py-3 text-[15px] leading-relaxed text-slate-100 shadow-lg shadow-black/20 sm:px-4 sm:text-[14px]">
        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{content}</p>
      </div>
    </div>
  );
}
