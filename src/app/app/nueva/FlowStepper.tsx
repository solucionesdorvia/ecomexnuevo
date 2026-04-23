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
  { key: "product", label: "Producto" },
  { key: "data", label: "Precio y origen" },
  { key: "analysis", label: "Análisis" },
  { key: "budget", label: "Presupuesto" },
  { key: "operation", label: "Operación" },
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
      className="relative shrink-0 border-b border-white/[0.05] bg-[#030712]/60 px-3 py-3 backdrop-blur sm:px-6"
    >
      <ol className="mx-auto flex max-w-[720px] items-center gap-1.5 sm:gap-2">
        {STEPS.map((step, i) => {
          const isDone = done[step.key];
          const isActive = i === currIdx && !isDone;
          const isFuture = i > currIdx && !isDone;
          return (
            <li
              key={step.key}
              className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2"
              aria-current={isActive ? "step" : undefined}
            >
              <span
                className={[
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-all duration-300 sm:h-7 sm:w-7 sm:text-[11px]",
                  isDone
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                    : isActive
                      ? "border-[#60a5fa]/50 bg-[#3b82f6]/15 text-[#93c5fd] shadow-[0_0_12px_rgba(59,130,246,0.35)]"
                      : "border-white/[0.08] bg-white/[0.02] text-slate-600",
                ].join(" ")}
              >
                {isDone ? (
                  <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={3} />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={[
                  "min-w-0 truncate text-[11px] font-medium transition-colors sm:text-[12px]",
                  isDone
                    ? "text-emerald-300/90"
                    : isActive
                      ? "text-white"
                      : isFuture
                        ? "text-slate-600"
                        : "text-slate-500",
                ].join(" ")}
              >
                {step.label}
              </span>
              {i < STEPS.length - 1 ? (
                <span
                  className={[
                    "h-px flex-1 transition-colors",
                    isDone ? "bg-emerald-500/30" : "bg-white/[0.06]",
                  ].join(" ")}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
