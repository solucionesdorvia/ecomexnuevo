"use client";

export function FollowUpQuestions({
  questions,
  context,
}: {
  questions: string[];
  context?: string;
}) {
  if (!questions.length) return null;
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0a1422]/70 px-4 py-3">
      {context && (
        <p className="mb-2 text-[12px] leading-relaxed text-slate-500">{context}</p>
      )}
      <ol className="list-none space-y-2">
        {questions.map((q, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-slate-300">
            <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#18C3D6]/50" aria-hidden />
            {q}
          </li>
        ))}
      </ol>
    </div>
  );
}
