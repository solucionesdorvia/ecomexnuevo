import { Check } from "lucide-react";
import { OPERATION_STAGE_LABEL_ES, OPERATION_STAGE_ORDER } from "./operationStageUi";

export function OperationPipeline({ currentStage }: { currentStage: string }) {
  const idx = OPERATION_STAGE_ORDER.indexOf(currentStage as (typeof OPERATION_STAGE_ORDER)[number]);
  const currentIdx = idx >= 0 ? idx : 0;

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-[640px] items-start justify-between gap-1 sm:min-w-0 sm:gap-2">
        {OPERATION_STAGE_ORDER.map((stage, i) => {
          const isPast = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isFuture = i > currentIdx;
          const label = OPERATION_STAGE_LABEL_ES[stage];

          return (
            <div key={stage} className="flex min-w-0 flex-1 flex-col items-center text-center">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold sm:h-10 sm:w-10 ${
                  isPast
                    ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-200"
                    : isCurrent
                      ? `border-[#2b59ff] bg-[#2b59ff]/20 text-white ring-2 ring-[#2b59ff]/30`
                      : "border-white/[0.08] bg-[#0B1622] text-[#555c6b]"
                }`}
              >
                {isPast ? <Check className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden /> : isCurrent ? "●" : i + 1}
              </div>
              <p
                className={`mt-2 max-w-[100px] text-[9px] font-medium leading-tight sm:max-w-none sm:text-[10px] ${
                  isCurrent ? "font-bold text-white" : isFuture ? "text-[#555c6b]" : "text-slate-400"
                }`}
              >
                {label}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-center">
        <span className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#b0b8c9]">
          Etapa actual:{" "}
          {OPERATION_STAGE_LABEL_ES[currentStage as keyof typeof OPERATION_STAGE_LABEL_ES] ?? currentStage}
        </span>
      </div>
    </div>
  );
}
