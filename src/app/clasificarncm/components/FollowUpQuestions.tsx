"use client";

import { HelpCircle } from "lucide-react";

export function FollowUpQuestions({
  questions,
  context,
}: {
  questions: string[];
  /** Por qué hay duda / qué dato falta (opcional). */
  context?: string;
}) {
  if (!questions.length) return null;
  return (
    <div className="rounded-2xl border border-[#3b82f6]/20 bg-[#3b82f6]/[0.06] px-3 py-3 sm:px-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#93c5fd]">
        <HelpCircle className="h-3.5 w-3.5 shrink-0 opacity-90" />
        Datos pendientes
      </div>
      {context ? (
        <p className="mt-2 break-words text-[12px] leading-relaxed text-slate-400">{context}</p>
      ) : null}
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[14px] leading-relaxed text-slate-200 sm:text-[13px]">
        {questions.map((q, i) => (
          <li key={i} className="break-words marker:text-[#3b82f6] [overflow-wrap:anywhere]">
            {q}
          </li>
        ))}
      </ol>
    </div>
  );
}
