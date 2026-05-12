"use client";

export function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[min(100%,560px)] rounded-xl bg-[#0f1e30] px-4 py-2.5 text-[14px] leading-relaxed text-slate-300 ring-1 ring-white/[0.07]">
        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{content}</p>
      </div>
    </div>
  );
}
