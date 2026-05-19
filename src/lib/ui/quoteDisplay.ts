// Shared display helpers used across /app/page.tsx, /app/operaciones/page.tsx, and operation detail pages.
// Keep in sync with DB field shapes.

/** Format a USD number as "USD 1,234.56". Returns "—" for null/undefined. */
export function fmtUsd(n: number | null | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** Format a USD range as "USD 1,200 – USD 1,500". */
export function fmtUsdRange(min: number | null | undefined, max: number | null | undefined): string {
  if (typeof min !== "number" || typeof max !== "number") return "—";
  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  if (Math.abs(max - min) < 1) return fmt(min);
  return `${fmt(min)} – ${fmt(max)}`;
}

/** Format a Date as "15 may 2025 · 14:32" in es-AR locale. */
export function fmtActivity(d: Date): string {
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format a Date as "15 may 2025" (date only). */
export function fmtDate(d: Date): string {
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

type ProductJsonLike = { title?: string; name?: string; origin?: string; country?: string } | null | undefined;
type QuoteJsonLike = { assumptions?: { id?: string; label?: string; value?: string }[] } | null | undefined;

/**
 * Best-effort product label from stored JSON + userText fallback.
 * Format: "qty · ProductName de Origin" (max `max` chars).
 */
export function productLabel(
  productJson: unknown,
  quoteJson: unknown,
  userText: string,
  max = 72
): string {
  const pj = productJson as ProductJsonLike;
  const qj = quoteJson as QuoteJsonLike;
  const name = pj?.title ?? pj?.name ?? "";
  const assumptions = Array.isArray(qj?.assumptions) ? qj!.assumptions! : [];

  const findVal = (keywords: string[]) => {
    const hit = assumptions.find((a) =>
      keywords.some((k) => (a.id ?? "").toLowerCase().includes(k) || (a.label ?? "").toLowerCase().includes(k))
    );
    return hit?.value?.trim() ?? null;
  };

  const qty = findVal(["cantidad", "quantity", "units", "unidades"]);
  const origin = pj?.origin ?? pj?.country ?? findVal(["origen", "origin", "país", "pais", "country"]);

  if (name) {
    const parts: string[] = [];
    if (qty) parts.push(qty);
    parts.push(name);
    if (origin) parts.push(`de ${origin}`);
    return parts.join(" · ").slice(0, max);
  }

  if (userText?.trim()) return userText.trim().slice(0, max);
  return "—";
}
