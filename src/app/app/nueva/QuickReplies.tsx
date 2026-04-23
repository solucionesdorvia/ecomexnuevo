"use client";

/**
 * Chips tocables que se muestran abajo de la última pregunta del analista.
 * Infiere opciones rápidas según el tipo de pregunta:
 *  - Origen (países típicos)
 *  - Cantidad (1, 5, 10)
 *  - Uso (personal, venta)
 *
 * Si no matchea ninguna categoría, no muestra nada (el usuario escribe en el
 * input como de costumbre).
 */
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
    <div className="mx-auto flex max-w-[720px] flex-wrap gap-1.5 px-3 pb-2 sm:px-6">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          disabled={disabled}
          onClick={() => onPick(opt)}
          className="rounded-full border border-white/[0.08] bg-[#0f172a]/80 px-3 py-1.5 text-[12px] font-medium text-slate-300 transition-all hover:-translate-y-0.5 hover:border-[#60a5fa]/30 hover:bg-[#60a5fa]/[0.08] hover:text-white active:translate-y-0 disabled:pointer-events-none disabled:opacity-40"
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function pickOptions(t: string): string[] {
  const askOrigin =
    /(?:pa[ií]s|origen|de d[oó]nde|lo tra[eé]s|desde d[oó]nde)/.test(t);
  if (askOrigin) {
    return ["China", "Estados Unidos", "Brasil", "España", "Italia", "Otro"];
  }

  const askQuantity = /(?:cu[aá]nt\w*s? vas|cuantas unidades|cantidad)/.test(t);
  if (askQuantity) {
    return ["1 unidad", "5", "10", "50", "100", "+100"];
  }

  const askUse = /(?:(?:para )?(?:vos|ti|uso personal)|vender|reventa|negocio)/.test(t);
  if (askUse) {
    return ["Uso personal", "Para vender", "Para mi empresa"];
  }

  const askPrice = /(?:precio|cu[aá]nto (?:te )?sale|cu[aá]nto cuesta|por unidad|usd)/.test(t);
  if (askPrice && /(?:cu[aá]nto|precio)/.test(t)) {
    return []; // precio es numérico, no tiene sentido forzar chips
  }

  return [];
}
