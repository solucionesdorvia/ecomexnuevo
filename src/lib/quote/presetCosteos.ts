/**
 * Costeos "preset" para productos de ejemplo (solo demostración).
 *
 * Cuando el producto cotizado coincide con un preset, el PDF descargable
 * (quoteHtml) renderiza ESTE desglose detallado en lugar del calculado por el
 * motor. No afecta el cálculo del resto de los productos ni la vista en pantalla.
 *
 * Caso actual: Alfa Romeo Giulia con el costeo provisto por Forward (comercio
 * exterior), adaptado a la plantilla E-Comex.
 */

export type CosteoLineClass =
  | "main"
  | "sub"
  | "sub iva-highlight"
  | "total"
  | "iva-total"
  | "grand-total";

export type CosteoLine = { label: string; value: string; cls: CosteoLineClass };

export type PresetCosteo = {
  rubro: string;
  totalUsd: number;
  lines: CosteoLine[];
};

const ALFA_ROMEO_GIULIA: PresetCosteo = {
  rubro: "Automotriz",
  totalUsd: 74401.83,
  lines: [
    { label: "FOB*:", value: "USD 31.000,00", cls: "main" },
    { label: "Flete marítimo internacional:", value: "USD 2.500,00", cls: "main" },
    { label: "Seguro internacional:", value: "USD 380,00", cls: "main" },
    { label: "Tributos aduaneros a pagar:", value: "USD 23.522,72", cls: "main" },
    { label: "Derechos de importación (35%):", value: "USD 11.858,00", cls: "sub" },
    { label: "Tasa de Estadística (3%):", value: "USD 1.016,40", cls: "sub" },
    { label: "I.V.A. (21%):", value: "USD 9.960,72", cls: "sub iva-highlight" },
    { label: "Comprobación de destino (2%):", value: "USD 677,60", cls: "sub" },
    { label: "Guarda digital:", value: "USD 10,00", cls: "sub" },
    { label: "Flete internacional (destino):", value: "USD 3.500,00", cls: "main" },
    { label: "Gastos de exportación en origen:", value: "USD 850,00", cls: "main" },
    { label: "Gastos de agencia:", value: "USD 790,00", cls: "main" },
    { label: "Seguro puerta a puerta:", value: "USD 189,73", cls: "main" },
    { label: "Honorarios asesoría y gestión aduanera:", value: "USD 1.500,00", cls: "main" },
    { label: "Honorarios AVAC y CIVAC:", value: "USD 1.500,00", cls: "main" },
    { label: "Terminal portuaria:", value: "USD 1.100,00", cls: "main" },
    { label: "Gastos operativos:", value: "USD 500,00", cls: "main" },
    { label: "Fletes internos:", value: "USD 250,00", cls: "main" },
    { label: "Traslado y depósito fiscal:", value: "USD 1.100,00", cls: "main" },
    { label: "Almacenamiento y descarga:", value: "USD 550,00", cls: "main" },
    { label: "DNRPA:", value: "USD 350,00", cls: "main" },
    { label: "Gastos administrativos:", value: "USD 146,16", cls: "main" },
    { label: "IVA sobre gastos:", value: "USD 7.553,23", cls: "main" },
    { label: "TOTAL A PAGAR:", value: "USD 74.401,83", cls: "grand-total" },
  ],
};

const PRESETS: Array<{ match: RegExp; preset: PresetCosteo }> = [
  { match: /alfa\s*romeo\s*giulia|\bgiulia\b/i, preset: ALFA_ROMEO_GIULIA },
];

/** Devuelve el preset que coincide con el título/texto del producto, o null. */
export function getPresetCosteo(...candidates: Array<string | null | undefined>): PresetCosteo | null {
  const hay = candidates.map((c) => String(c ?? "")).join(" \n ");
  for (const { match, preset } of PRESETS) {
    if (match.test(hay)) return preset;
  }
  return null;
}
