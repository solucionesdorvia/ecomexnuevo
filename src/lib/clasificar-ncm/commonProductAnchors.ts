/**
 * Anclas deterministas para productos de ALTA FRECUENCIA.
 *
 * Se usan SOLO como red de seguridad: cuando el motor (clasificador LLM, no
 * determinista) no logra fijar un NCM, anclamos los productos comunes a su
 * posición canónica para que SIEMPRE resuelvan, en vez de quedar sin clasificar.
 *
 * - NO hacen override: si el motor ya eligió un NCM, se respeta.
 * - Los códigos están VERIFICADOS contra PCRAM en vivo (no inventados).
 * - Cada ancla puede excluir accesorios/repuestos con `not` para no confundir
 *   "funda de celular" con el teléfono, etc.
 */
export type ProductAnchor = { test: RegExp; not?: RegExp; ncm: string; label: string };

const ACCESSORY = /\b(cargador|funda|cable|repuesto|accesorio|soporte|protector|carcasa|filtro)\w*/i;

export const COMMON_PRODUCT_ANCHORS: ProductAnchor[] = [
  { test: /\b(smartphone|celular|tel[eé]fono\s+(?:m[oó]vil|intelig))\w*/i, not: /\b(funda|cargador|cable|vidrio|protector|accesorio|repuesto|pantalla)\w*/i, ncm: "8517.13.00", label: "Smartphone" },
  { test: /\b(auricular|aud[ií]fono|headphone|earphone|earbud)\w*/i, not: ACCESSORY, ncm: "8518.30.00", label: "Auriculares" },
  { test: /\b(notebook|laptop|netbook|ultrabook|macbook)\w*/i, ncm: "8471.30.12", label: "Notebook" },
  { test: /\b(heladera|refrigerador|nevera)\w*/i, not: ACCESSORY, ncm: "8418.10.00", label: "Heladera" },
  { test: /\b(lavarropas|lavadora)\w*/i, not: ACCESSORY, ncm: "8450.11.00", label: "Lavarropas" },
  { test: /\bmicroondas\b/i, ncm: "8516.50.00", label: "Microondas" },
  { test: /\bcafetera\w*/i, not: ACCESSORY, ncm: "8516.71.00", label: "Cafetera" },
  { test: /\blicuadora\w*/i, not: ACCESSORY, ncm: "8509.40.10", label: "Licuadora" },
  { test: /\b(televisor|smart\s*tv|pantalla\s+led)\w*/i, not: ACCESSORY, ncm: "8528.72.00", label: "Televisor" },
  { test: /\b(aire\s+acondicionado|equipo\s+split)\b/i, not: ACCESSORY, ncm: "8415.10.11", label: "Aire acondicionado" },
  { test: /\btaladro\w*/i, not: ACCESSORY, ncm: "8467.21.00", label: "Taladro" },
  { test: /\b(bicicleta|mountain\s*bike)\b/i, not: /\b(electric|el[eé]ctric|accesorio|repuesto|cubierta)\w*/i, ncm: "8712.00.10", label: "Bicicleta" },
  { test: /\b(neum[aá]tico|cubierta\s+de\s+(auto|veh))\w*/i, ncm: "4011.10.00", label: "Neumático" },
  { test: /\b(perfume|eau\s+de\s+(parfum|toilette)|fragancia)\w*/i, ncm: "3303.00.20", label: "Perfume" },
  { test: /\b(motocicleta|motoneta)\w*/i, not: ACCESSORY, ncm: "8711.20.20", label: "Motocicleta" },
  // Vehículos terminados (cap. 87). El motor a veces devuelve candidatos
  // siderúrgicos (chapa/acero, cap. 72) para un vehículo; anclamos las
  // categorías comunes a su partida. La subpartida es orientativa (nafta/diésel,
  // peso) — el despachante confirma el dígito fino. Excluimos autoelevador (8427).
  { test: /\b(camioneta|pick[\s-]?up|pickup)\b/i, not: /\b(autoelevador|repuesto|accesorio|cubierta|parte)\w*/i, ncm: "8704.31.00", label: "Camioneta / pick-up" },
  { test: /\bcami[oó]n(?:es)?\b/i, not: /\b(camioneta|autoelevador|repuesto|parte)\w*/i, ncm: "8704.22.00", label: "Camión" },
  { test: /[oó]mnibus|\b(colectivo|autob[uú]s|micro(?:bús|bus)?|bus)\b/i, not: /\b(business|autoelevador)\w*/i, ncm: "8702.10.00", label: "Ómnibus / bus" },
  { test: /\b(autom[oó]vil(?:es)?|coche|sed[aá]n|hatchback|suv)\b/i, not: /\b(autoelevador|autoparte|autoadhes)\w*/i, ncm: "8703.23.00", label: "Automóvil" },
];

/** Devuelve el ancla cuyo patrón matchea el texto (y no es un accesorio), o null. */
export function matchProductAnchor(text: string | undefined | null): ProductAnchor | null {
  const t = String(text ?? "").toLowerCase();
  if (t.length < 3) return null;
  for (const a of COMMON_PRODUCT_ANCHORS) {
    if (a.test.test(t) && (!a.not || !a.not.test(t))) return a;
  }
  return null;
}
