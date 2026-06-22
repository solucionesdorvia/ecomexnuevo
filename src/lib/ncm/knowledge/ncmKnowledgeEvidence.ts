import type { NcmEvidenceCandidate } from "@/lib/ai/ncmClassifier";
import { searchNcm } from "./searchNcm";

/**
 * Capítulos NCM que corresponden a electrónica, maquinaria y equipo eléctrico.
 * Cuando el texto describe un producto de este tipo, los candidatos deben
 * pertenecer mayoritariamente a estos capítulos; si no, la evidencia es ruido.
 */
const ELECTRONICS_CHAPTERS = new Set(["84", "85", "86", "87", "88", "89", "90", "91", "92"]);

/**
 * Palabras clave que indican que el producto es claramente electrónico /
 * tecnológico. Incluye marcas comunes para detectar el contexto.
 */
const ELECTRONICS_RE =
  /\b(laptop|macbook|notebook|iphone|ipad|smartphone|celular|tablet|auricular|headphone|earphone|cargador|usb|monitor|televisor|computad|ordenad|procesador|disco\s*(?:duro|ssd)|placa\s*madre|gpu|cpu|router|switch|camara\s*(?:digital|ip)|consola|playstation|xbox|nintendo|drone|impresora|escaner|proyector|teclado|raton\s*optico|trackpad|alexa|echo\s*dot)\b/i;

/**
 * Candidatos restringidos desde el índice NCM local para modo evidencia del clasificador.
 *
 * Guarda de coherencia: si el producto es claramente electrónico pero todos
 * los candidatos del índice pertenecen a capítulos no-electrónicos (ej. 01-40),
 * se devuelve null para que el clasificador opere en modo libre (sin restricción
 * de candidatos). Esto evita que términos cortos tipo "pro" o "m4" contaminen
 * la búsqueda con resultados de capítulos agropecuarios o plásticos.
 */
/**
 * Semillas de dominio para "trampas" léxicas: productos cuyo nombre comercial NO
 * coincide con el texto del nomenclador, por lo que la búsqueda léxica nunca los
 * trae. Se INYECTAN como candidatos (no fuerzan la decisión: el clasificador
 * sigue eligiendo por función principal). Cada caso se documenta con su porqué.
 */
function domainSeedCandidates(q: string): NcmEvidenceCandidate[] {
  const text = q.toLowerCase();
  const seeds: NcmEvidenceCandidate[] = [];

  // Deshidratador / secador de ALIMENTOS → partida 8419 (tratamiento por secado),
  // NO 8514 (hornos eléctricos industriales de metalurgia/cerámica). En el índice
  // 8419.3x se describe como "Para productos agrícolas / madera…", sin las palabras
  // "secador" ni "deshidratador", así que la búsqueda léxica no las alcanza.
  // Excluye el secador de pelo (8516.31): exige contexto de alimentos.
  const isFoodDryer =
    /\bdeshidrat\w+/.test(text) ||
    (/\b(secador\w*|desecador\w*|secadero\w*)\b/.test(text) &&
      /\b(aliment\w*|frut\w*|verdur\w*|hortaliz\w*|grano\w*|cereal\w*|hierba\w*|t[eé]\b|carne\w*|pescado\w*|c[aá]scara\w*|agr[ií]col\w*)\b/.test(
        text
      ));
  if (isFoodDryer) {
    seeds.push(
      { ncm_code: "8419.31.00", title: "[Cap. 84] Secadores para productos agrícolas (frutas, alimentos)" },
      { ncm_code: "8419.39.00", title: "[Cap. 84] Los demás secadores (incl. liofilización/criodesecación)" },
      { ncm_code: "8419.81.90", title: "[Cap. 84] Para cocción o calentamiento de alimentos" }
    );
  }

  // Excavadora / retroexcavadora / pala cargadora / topadora → partida 8429
  // (palas mecánicas, excavadoras, cargadoras, topadoras autopropulsadas). En el
  // índice 8429.5x tiene texto técnico ("superestructura que gira 360°") que no
  // coincide con el nombre comercial → la búsqueda léxica no las trae.
  if (
    /\b(excavador\w*|retroexcavador\w*|retropala\w*|pala\s+cargador\w*|cargador\w*\s+frontal|minicargador\w*|topador\w*|motonivelador\w*|bulldozer|buld[oó]cer)\b/.test(
      text
    )
  ) {
    seeds.push(
      { ncm_code: "8429.52.00", title: "[Cap. 84] Excavadora cuya superestructura gira 360° (giratoria)" },
      { ncm_code: "8429.51.00", title: "[Cap. 84] Cargadoras y palas cargadoras de carga frontal" },
      { ncm_code: "8429.59.00", title: "[Cap. 84] Las demás palas mecánicas / excavadoras" }
    );
  }

  // Automóvil de pasajeros → 8703 (DIE 35%). El Cap. 87 está casi vacío en el
  // índice local (solo 8703.10 nieve/golf), así que la búsqueda léxica NUNCA
  // encuentra el código y el auto no clasificaba. Excluye camión (8704) y
  // ómnibus/colectivo (8702), que tienen su propia partida.
  if (
    /\b(autom[oó]vil\w*|auto\b|sed[aá]n|coup[eé]|hatchback|station\s*wagon|suv\b|todoterreno|veh[ií]culo\w*\s+de\s+pasajeros)\b/.test(
      text
    ) &&
    !/\b(cami[oó]n\w*|[oó]mnibus|colectivo|micro\b|autob[uú]s|tractor\w*|moto\b|motocicleta\w*)\b/.test(text)
  ) {
    seeds.push(
      { ncm_code: "8703.23.10", title: "[Cap. 87] Automóvil de pasajeros, nafta, cilindrada 1500–3000 cc" },
      { ncm_code: "8703.22.10", title: "[Cap. 87] Automóvil de pasajeros, nafta, cilindrada 1000–1500 cc" },
      { ncm_code: "8703.32.10", title: "[Cap. 87] Automóvil de pasajeros, diésel, 1500–2500 cc" }
    );
  }

  return seeds;
}

