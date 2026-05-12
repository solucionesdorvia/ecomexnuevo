"use client";

export function QuickReplies({
  lastAssistantText,
  disabled,
  onPick,
}: {
  lastAssistantText: string;
  disabled?: boolean;
  onPick: (value: string) => void;
}) {
  const text = lastAssistantText.toLowerCase();
  const options = pickOptions(text);
  if (options.length === 0) return null;

  return (
    <div className="mx-auto flex max-w-[720px] flex-wrap gap-1.5 px-3 pb-2 pt-1 sm:px-6">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          disabled={disabled}
          onClick={() => onPick(opt)}
          className="rounded-lg border border-white/[0.08] bg-[#0a1422] px-3 py-1.5 text-[12px] font-medium text-slate-400 transition hover:border-white/[0.15] hover:bg-[#0f1e30] hover:text-slate-200 disabled:pointer-events-none disabled:opacity-40"
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function pickOptions(t: string): string[] {
  if (/(?:pa[ií]s|origen|de d[oó]nde|lo tra[eé]s|desde d[oó]nde)/.test(t)) {
    return ["China", "Estados Unidos", "Brasil", "España", "Italia", "Otro"];
  }
  if (/(?:cu[aá]nt\w*s? vas|cuantas unidades|cantidad)/.test(t)) {
    return ["1 unidad", "5", "10", "50", "100", "+100"];
  }
  if (/(?:(?:para )?(?:vos|ti|uso personal)|vender|reventa|negocio)/.test(t)) {
    return ["Uso personal", "Para vender", "Para mi empresa"];
  }
  return [];
}
