"use client";

import { Check } from "lucide-react";

type StepKey = "product" | "data" | "analysis" | "budget" | "operation";

type FlowStepperProps = {
  currentStep: StepKey;
  hasProduct: boolean;
  hasCommercialData: boolean;
  hasAnalysis: boolean;
  hasBudget: boolean;
};

const STEPS: Array<{ key: StepKey; label: string }> = [
  { key: "product",  label: "Producto" },
  { key: "data",     label: "Precio y origen" },
  { key: "analysis", label: "Análisis" },
  { key: "budget",   label: "Presupuesto" },
  { key: "operation",label: "Operación" },
];

function stepIndex(k: StepKey) {
  return STEPS.findIndex((s) => s.key === k);
}

export function FlowStepper({
  currentStep,
  hasProduct,
  hasCommercialData,
  hasAnalysis,
  hasBudget,
}: FlowStepperProps) {
  const done: Record<StepKey, boolean> = {
    product: hasProduct,
    data: hasCommercialData,
    analysis: hasAnalysis,
    budget: hasBudget,
    operation: false,
  };
  const currIdx = stepIndex(currentStep);

  return (
    <nav
      aria-label="Progreso de la operación"
      className="relative shrink-0 border-b border-white/[0.05] bg-[#030712]/70 px-4 py-2.5 backdrop-blur sm:px-6"
    >
      <ol className="mx-auto flex max-w-[720px] items-center">
        {STEPS.map((step, i) => {
          const isDone = done[step.key];
          const isActive = i === currIdx && !isDone;
          const isFuture = i > currIdx && !isDone;

          return (
            <li
              key={step.key}
              className="flex min-w-0 flex-1 items-center"
              aria-current={isActive ? "step" : undefined}
            >
              {/* Circle */}
              <div className="relative flex shrink-0 items-center justify-center">
                {isActive && (
                  <span className="absolute h-5 w-5 animate-ping rounded-full bg-[#18C3D6]/20 sm:h-6 sm:w-6" />
                )}
                <span
                  className={[
                    "relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold transition-all duration-500 sm:h-6 sm:w-6 sm:text-[10px]",
                    isDone
                      ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                      : isActive
                        ? "border-[#18C3D6]/60 bg-[#18C3D6]/15 text-[#18C3D6]"
                        : "border-white/[0.07] bg-white/[0.02] text-slate-700",
                  ].join(" ")}
                >
                  {isDone ? (
                    <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={3} />
                  ) : (
                    i + 1
                  )}
                </span>
              </div>

              {/* Label — hidden on xs for future steps */}
              <span
                className={[
                  "ml-1.5 truncate text-[10px] font-medium transition-colors sm:text-[11px]",
                  isDone
                    ? "text-emerald-400/80"
                    : isActive
                      ? "text-white"
                      : isFuture
                        ? "hidden text-slate-700 sm:block"
                        : "text-slate-500",
                ].join(" ")}
              >
                {step.label}
              </span>

              {/* Connector */}
              {i < STEPS.length - 1 && (
                <span
                  className={[
                    "mx-2 h-px flex-1 rounded-full transition-all duration-700",
                    isDone ? "bg-emerald-500/35" : isActive ? "bg-[#18C3D6]/20" : "bg-white/[0.05]",
                  ].join(" ")}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
