"use client";

export function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end pr-0.5">
      <div
        className="group relative max-w-[min(100%,560px)] rounded-2xl rounded-br-md border border-cyan-500/15 bg-gradient-to-br from-[#152a45]/95 to-[#0f1f35]/98 px-4 py-3 text-[15px] leading-relaxed text-slate-100 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.06)] sm:px-4 sm:text-[14px]"
      >
        <div
          className="pointer-events-none absolute bottom-3 left-0 top-3 w-0.5 rounded-full bg-gradient-to-b from-cyan-400/90 to-[#3b82f6]/80 opacity-90"
          aria-hidden
        />
        <p className="whitespace-pre-wrap break-words pl-2 [overflow-wrap:anywhere]">{content}</p>
      </div>
    </div>
  );
}
