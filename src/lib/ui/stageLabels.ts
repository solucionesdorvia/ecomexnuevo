/** Human-readable labels for quote/operation stages. */
export const QUOTE_STAGE_LABELS: Record<string, string> = {
  quoted: "Cotizado",
  refined: "Refinado",
  decision_requested: "Decisión",
  lead_captured: "Lead",
  awaiting_product: "Sin producto",
  awaiting_price: "Sin precio",
  awaiting_quantity: "Sin cantidad",
};

export function quoteStageLabel(stage: string): string {
  return QUOTE_STAGE_LABELS[stage] ?? stage;
}