const SEED_NOTE =
  "Candidatos sugeridos por función del producto (semilla de dominio). Elegí la subpartida que mejor describa la función principal; documentá por qué descartás las demás.";

export function buildNcmKnowledgeEvidence(productText: string): {
  candidates: NcmEvidenceCandidate[];
  note: string;
} | null {
  const q = productText.trim().slice(0, 2000);
  if (q.length < 8) return null;

  const seeds = domainSeedCandidates(q);

  const hits = searchNcm(q, {
    limit: 14,
    productContext: productText,
    applyCoherence: true,
  });
  // Sin coincidencias léxicas pero con semilla de dominio → usamos la semilla
  // (mejor que caer a modo libre sin pistas de la partida correcta).
  if (!hits.length) return seeds.length ? { candidates: seeds, note: SEED_NOTE } : null;

  // ── Guarda de coherencia para electrónica ─────────────────────────────────
  // Si el texto describe un producto electrónico pero ningún candidato pertenece
  // a capítulos 84-92, la búsqueda léxica devolvió ruido (p. ej. "pro" →
  // "reproducción" en capítulo 01). Omitimos la evidencia para que el
  // clasificador IA opere sin restricción de candidatos.
  if (ELECTRONICS_RE.test(q)) {
    const hasElectronicsChapter = hits.some((h) => ELECTRONICS_CHAPTERS.has(h.chapter));
    if (!hasElectronicsChapter) {
      return null;
    }
  }

  const lexical: NcmEvidenceCandidate[] = hits.map((h) => ({
    ncm_code: h.code,
    title: `[Cap. ${h.chapter}] ${h.description}`.slice(0, 480),
  }));

  // Semillas de dominio primero (la función pesa más que la coincidencia léxica),
  // luego las candidatas del índice, sin duplicar por código y con tope de 12.
  const seen = new Set<string>();
  const candidates: NcmEvidenceCandidate[] = [];
  for (const c of [...seeds, ...lexical]) {
    const k = c.ncm_code.replace(/\D/g, "").slice(0, 8);
    if (k.length < 6 || seen.has(k)) continue;
    seen.add(k);
    candidates.push(c);
    if (candidates.length >= 12) break;
  }

  const chapters = [...new Set(hits.map((h) => h.chapter))].sort().join(", ");
  const note = seeds.length
    ? `${SEED_NOTE} También se listan candidatos del nomenclador oficial (capítulos ${chapters}).`
    : `Base NCM oficial indexada (capítulos ${chapters}). Elegí solo entre estos códigos; compará con la función principal del producto.`;

  return { candidates, note };
}
