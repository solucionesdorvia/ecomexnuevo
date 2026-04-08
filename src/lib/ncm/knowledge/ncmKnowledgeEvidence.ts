import type { NcmEvidenceCandidate } from "@/lib/ai/ncmClassifier";
import { searchNcm } from "./searchNcm";

/**
 * Candidatos restringidos desde el índice NCM local para modo evidencia del clasificador.
 */
export function buildNcmKnowledgeEvidence(productText: string): {
  candidates: NcmEvidenceCandidate[];
  note: string;
} | null {
  const q = productText.trim().slice(0, 2000);
  if (q.length < 8) return null;

  const hits = searchNcm(q, {
    limit: 14,
    productContext: productText,
    applyCoherence: true,
  });
  if (!hits.length) return null;

  const candidates: NcmEvidenceCandidate[] = hits.slice(0, 12).map((h) => ({
    ncm_code: h.code,
    title: `[Cap. ${h.chapter}] ${h.description}`.slice(0, 480),
  }));

  const chapters = [...new Set(hits.map((h) => h.chapter))].sort().join(", ");
  const note = `Base NCM oficial indexada (capítulos ${chapters}). Elegí solo entre estos códigos; compará con la función principal del producto.`;

  return { candidates, note };
}
