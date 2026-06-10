/**
 * Motor de régimen de importación (Fase 2 — Paso 9 del documento funcional).
 *
 * Determina si una operación puede tramitarse por **Courier** (régimen de envíos
 * de entrega rápida) o debe ir por **importación general**, según reglas públicas:
 *   - FOB total ≤ USD 3.000
 *   - peso total ≤ 50 kg
 *   - sin intervención de organismos (ANMAT/SENASA/etc. → fuerza General)
 *
 * IMPORTANTE: este módulo SOLO detecta y recomienda el régimen. NO ajusta los
 * números de impuestos del Courier — su tratamiento impositivo es un detalle
 * fiscal a confirmar con el contador (ver CONSULTAS_FISCALES.md), igual que la
 * recuperabilidad de la Fase 1. Hasta entonces el cálculo usa el tratamiento general.
 */

export type ImportRegimeCode = "courier" | "general";

export const COURIER_MAX_FOB_USD = 3000;
export const COURIER_MAX_WEIGHT_KG = 50;

export type RegimeAssessment = {
  code: ImportRegimeCode;
  /** Etiqueta legible del régimen recomendado. */
  label: string;
  /** ¿La operación es elegible para Courier? */
  courierEligible: boolean;
  /** Motivos por los que se recomienda (cuando es Courier). */
  reasons: string[];
  /** Motivos por los que NO entra en Courier (cuando es General). */
  blockers: string[];
  /** El peso usado fue estimado (no confirmado por el usuario/ficha técnica). */
  weightEstimated: boolean;
};

function kg(n: number): string {
  return `${Math.round(n * 10) / 10} kg`;
}

function usd(n: number): string {
  return `USD ${Math.round(n).toLocaleString("en-US")}`;
}

export function assessImportRegime(input: {
  /** FOB total de la operación en USD (usar el máximo del rango para ser conservador). */
  fobTotalUsd: number;
  /** Peso total estimado/real de la operación en kg. */
  totalWeightKg: number;
  /** Intervenciones de organismos detectadas por PCRAM (ANMAT, SENASA, …). */
  interventions?: string[];
  /** true si el peso no fue confirmado (se estimó por NCM). */
  weightEstimated?: boolean;
}): RegimeAssessment {
  const interventions = (input.interventions ?? []).map((s) => String(s).trim()).filter(Boolean);
  const weightEstimated = Boolean(input.weightEstimated);

  const blockers: string[] = [];
  if (input.fobTotalUsd > COURIER_MAX_FOB_USD) {
    blockers.push(`FOB total ${usd(input.fobTotalUsd)} supera el límite Courier (${usd(COURIER_MAX_FOB_USD)}).`);
  }
  if (input.totalWeightKg > COURIER_MAX_WEIGHT_KG) {
    blockers.push(`Peso total ${kg(input.totalWeightKg)} supera el límite Courier (${COURIER_MAX_WEIGHT_KG} kg).`);
  }
  if (interventions.length) {
    blockers.push(`Requiere intervención de ${interventions.join(", ")} — no habilitado por Courier.`);
  }

  if (blockers.length === 0) {
    return {
      code: "courier",
      label: "Courier (envíos de entrega rápida)",
      courierEligible: true,
      reasons: [
        `FOB total ${usd(input.fobTotalUsd)} ≤ ${usd(COURIER_MAX_FOB_USD)}.`,
        `Peso total ${kg(input.totalWeightKg)} ≤ ${COURIER_MAX_WEIGHT_KG} kg${weightEstimated ? " (estimado)" : ""}.`,
        "Sin intervenciones de organismos detectadas.",
      ],
      blockers: [],
      weightEstimated,
    };
  }

  return {
    code: "general",
    label: "Importación general",
    courierEligible: false,
    reasons: [],
    blockers,
    weightEstimated,
  };
}

/** Texto corto para la explicación del presupuesto. */
export function formatRegimeForExplanation(a: RegimeAssessment): string {
  if (a.code === "courier") {
    return `- **Régimen recomendado: Courier** (envíos de entrega rápida) — ${a.reasons.join(" ")} El despacho es simplificado; el tratamiento impositivo fino se confirma con tu situación fiscal.`;
  }
  return `- **Régimen recomendado: Importación general** — ${a.blockers.join(" ")}`;
}
