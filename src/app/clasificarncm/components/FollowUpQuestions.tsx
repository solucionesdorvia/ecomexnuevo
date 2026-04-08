"use client";

import { HelpCircle } from "lucide-react";

export function FollowUpQuestions({ questions }: { questions: string[] }) {
  if (!questions.length) return null;
  return (
    <div className="rounded-2xl border border-[#3b82f6]/20 bg-[#3b82f6]/[0.06] px-4 py-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#93c5fd]">
        <HelpCircle className="h-3.5 w-3.5 shrink-0 opacity-90" />
        Datos pendientes
      </div>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-slate-200">
        {questions.map((q, i) => (
          <li key={i} className="marker:text-[#3b82f6]">
            {q}
          </li>
        ))}
      </ol>
    </div>
  );
}
