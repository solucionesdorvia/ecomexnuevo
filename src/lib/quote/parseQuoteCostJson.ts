/** Extrae cards y breakdown desde quoteJson (misma lógica que la vista de operación). */
export function parseQuoteCostJson(quoteJson: unknown): {
  cards: Array<{ label: string; value: string; detail?: string; highlight?: boolean }>;
  breakdown: Record<string, unknown> | null;
} {
  const qj: Record<string, unknown> = (quoteJson as Record<string, unknown>) ?? {};
  const cards = (Array.isArray(qj.cards) ? qj.cards : []) as Array<{
    label: string;
    value: string;
    detail?: string;
    highlight?: boolean;
  }>;
  const breakdown =
    qj.breakdown && typeof qj.breakdown === "object" ? (qj.breakdown as Record<string, unknown>) : null;
  return { cards, breakdown };
}
