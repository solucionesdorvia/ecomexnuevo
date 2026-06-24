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
    // Subpartida CRÍTICA (cambia el arancel): 8419.31 "productos agrícolas" tiene
    // DIE 14%, pero 8419.39 "los demás" tiene DIE 35%. La convención reserva 8419.31
    // para secadores INDUSTRIALES de campo (granos, tabaco, etc.); un deshidratador
    // DOMÉSTICO / de mesada va a 8419.39. Para el doméstico priorizamos 8419.39
    // (alineado con el despachante y conservador: no subcotiza).
    const isHousehold =
      /\b(dom[eé]stic\w*|hogar|casero\w*|de\s+mesada|encimera|personal|port[aá]til\w*|compact\w*|peque[ñn]\w*)\b/.test(
        text
      );
    if (isHousehold) {
      seeds.push(
        { ncm_code: "8419.39.00", title: "[Cap. 84] Los demás secadores — deshidratador doméstico/de mesada (DIE 35%)" },
        { ncm_code: "8419.31.00", title: "[Cap. 84] Secadores para productos agrícolas — uso industrial/campo (DIE 14%)" }
      );
    } else {
      seeds.push(
        { ncm_code: "8419.31.00", title: "[Cap. 84] Secadores para productos agrícolas (industrial/campo, DIE 14%)" },
        { ncm_code: "8419.39.00", title: "[Cap. 84] Los demás secadores (DIE 35%)" }
      );
    }
    seeds.push({ ncm_code: "8419.81.90", title: "[Cap. 84] Para cocción o calentamiento de alimentos" });
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
    !/\b(cami[oó]n\w*|[oó]mnibus|colectivo|micro\b|autob[uú]s|tractor\w*|moto\b|motocicleta\w*)\b/.test(text) &&
    // No clasificar un REPUESTO/parte de auto como el auto entero.
    !/\b(neum[aá]tico\w*|cubierta\w*|llanta\w*|repuesto\w*|filtro\w*|bater[ií]a\w*|paragolpe\w*|parabrisas\w*|amortiguador\w*|paragolpes\w*)\b/.test(text)
  ) {
    seeds.push(
      { ncm_code: "8703.23.10", title: "[Cap. 87] Automóvil de pasajeros, nafta, cilindrada 1500–3000 cc" },
      { ncm_code: "8703.22.10", title: "[Cap. 87] Automóvil de pasajeros, nafta, cilindrada 1000–1500 cc" },
      { ncm_code: "8703.32.10", title: "[Cap. 87] Automóvil de pasajeros, diésel, 1500–2500 cc" }
    );
  }

  // ── Categorías de consumo frecuentes ──────────────────────────────────────
  // El índice usa lenguaje formal ("calzado", "bombas para líquidos") y la
  // búsqueda léxica no matchea los términos comunes del usuario. Sembramos las
  // partidas oficiales por categoría para que SIEMPRE haya candidato correcto.

  // Calzado deportivo / zapatillas → 64
  if (/\b(zapatilla\w*|zapato\w*|calzado\w*|sneaker\w*|champion(es)?|botin\w*|bota\w*)\b/.test(text)) {
    seeds.push(
      { ncm_code: "6404.11.00", title: "[Cap. 64] Calzado deportivo, suela caucho/plástico, parte superior textil" },
      { ncm_code: "6403.99.90", title: "[Cap. 64] Calzado con parte superior de cuero" },
      { ncm_code: "6402.99.90", title: "[Cap. 64] Calzado de caucho o plástico" }
    );
  }
  // Heladera / refrigerador / freezer → 8418
  if (/\b(heladera\w*|refrigerador\w*|nevera\w*|freezer\w*|congelador\w*)\b/.test(text)) {
    seeds.push(
      { ncm_code: "8418.21.00", title: "[Cap. 84] Refrigeradores domésticos de compresión" },
      { ncm_code: "8418.10.00", title: "[Cap. 84] Combinados refrigerador-congelador" }
    );
  }
  // Bomba para líquidos (con contexto de agua/líquido/riego) → 8413
  if (/\bbomba\w*\b/.test(text) && /\b(agua|l[ií]quid\w*|centr[ií]fug\w*|sumergible\w*|riego|pozo|presuriz\w*)\b/.test(text)) {
    seeds.push(
      { ncm_code: "8413.70.90", title: "[Cap. 84] Bombas centrífugas para líquidos" },
      { ncm_code: "8413.81.00", title: "[Cap. 84] Las demás bombas para líquidos" }
    );
  }
  // Perfumería → 3303
  if (/\b(perfume\w*|fragancia\w*|eau\s+de\s+(parfum|toilette)|colonia\w*|after\s*shave)\b/.test(text)) {
    seeds.push(
      { ncm_code: "3303.00.20", title: "[Cap. 33] Perfumes" },
      { ncm_code: "3303.00.10", title: "[Cap. 33] Aguas de tocador" }
    );
  }
  // Bicicleta sin motor → 8712 (las eléctricas/con motor van a 8711/8711.60)
  if (/\b(bicicleta\w*|bici\b|mountain\s*bike|\bmtb\b|rodado\s*\d+)\b/.test(text) && !/\b(electric\w*|e-?bike|con\s+motor|motorizad\w*)\b/.test(text)) {
    seeds.push({ ncm_code: "8712.00.10", title: "[Cap. 87] Bicicletas sin motor" });
  }
  // Herramienta eléctrica de uso manual → 8467
  if (/\b(taladro\w*|amoladora\w*|atornillador\w*|esmeril\w*|lijadora\w*|sierra\s+circular|caladora\w*|rotomartillo\w*)\b/.test(text)) {
    seeds.push(
      { ncm_code: "8467.21.00", title: "[Cap. 84] Taladros electromecánicos de uso manual" },
      { ncm_code: "8467.29.00", title: "[Cap. 84] Las demás herramientas electromecánicas de uso manual" }
    );
  }
  // Horno microondas → 8516.50
  if (/\bmicroondas\b/.test(text)) {
    seeds.push({ ncm_code: "8516.50.00", title: "[Cap. 85] Hornos de microondas" });
  }
  // Campera / anorak / abrigo (prenda exterior) → 62 (plano) / 61 (punto)
  if (/\b(campera\w*|anorak\w*|abrigo\w*|chaqueta\w*|chamarra\w*|rompeviento\w*|piloto\b)\b/.test(text)) {
    seeds.push(
      { ncm_code: "6201.40.00", title: "[Cap. 62] Anoraks/camperas de hombre, fibras sintéticas (no de punto)" },
      { ncm_code: "6202.40.00", title: "[Cap. 62] Anoraks/camperas de mujer, fibras sintéticas (no de punto)" },
      { ncm_code: "6101.30.00", title: "[Cap. 61] Anoraks/camperas de hombre, de punto" }
    );
  }

  // Teléfono celular / smartphone → 8517.12 (en esta nomenclatura los smartphones
  // van a 8517.12.00 "teléfonos celulares (móviles)"). El léxico manda "celular" al
  // cap. 21 (levadura "celular"), por eso sembramos la partida correcta.
  if (
    /\b(celular\w*|smartphone\w*|m[oó]vil\b|tel[eé]fono\w*\s+(movil|m[oó]vil|intelig\w*|celular\w*))\b/.test(text)
  ) {
    seeds.push({ ncm_code: "8517.12.00", title: "[Cap. 85] Teléfonos celulares (móviles) / smartphones" });
  }
  // Notebook / laptop → 8471.30 (máquinas automáticas de procesamiento de datos,
  // portátiles). El léxico la manda a 8415 (aire acondicionado "portátil").
  if (/\b(notebook\w*|laptop\w*|ultrabook\w*|netbook\w*)\b/.test(text)) {
    seeds.push(
      { ncm_code: "8471.30.12", title: "[Cap. 84] Notebook/laptop portátil, peso < 3,5 kg (procesamiento de datos)" },
      { ncm_code: "8471.30.90", title: "[Cap. 84] Las demás máquinas de procesamiento de datos portátiles" }
    );
  }
  // Televisor / smart TV → 8528.72 (receptores de televisión en color). El léxico
  // daba 8521 (vídeo). Excluye el monitor de PC (8528.5x).
  if (/\b(televisor\w*|smart\s*tv|televisi[oó]n\w*)\b/.test(text) && !/\bmonitor\w*\b/.test(text)) {
    seeds.push({ ncm_code: "8528.72.00", title: "[Cap. 85] Televisores en color (receptores de TV)" });
  }

  // ── Electrodomésticos y maquinaria de consumo frecuente ────────────────────
  // El léxico manda estos términos a capítulos absurdos (aire→caucho, lavarropas→
  // ortopedia, motocicleta→cámaras de aire, panel solar→grasa animal). Sembramos
  // la partida correcta — códigos verificados contra el índice oficial.

  // Aire acondicionado → 8415
  if (/\b(aire\s+acondicionado|acondicionador\w*\s+de\s+aire|climatizador\w*|split\b)\b/.test(text)) {
    seeds.push(
      { ncm_code: "8415.10.11", title: "[Cap. 84] Aire acondicionado split (sistema de elementos separados)" },
      { ncm_code: "8415.82.10", title: "[Cap. 84] Aire acondicionado con equipo de enfriamiento" }
    );
  }
  // Lavarropas → 8450 (excluye lavavajillas, que es 8422)
  if (/\b(lavarropas\w*|lava\s*ropas|lavadora\w*\s+de\s+ropa)\b/.test(text) && !/\blavavajilla\w*/.test(text)) {
    seeds.push({ ncm_code: "8450.11.00", title: "[Cap. 84] Lavarropas automático (máquina de lavar ropa)" });
  }
  // Secarropas → 8421.12 (centrífugo) / 8451.21 (con calor). Exige contexto de ROPA
  // (distinto del deshidratador/secador de ALIMENTOS, que va a 8419).
  if (/\b(secarropas\w*|seca\s*ropas|secadora\w*\s+de\s+ropa)\b/.test(text)) {
    seeds.push(
      { ncm_code: "8421.12.00", title: "[Cap. 84] Secadora de ropa centrífuga" },
      { ncm_code: "8451.21.00", title: "[Cap. 84] Secadora de ropa con calentamiento" }
    );
  }
  // Licuadora / batidora / procesadora de alimentos → 8509.40
  if (/\b(licuadora\w*|batidora\w*|juguera\w*|minipimer\w*|procesadora\w*\s+de\s+aliment\w*|mixer\b)\b/.test(text)) {
    seeds.push(
      { ncm_code: "8509.40.10", title: "[Cap. 85] Licuadoras (aparato electromecánico doméstico)" },
      { ncm_code: "8509.40.00", title: "[Cap. 85] Trituradoras y mezcladoras de alimentos" }
    );
  }
  // Cafetera eléctrica → 8516.71
  if (/\b(cafetera\w*|m[aá]quina\w*\s+de\s+caf[eé]|express\w*\s+de\s+caf[eé])\b/.test(text)) {
    seeds.push({ ncm_code: "8516.71.00", title: "[Cap. 85] Cafetera / aparato para preparar café o té" });
  }
  // Plancha de ropa → 8516.40 (exige contexto ropa/vapor; NO la plancha de acero)
  if (/\b(plancha\w*\s+(de\s+ropa|a\s+vapor|de\s+vapor|el[eé]ctric\w*)|plancha\w*\s+de\s+(pelo|cabello)|planchita\w*\s+de\s+(pelo|cabello))\b/.test(text)) {
    seeds.push({ ncm_code: "8516.40.00", title: "[Cap. 85] Plancha eléctrica" });
  }
  // Soldadora eléctrica → 8515
  if (/\b(soldadora\w*|m[aá]quina\w*\s+de\s+soldar|soldador\w*\s+(inverter|el[eé]ctric\w*|mig|tig|de\s+arco))\b/.test(text)) {
    seeds.push(
      { ncm_code: "8515.31.00", title: "[Cap. 85] Máquina de soldar de arco, automática" },
      { ncm_code: "8515.39.00", title: "[Cap. 85] Las demás máquinas de soldar de arco" }
    );
  }
  // Autoelevador / montacargas → 8427
  if (/\b(autoelevador\w*|montacarga\w*|carretilla\w*\s+elevador\w*|apilador\w*|forklift\w*|clark\b)\b/.test(text)) {
    seeds.push({ ncm_code: "8427.20.00", title: "[Cap. 84] Autoelevador / carretilla autopropulsada con motor" });
  }
  // Motocicleta → 8711 (excluye motosierra/motobomba/motoguadaña y "motor" suelto)
  if (
    /\b(motocicleta\w*|ciclomotor\w*|scooter\w*|\bmoto\b)\b/.test(text) &&
    !/\b(motosierra\w*|motobomba\w*|motoguada\w*|motocultiv\w*|motoniv\w*|motor\b)\b/.test(text)
  ) {
    seeds.push(
      { ncm_code: "8711.20.00", title: "[Cap. 87] Motocicleta, motor de pistón 50–250 cm³" },
      { ncm_code: "8711.30.00", title: "[Cap. 87] Motocicleta, motor de pistón 250–500 cm³" }
    );
  }
  // Neumático / cubierta de auto → 4011.10 (exige contexto vehículo; bici va a 4011.50)
  if (
    /\b(neum[aá]tico\w*|cubierta\w*)\b/.test(text) &&
    /\b(auto\w*|veh[ií]cul\w*|camioneta\w*|turismo|rodado)\b/.test(text) &&
    !/\bbicicl\w*/.test(text)
  ) {
    seeds.push({ ncm_code: "4011.10.00", title: "[Cap. 40] Neumático nuevo para automóvil de turismo" });
  }
  // Panel solar fotovoltaico → 8541.40
  if (/\b(panel\w*\s+solar\w*|placa\w*\s+solar\w*|m[oó]dulo\w*\s+fotovolt\w*|celda\w*\s+solar\w*|fotovolta\w*)\b/.test(text)) {
    seeds.push({ ncm_code: "8541.40.00", title: "[Cap. 85] Panel solar fotovoltaico (células fotovoltaicas)" });
  }
  // Luminaria LED (artefacto, no el foco/bulbo suelto) → 9405.40
  if (/\b(luminaria\w*|reflector\w*\s+led|panel\w*\s+led|plaf[oó]n\w*|aplique\w*\s+led|tubo\w*\s+led)\b/.test(text)) {
    seeds.push({ ncm_code: "9405.40.00", title: "[Cap. 94] Aparato eléctrico de alumbrado (luminaria LED)" });
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
      // Si tenemos semillas de dominio (la partida correcta es conocida, p. ej.
      // celular→8517, notebook→8471), las usamos en vez de descartar todo. Solo
      // sin semillas caemos a modo libre (sin restricción de candidatos).
      return seeds.length ? { candidates: seeds, note: SEED_NOTE } : null;
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
