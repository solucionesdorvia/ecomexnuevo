/**
 * Orquestador de relleno de peso/dimensiones (Fase 0.c).
 *
 * Cuando un producto no trae peso, intenta completarlo en este orden:
 *   1. Búsqueda web de la ficha técnica (marca/modelo)  → src/lib/ai/productSpecsFinder
 *   2. Estimación por IA (conocimiento del modelo)        → src/lib/ai/productWeightEstimator
 *   3. (si nada da) lo deja sin setear → el motor de cotización cae al
 *      estimado por NCM (estimateUnitDimensions en freightRates).
 *
 * Mutá el producto in-place (igual que el auto-fill previo) y devuelve metadata
 * de qué método se usó, para trazabilidad/assumptions.
 */

import { fetchProductSpecsFromWeb, type ProductDimensionsCm } from "@/lib/ai/productSpecsFinder";
import { estimateProductWeight } from "@/lib/ai/productWeightEstimator";

type ProductLike = Record<string, unknown>;

// Confianza mínima para aceptar el dato sin preguntarle al usuario.
const WEB_MIN_CONFIDENCE = 0.5; // la web suele ser más precisa que el bucket por NCM
const AI_ESTIMATE_MIN_CONFIDENCE = 0.7;

export type EnsureSpecsResult = {
  filled: boolean;
  method: "web" | "ai_estimate" | "none";
  weightKgPerUnit?: number;
  dimensionsCm?: ProductDimensionsCm | null;
  source?: string | null;
  sourceUrl?: string | null;
};

function setRaw(product: ProductLike, patch: ProductLike): void {
  product.raw = { ...((product.raw as ProductLike) ?? {}), ...patch };
}

/**
 * Completa peso (y dimensiones cuando se hallan) si faltan.
 * @param opts.useWebSearch  habilita el paso de búsqueda web (lo usa el cotizador,
 *   donde el spinner "Generando presupuesto…" cubre la latencia).
 */
export async function ensureProductSpecs(
  product: ProductLike,
  opts?: { useWebSearch?: boolean }
): Promise<EnsureSpecsResult> {
  // Ya tiene peso (del scraper o del usuario): no lo pisamos.
  if (typeof product.weightKgPerUnit === "number" && (product.weightKgPerUnit as number) > 0) {
    return { filled: false, method: "none" };
  }

  const title = String(product.title ?? "").trim();
  if (!title) return { filled: false, method: "none" };

  const ncm = typeof product.ncm === "string" ? (product.ncm as string) : undefined;

  // 1) Búsqueda web de la ficha técnica.
  if (opts?.useWebSearch) {
    const specs = await fetchProductSpecsFromWeb(title, { ncm }).catch(() => null);
    if (specs && specs.weightKgPerUnit && specs.confidence >= WEB_MIN_CONFIDENCE) {
      product.weightKgPerUnit = specs.weightKgPerUnit;
      setRaw(product, {
        weightSource: "web",
        weightConfidence: specs.confidence,
        specsSource: specs.source,
        specsSourceUrl: specs.sourceUrl,
        ...(specs.dimensionsCm ? { dimensionsCm: specs.dimensionsCm } : {}),
      });
      return {
        filled: true,
        method: "web",
        weightKgPerUnit: specs.weightKgPerUnit,
        dimensionsCm: specs.dimensionsCm,
        source: specs.source,
        sourceUrl: specs.sourceUrl,
      };
    }
  }

  // 2) Estimación por IA (conocimiento del modelo).
  const estimate = await estimateProductWeight(title, ncm).catch(() => null);
  if (estimate && estimate.confidence >= AI_ESTIMATE_MIN_CONFIDENCE) {
    product.weightKgPerUnit = estimate.weightKgPerUnit;
    setRaw(product, {
      weightSource: "ai_estimate",
      weightConfidence: estimate.confidence,
      specsSource: estimate.source,
    });
    return {
      filled: true,
      method: "ai_estimate",
      weightKgPerUnit: estimate.weightKgPerUnit,
      source: estimate.source,
    };
  }

  // 3) Sin dato confiable: el motor caerá al estimado por NCM.
  return { filled: false, method: "none" };
}
