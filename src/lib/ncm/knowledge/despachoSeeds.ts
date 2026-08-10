import type { NcmEvidenceCandidate } from "@/lib/ai/ncmClassifier";
import { DESPACHO_SEEDS } from "./despachoSeeds.generated";

/**
 * Semillas de dominio derivadas del historial real de despachos de E-COMEX
 * (ver scripts/ncm/despachos/*). Si la consulta contiene las palabras de un
 * producto ya importado y oficializado por AFIP, se inyecta ese NCM como
 * candidato. Complementa domainSeedCandidates (reglas curadas a mano): estas
 * salen del dato histórico y crecen solo con regenerar el archivo .generated.
 *
 * No fuerzan la decisión: el clasificador sigue eligiendo por función principal.
 *
 * Matching por SUBCONJUNTO DE TOKENS: una keyword coincide si TODAS sus palabras
 * de contenido están en la consulta (ignorando conectores y con stemming
 * singular/plural). Robusto al orden y a palabras intercaladas ("cargador auto
 * eléctrico" matchea "cargador PARA auto eléctrico"), sin los falsos positivos
 * del match por substring.
 */
const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Conectores que no aportan a la coincidencia. */
const TOKEN_STOP = new Set(["para", "de", "del", "con", "y", "o", "a", "la", "el", "los", "las", "en", "sin", "por", "un", "una", "al"]);

/** Normaliza singular/plural: "cargadores"→"cargador", "gafas"→"gafa", "tornos"→"torno". */
const stem = (t: string): string =>
  t.length > 4 && t.endsWith("es") ? t.slice(0, -2) : t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t;

const contentTokens = (s: string): string[] =>
  norm(s)
    .split(" ")
    .filter((t) => t && !TOKEN_STOP.has(t))
    .map(stem);

/**
 * Candidatos NCM sugeridos por el historial de despachos. Devuelve los mejores
 * ~6 por especificidad (la keyword con más palabras de contenido gana). Vacío si
 * nada coincide.
 */
export function despachoSeedCandidates(productText: string): NcmEvidenceCandidate[] {
  const qtokens = new Set(contentTokens(productText));
  if (qtokens.size === 0) return [];

  const scored: { cand: NcmEvidenceCandidate; score: number }[] = [];
  for (const seed of DESPACHO_SEEDS) {
    let best = 0;
    for (const kw of seed.keywords) {
      const kt = contentTokens(kw);
      if (kt.length === 0) continue;
      if (kt.every((t) => qtokens.has(t))) {
        // más palabras de contenido = coincidencia más específica
        const score = kt.reduce((n, t) => n + t.length, 0) + kt.length * 4;
        if (score > best) best = score;
      }
    }
    if (best > 0) scored.push({ cand: { ncm_code: seed.ncm, title: seed.title }, score: best });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 6).map((s) => s.cand);
}
