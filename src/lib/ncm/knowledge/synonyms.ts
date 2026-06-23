/**
 * Sinónimos: término común del usuario → vocabulario formal del nomenclador.
 *
 * Se AGREGAN a la query (nunca la reemplazan) antes de puntuar en searchNcm, para
 * que un "heladera" alcance los records que dicen "refrigerador", etc. Como es
 * aditivo, jamás rompe una coincidencia previa: en el peor caso no aporta nada.
 *
 * IMPORTANTE: cada entrada fue VERIFICADA contra el índice real (que el término
 * formal lleve al capítulo correcto). Se evitan deliberadamente:
 *  - falsos amigos: "calzado" trae cap. 34 (betún/cremas para calzado), no cap. 64;
 *    "portátil" trae aire acondicionado portátil (8415). Esos casos los resuelven
 *    las semillas de dominio + el clasificador IA, no los sinónimos.
 *  - términos genéricos ("máquina", "receptor", "punto") que contaminan resultados.
 */
const SYNONYMS: Array<{ re: RegExp; add: string[] }> = [
  // Refrigeración → 8418 (verificado)
  { re: /\b(heladera\w*|nevera\w*)\b/i, add: ["refrigerador", "refrigeracion"] },
  { re: /\b(freezer\w*|congelador\w*)\b/i, add: ["refrigerador", "congelador"] },
  // Audio → 8518 (verificado)
  { re: /\b(parlante\w*|altavoz\w*|altoparlante\w*)\b/i, add: ["altavoces"] },
  { re: /\b(auricular\w*|audifono\w*|headphone\w*|earbud\w*)\b/i, add: ["auriculares"] },
  // Óptica → 9004 (verificado)
  { re: /\b(anteojo\w*|gafa\w*|lente\w*\s+de\s+sol)\b/i, add: ["anteojos", "gafas"] },
  // Marroquinería → 4202 (verificado)
  { re: /\b(mochila\w*|morral\w*)\b/i, add: ["mochilas"] },
  { re: /\b(cartera\w*|bolso\w*|bolsa\s+de\s+mano)\b/i, add: ["bolsos"] },
  // Indumentaria → 61/62 (verificado)
  { re: /\b(campera\w*|abrigo\w*|chamarra\w*|rompeviento\w*)\b/i, add: ["anorak"] },
  { re: /\b(remera\w*|playera\w*)\b/i, add: ["camiseta"] },
  { re: /\b(pantalon\w*|jean\w*)\b/i, add: ["pantalones"] },
  // Cosmética → 3303 (verificado)
  { re: /\b(perfume\w*|fragancia\w*|colonia\w*)\b/i, add: ["perfumeria"] },
  // Juguetería → 9503 (verificado)
  { re: /\b(juguete\w*|jugueteria)\b/i, add: ["juguetes"] },
];

/** Devuelve la query con los términos formales del nomenclador agregados al final. */
export function expandQueryWithSynonyms(query: string): string {
  if (!query) return query;
  const extra: string[] = [];
  for (const { re, add } of SYNONYMS) {
    if (re.test(query)) extra.push(...add);
  }
  if (!extra.length) return query;
  const unique = [...new Set(extra)];
  return `${query} ${unique.join(" ")}`;
}
