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

  // Calzado deportivo / zapatillas → 64. Si hay "cuero", priorizar 6403 (capellada de cuero).
  if (/\b(zapatilla\w*|zapato\w*|calzado\w*|sneaker\w*|champion(es)?|botin\w*|bota\w*)\b/.test(text)) {
    if (/\b(cuero\w*|piel\w*)\b/.test(text)) {
      seeds.push(
        { ncm_code: "6403.99.90", title: "[Cap. 64] Calzado con parte superior de cuero" },
        { ncm_code: "6403.51.90", title: "[Cap. 64] Calzado de cuero con suela de cuero" },
        { ncm_code: "6404.11.00", title: "[Cap. 64] Calzado deportivo, parte superior textil" }
      );
    } else {
      seeds.push(
        { ncm_code: "6404.11.00", title: "[Cap. 64] Calzado deportivo, suela caucho/plástico, parte superior textil" },
        { ncm_code: "6403.99.90", title: "[Cap. 64] Calzado con parte superior de cuero" },
        { ncm_code: "6402.99.90", title: "[Cap. 64] Calzado de caucho o plástico" }
      );
    }
  }
  // Grupo electrógeno / generador eléctrico → 8502 (≠ motor solo, 8501)
  if (/\b(grupo\w*\s+electr[oó]gen\w*|generador\w*\s+(el[eé]ctric\w*|de\s+energ|a\s+(nafta|diesel|gasoil))|electr[oó]gen\w*)\b/.test(text)) {
    seeds.push(
      { ncm_code: "8502.11.00", title: "[Cap. 85] Grupo electrógeno con motor diésel ≤ 75 kVA" },
      { ncm_code: "8502.20.00", title: "[Cap. 85] Grupo electrógeno con motor de explosión (nafta)" }
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

  // Teléfono celular / smartphone → 8517.13.00 (HS-2022: los smartphones se separaron
  // de 8517.12 a la subpartida nueva 8517.13 "teléfonos inteligentes"; es la que usa
  // PCRAM). Sembramos la partida correcta porque el léxico manda "celular" al cap. 21
  // (levadura "celular"). El seed viejo (8517.12) hacía que el LLM cayera a un código
  // que el paso decisivo descartaba → NCM null intermitente.
  if (
    /\b(celular\w*|smartphone\w*|m[oó]vil\b|tel[eé]fono\w*\s+(movil|m[oó]vil|intelig\w*|celular\w*))\b/.test(text) &&
    // Un ACCESORIO de celular (cargador, funda, cable, vidrio) no es el teléfono.
    !/\b(cargador\w*|funda\w*|cable\w*|vidrio\w*|templado\w*|protector\w*|carcasa\w*|soporte\w*|accesorio\w*|repuesto\w*|pantalla\w*|bater[ií]a\w*|auricular\w*)\b/.test(text)
  ) {
    seeds.push({ ncm_code: "8517.13.00", title: "[Cap. 85] Teléfonos inteligentes (smartphones)" });
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
  // Motocicleta → 8711 (excluye motosierra/motobomba, "motor" suelto, y accesorios
  // como casco/guantes/cubierta que tienen su propia posición).
  if (
    /\b(motocicleta\w*|ciclomotor\w*|scooter\w*|\bmoto\b)\b/.test(text) &&
    !/\b(motosierra\w*|motobomba\w*|motoguada\w*|motocultiv\w*|motoniv\w*|motor\b|casco\w*|guante\w*|cubierta\w*|neum[aá]tic\w*|repuesto\w*|funda\w*)\b/.test(text)
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

  // ── Pequeños electrodomésticos térmicos (8516) y cuidado personal (8510) ───
  // El léxico los manda a tabaco, energía eléctrica, cerdas de cerdo, etc.

  // Tostadora de pan → 8516.72
  if (/\b(tostadora\w*|tostador\w*\s+de\s+pan)\b/.test(text)) {
    seeds.push({ ncm_code: "8516.72.00", title: "[Cap. 85] Tostadora de pan eléctrica" });
  }
  // Freidora de aire / sandwichera / horno / anafe eléctrico → 8516.60
  if (/\b(freidora\w*|air\s*fryer|sandwichera\w*|sanguchera\w*|horno\w*\s+el[eé]ctric\w*|anafe\w*\s+el[eé]ctric\w*|grill\w*\s+el[eé]ctric\w*|parrilla\w*\s+el[eé]ctric\w*)\b/.test(text)) {
    seeds.push({ ncm_code: "8516.60.00", title: "[Cap. 85] Horno/freidora/parrilla eléctrica de cocción" });
  }
  // Pava eléctrica / hervidor / jarra eléctrica → 8516.79
  if (/\b(pava\w*\s+el[eé]ctric\w*|hervidor\w*|jarra\w*\s+el[eé]ctric\w*|calentador\w*\s+de\s+agua\s+port[aá]til)\b/.test(text)) {
    seeds.push({ ncm_code: "8516.79.00", title: "[Cap. 85] Pava/hervidor eléctrico (aparato electrotérmico)" });
  }
  // Calefactor / estufa eléctrica / caloventor → 8516.29
  if (/\b(calefactor\w*|estufa\w*\s+el[eé]ctric\w*|caloventor\w*|caloventilador\w*|panel\w*\s+calefactor\w*)\b/.test(text)) {
    seeds.push({ ncm_code: "8516.29.00", title: "[Cap. 85] Aparato eléctrico para calefacción de espacios" });
  }
  // Termotanque / calefón / calentador de agua eléctrico → 8516.10
  if (/\b(termotanque\w*|calef[oó]n\w*|calentador\w*\s+de\s+agua)\b/.test(text)) {
    seeds.push({ ncm_code: "8516.10.00", title: "[Cap. 85] Calentador eléctrico de agua (termotanque/calefón)" });
  }
  // Secador de pelo → 8516.31 (distinto del deshidratador de alimentos, 8419)
  if (/\b(secador\w*\s+de\s+(pelo|cabello)|secarropas\w*\s+de\s+pelo)\b/.test(text)) {
    seeds.push({ ncm_code: "8516.31.00", title: "[Cap. 85] Secador para el cabello" });
  }
  // Afeitadora eléctrica → 8510.10
  if (/\b(afeitadora\w*|m[aá]quina\w*\s+de\s+afeitar)\b/.test(text)) {
    seeds.push({ ncm_code: "8510.10.00", title: "[Cap. 85] Afeitadora eléctrica" });
  }
  // Máquina de cortar el pelo → 8510.20
  if (/\b(cortapelo\w*|cortadora\w*\s+de\s+(pelo|cabello)|m[aá]quina\w*\s+de\s+cortar\s+(el\s+)?(pelo|cabello)|esquiladora\w*)\b/.test(text)) {
    seeds.push({ ncm_code: "8510.20.00", title: "[Cap. 85] Máquina de cortar el pelo o esquilar" });
  }
  // Cepillo de dientes eléctrico → 8509.80
  if (/\bcepillo\w*\s+de\s+dientes\b/.test(text) && /\b(el[eé]ctric\w*|recargable\w*|s[oó]nic\w*)\b/.test(text)) {
    seeds.push({ ncm_code: "8509.80.00", title: "[Cap. 85] Cepillo de dientes eléctrico (aparato electromecánico)" });
  }
  // Cargador eléctrico / fuente → 8504.40 (excluye la pala CARGADORA frontal, 8429)
  if (
    /\bcargador\w*\b/.test(text) &&
    /\b(celular\w*|tel[eé]fono\w*|bater[ií]a\w*|usb\b|notebook\w*|pila\w*|dispositiv\w*|red\b|220|inal[aá]mbric\w*)\b/.test(text) &&
    !/\b(frontal|pala\s+cargador|minicargador|retro\w*)\b/.test(text)
  ) {
    seeds.push({ ncm_code: "8504.40.10", title: "[Cap. 85] Cargador de batería / convertidor estático" });
  }
  // Pendrive / memoria USB → 8523.51
  if (/\b(pendrive\w*|pen\s*drive\w*|memoria\w*\s+usb|memoria\w*\s+flash|flash\s*drive\w*)\b/.test(text)) {
    seeds.push({ ncm_code: "8523.51.00", title: "[Cap. 85] Pendrive / memoria flash (almacenamiento no volátil)" });
  }
  // Motosierra → 8467.81 (sierra de cadena, herramienta con motor)
  if (/\b(motosierra\w*|sierra\w*\s+de\s+cadena|electrosierra\w*)\b/.test(text)) {
    seeds.push({ ncm_code: "8467.81.00", title: "[Cap. 84] Motosierra (sierra de cadena con motor)" });
  }
  // Cortadora / cortadora de césped → 8433.11
  if (/\b(cortadora\w*\s+de\s+c[eé]sped|cortac[eé]sped\w*|corta\s*c[eé]sped\w*|m[aá]quina\w*\s+de\s+cortar\s+c[eé]sped)\b/.test(text)) {
    seeds.push({ ncm_code: "8433.11.00", title: "[Cap. 84] Cortadora de césped con motor (corte horizontal)" });
  }

  // ── Indumentaria (cap. 61 punto / 62 plano) ───────────────────────────────
  // El léxico no resuelve prendas comunes (remera, jean, buzo) → caían vacías.
  if (/\b(remera\w*|camiseta\w*|playera\w*|t-?shirt\w*)\b/.test(text)) {
    seeds.push(
      { ncm_code: "6109.10.00", title: "[Cap. 61] Remera/camiseta de algodón, de punto" },
      { ncm_code: "6109.90.00", title: "[Cap. 61] Remera/camiseta de otras materias, de punto" }
    );
  }
  if (/\b(buzo\w*|hoodie\w*|sudadera\w*|su[eé]ter\w*|sweater\w*|pulover\w*|canguro\w*)\b/.test(text)) {
    seeds.push(
      { ncm_code: "6110.20.00", title: "[Cap. 61] Buzo/suéter de algodón, de punto" },
      { ncm_code: "6110.30.00", title: "[Cap. 61] Buzo/suéter de fibras sintéticas, de punto" }
    );
  }
  if (/\b(jean\w*|pantal[oó]n\w*|vaquero\w*)\b/.test(text) && !/\b(corto\w*|short\w*|ba[ñn]o)\b/.test(text)) {
    seeds.push(
      { ncm_code: "6203.42.00", title: "[Cap. 62] Pantalón/jean de hombre, algodón (tejido plano)" },
      { ncm_code: "6204.62.00", title: "[Cap. 62] Pantalón/jean de mujer, algodón (tejido plano)" }
    );
  }
  if (/\b(vestido\w*)\b/.test(text)) {
    seeds.push(
      { ncm_code: "6204.42.00", title: "[Cap. 62] Vestido de algodón (tejido plano)" },
      { ncm_code: "6204.43.00", title: "[Cap. 62] Vestido de fibras sintéticas (tejido plano)" },
      { ncm_code: "6104.43.00", title: "[Cap. 61] Vestido de fibras sintéticas, de punto" }
    );
  }
  if (/\b(camisa\w*|blusa\w*)\b/.test(text)) {
    seeds.push(
      { ncm_code: "6205.20.00", title: "[Cap. 62] Camisa de hombre, algodón (tejido plano)" },
      { ncm_code: "6206.30.00", title: "[Cap. 62] Camisa/blusa de mujer, algodón (tejido plano)" }
    );
  }
  if (/\b(ropa\s+interior|boxer\w*|calzoncillo\w*|bombacha\w*|cal[zs][oó]n\w*|lencer[ií]a)\b/.test(text)) {
    seeds.push(
      { ncm_code: "6107.11.00", title: "[Cap. 61] Ropa interior de hombre, algodón, de punto" },
      { ncm_code: "6108.21.00", title: "[Cap. 61] Ropa interior de mujer, algodón, de punto" }
    );
  }
  if (/\b(corpi[ñn]o\w*|sost[eé]n\w*|brassiere\w*|\bbra\b|corpi[ñn]os)\b/.test(text)) {
    seeds.push({ ncm_code: "6212.10.00", title: "[Cap. 62] Corpiño/sostén" });
  }
  if (/\b(medias\w*|pantimedias\w*|calcetines\w*|soquetes\w*)\b/.test(text)) {
    seeds.push(
      { ncm_code: "6115.95.00", title: "[Cap. 61] Medias/calcetines de algodón, de punto" },
      { ncm_code: "6115.96.00", title: "[Cap. 61] Medias/calcetines de fibras sintéticas, de punto" }
    );
  }
  if (/\b(pollera\w*|falda\w*)\b/.test(text)) {
    seeds.push(
      { ncm_code: "6204.52.00", title: "[Cap. 62] Pollera/falda de algodón (tejido plano)" },
      { ncm_code: "6104.52.00", title: "[Cap. 61] Pollera/falda de algodón, de punto" }
    );
  }
  if (/\b(traje\w*\s+de\s+ba[ñn]o|mall[ao]\w*\s+de\s+ba[ñn]o|ba[ñn]ador\w*|bikini\w*|short\w*\s+de\s+ba[ñn]o)\b/.test(text)) {
    seeds.push(
      { ncm_code: "6211.11.00", title: "[Cap. 62] Traje/malla de baño de hombre" },
      { ncm_code: "6211.12.00", title: "[Cap. 62] Traje/malla de baño de mujer" }
    );
  } else if (/\b(traje\w*|ambo\w*|terno\w*|saco\w*\s+de\s+vestir|smoking\w*)\b/.test(text)) {
    seeds.push(
      { ncm_code: "6203.11.00", title: "[Cap. 62] Traje de hombre, lana (tejido plano)" },
      { ncm_code: "6203.12.00", title: "[Cap. 62] Traje de hombre, fibras sintéticas (tejido plano)" }
    );
  }
  if (/\b(gorra\w*|gorro\w*|sombrero\w*|cachucha\w*|vincha\w*)\b/.test(text)) {
    seeds.push(
      { ncm_code: "6505.00.90", title: "[Cap. 65] Gorra/gorro/sombrero de tejido" },
      { ncm_code: "6506.99.00", title: "[Cap. 65] Los demás tocados" }
    );
  }

  // ── Juguetes y juegos (cap. 95) — DI ~20% (el offline lo tiene 35%, viejo) ──
  if (/\b(juguete\w*|jugueter[ií]a|juego\w*\s+infantil\w*)\b/.test(text)) {
    seeds.push(
      { ncm_code: "9503.00.99", title: "[Cap. 95] Juguetes, los demás" },
      { ncm_code: "9503.00.21", title: "[Cap. 95] Muñecas/muñecos" },
      { ncm_code: "9503.00.97", title: "[Cap. 95] Bloques para armar / construcción" }
    );
  }
  if (/\b(lego\w*|bloques?\s+(para\s+)?armar|bloques?\s+de\s+construcci[oó]n|rasti\w*|mega\s*bloks?)\b/.test(text)) {
    seeds.push({ ncm_code: "9503.00.97", title: "[Cap. 95] Bloques para armar (tipo Lego)" });
  }
  if (/\b(mu[ñn]eca\w*|mu[ñn]eco\w*|barbie\w*|figura\w*\s+de\s+acci[oó]n|action\s*figure\w*)\b/.test(text)) {
    seeds.push({ ncm_code: "9503.00.21", title: "[Cap. 95] Muñeca/muñeco" });
  }
  if (/\b(peluche\w*|mu[ñn]eco\w*\s+de\s+peluche|oso\s+de\s+peluche)\b/.test(text)) {
    seeds.push({ ncm_code: "9503.00.40", title: "[Cap. 95] Juguete de peluche (animales rellenos)" });
  }
  if (/\b(pelota\w*|bal[oó]n\w*)\b/.test(text) && /\b(f[uú]tbol|basket|b[aá]squet|v[oó]ley|handball|deporte\w*|rugby)\b/.test(text)) {
    seeds.push(
      { ncm_code: "9506.62.00", title: "[Cap. 95] Pelota inflable (fútbol, básquet, vóley)" },
      { ncm_code: "9506.69.00", title: "[Cap. 95] Las demás pelotas" }
    );
  }
  if (/\b(rompecabezas\w*|puzzle\w*|quebra\s*cabezas?)\b/.test(text)) {
    seeds.push({ ncm_code: "9503.00.70", title: "[Cap. 95] Rompecabezas (puzzles)" });
  }
  if (/\b(consola\w*\s+(de\s+)?(videojuego\w*|juego\w*|gaming)|playstation\w*|\bps[45]\b|xbox\w*|nintendo\w*|\bswitch\b|gameboy\w*)\b/.test(text)) {
    seeds.push({ ncm_code: "9504.50.00", title: "[Cap. 95] Consola de videojuegos" });
  }

  // ── Electrónica que el índice viejo no tiene (HS-2022) ─────────────────────
  if (/\b(tablet\w*|ipad\w*|tableta\w*)\b/.test(text) && !/\b(chocolate\w*|comprimid\w*|pastilla\w*|gr[aá]fica)\b/.test(text)) {
    seeds.push({ ncm_code: "8471.30.12", title: "[Cap. 84] Tablet / iPad (máquina portátil de datos)" });
  }
  if (/\b(mouse\w*|rat[oó]n\s+(inal[aá]mbric|[oó]ptic|de\s+computad|usb))\b/.test(text)) {
    seeds.push({ ncm_code: "8471.60.53", title: "[Cap. 84] Mouse (unidad de entrada)" });
  }
  if (/\b(teclado\w*)\b/.test(text) && /\b(usb|inal[aá]mbric\w*|mec[aá]nic\w*|\bpc\b|computad\w*|gamer)\b/.test(text)) {
    seeds.push({ ncm_code: "8471.60.52", title: "[Cap. 84] Teclado de computadora (unidad de entrada)" });
  }
  if (/\b(disco\s+(ssd|s[oó]lido|r[ií]gido|duro|externo)|\bssd\b|\bhdd\b|memoria\s+de\s+estado\s+s[oó]lido)\b/.test(text)) {
    seeds.push(
      { ncm_code: "8471.70.40", title: "[Cap. 84] Disco SSD / unidad de almacenamiento" },
      { ncm_code: "8471.70.90", title: "[Cap. 84] Las demás unidades de memoria" }
    );
  }
  if (/\b(drone\w*|dron\b|drones\w*|cuadric[oó]ptero\w*|cuadricoptero\w*)\b/.test(text)) {
    seeds.push(
      { ncm_code: "8806.10.00", title: "[Cap. 88] Drone (aeronave no tripulada)" },
      { ncm_code: "9503.00.99", title: "[Cap. 95] Drone de juguete (si es de juguete)" }
    );
  }

  // ── Cosmética y cuidado personal (cap. 33) — DI ~18% ───────────────────────
  if (/\b(maquillaje\w*|m[aá]scara\w*\s+de\s+pesta[ñn]as|rimmel\w*|sombra\w*\s+de\s+ojos|labial\w*|rubor\w*|base\w*\s+de\s+maquillaje|corrector\w*)\b/.test(text)) {
    seeds.push(
      { ncm_code: "3304.91.00", title: "[Cap. 33] Maquillaje facial (polvos, base, rubor)" },
      { ncm_code: "3304.20.90", title: "[Cap. 33] Maquillaje de ojos" },
      { ncm_code: "3304.10.00", title: "[Cap. 33] Maquillaje de labios" }
    );
  }
  if (/\b(crema\w*\s+(facial|corporal|de\s+manos|hidratante|antiarrugas|para\s+la\s+piel)|skincare|s[eé]rum\w*|loci[oó]n\w*\s+corporal)\b/.test(text)) {
    seeds.push({ ncm_code: "3304.99.10", title: "[Cap. 33] Crema facial / cuidado de la piel" });
  }
  if (/\b(shampoo\w*|champ[uú]\w*|acondicionador\w*\s+(de\s+)?(pelo|cabello))\b/.test(text)) {
    seeds.push({ ncm_code: "3305.10.00", title: "[Cap. 33] Shampoo / preparación para el cabello" });
  }
  if (/\b(protector\w*\s+solar|bloqueador\w*\s+solar|pantalla\w*\s+solar|bronceador\w*)\b/.test(text)) {
    seeds.push({ ncm_code: "3304.99.90", title: "[Cap. 33] Protector solar / bronceador" });
  }

  // ── Hogar / accesorios frecuentes ──────────────────────────────────────────
  if (/\b(colch[oó]n\w*)\b/.test(text)) {
    seeds.push(
      { ncm_code: "9404.21.00", title: "[Cap. 94] Colchón de caucho/plástico celular" },
      { ncm_code: "9404.29.00", title: "[Cap. 94] Colchón de otras materias" }
    );
  }
  if (/\b(s[aá]bana\w*|ropa\s+de\s+cama|juego\s+de\s+cama|acolchad\w*|cubrecama\w*)\b/.test(text)) {
    seeds.push({ ncm_code: "6302.31.00", title: "[Cap. 63] Ropa de cama (sábanas) de algodón" });
  }
  if (/\b(toalla\w*|toall[oó]n\w*)\b/.test(text)) {
    seeds.push({ ncm_code: "6302.60.00", title: "[Cap. 63] Toallas de algodón (felpa)" });
  }
  if (/\b(anteojos?\s+de\s+sol|gafas?\s+de\s+sol|lentes?\s+de\s+sol)\b/.test(text)) {
    seeds.push({ ncm_code: "9004.10.00", title: "[Cap. 90] Anteojos de sol" });
  }
  if (/\b(reloj\w*\s+(pulsera|de\s+pulsera|inteligente|smartwatch)|smartwatch\w*|smart\s*watch\w*)\b/.test(text)) {
    seeds.push(
      { ncm_code: "9102.12.00", title: "[Cap. 91] Reloj de pulsera con indicador optoelectrónico (smartwatch)" },
      { ncm_code: "9102.19.00", title: "[Cap. 91] Los demás relojes de pulsera, eléctricos" }
    );
  }

  // ── Más bienes de consumo / industria (códigos HS estándar) ────────────────
  // Monitor de PC → 8528.52 (apto para conectarse a una máquina de datos)
  if (/\bmonitor\w*\b/.test(text) && !/\b(card[ií]aco|presi[oó]n|beb[eé]|fetal)\b/.test(text)) {
    seeds.push({ ncm_code: "8528.52.00", title: "[Cap. 85] Monitor para computadora (apto para conectar a ADP)" });
  }
  // Cámara fotográfica / de seguridad → 8525.8x (HS-2022)
  if (/\b(c[aá]mara\w*\s+(de\s+)?(foto\w*|fotogr[aá]f\w*|digital|de\s+seguridad|ip\b|web|vigilancia)|webcam\w*|c[aá]mara\s+r[eé]flex|\bdslr\b|cctv)\b/.test(text)) {
    seeds.push({ ncm_code: "8525.89.00", title: "[Cap. 85] Cámara fotográfica / de televisión (digital)" });
  }
  // Router / módem / access point → 8517.62
  if (/\b(router\w*|enrutador\w*|m[oó]dem\w*|access\s*point|repetidor\w*\s+wifi)\b/.test(text)) {
    seeds.push({ ncm_code: "8517.62.55", title: "[Cap. 85] Router / módem (aparato de telecomunicación)" });
  }
  // Casco (moto / seguridad) → 6506.10
  if (/\bcasco\w*\b/.test(text) && !/\b(buque|barco|naval|botella)\b/.test(text)) {
    seeds.push({ ncm_code: "6506.10.00", title: "[Cap. 65] Casco de seguridad (moto, industrial)" });
  }
  // Batería / acumulador de auto → 8507
  if (/\b(bater[ií]a\w*|acumulador\w*)\b/.test(text) && /\b(auto\w*|veh[ií]cul\w*|plomo|[aá]cido|arranque|12\s*v|gel\b)\b/.test(text)) {
    seeds.push(
      { ncm_code: "8507.10.00", title: "[Cap. 85] Acumulador de plomo para arranque (batería de auto)" },
      { ncm_code: "8507.20.00", title: "[Cap. 85] Los demás acumuladores de plomo" }
    );
  } else if (/\b(power\s*bank\w*|powerbank\w*|bater[ií]a\w*\s+(de\s+litio|port[aá]til|externa))\b/.test(text)) {
    seeds.push({ ncm_code: "8507.60.00", title: "[Cap. 85] Batería de litio / power bank" });
  }
  // Olla / sartén / cacerola / batería de cocina → 7323 (acero) / 7615 (aluminio)
  if (/\b(olla\w*|sart[eé]n\w*|cacerola\w*|cacerol\w*|bater[ií]a\w*\s+de\s+cocina|pava\b(?!\s+el)|wok\b)\b/.test(text)) {
    seeds.push(
      { ncm_code: "7323.93.00", title: "[Cap. 73] Olla/sartén de acero inoxidable" },
      { ncm_code: "7615.10.00", title: "[Cap. 76] Olla/sartén de aluminio" }
    );
  }
  // Vajilla / platos / tazas de cerámica o porcelana → 6911 / 6912
  if (/\b(vajilla\w*|plato\w*|taza\w*|pocillo\w*|fuente\w*\s+de\s+(loza|cer[aá]mic|porcelan))\b/.test(text) && /\b(cer[aá]mic\w*|porcelan\w*|loza\w*)\b/.test(text)) {
    seeds.push(
      { ncm_code: "6911.10.00", title: "[Cap. 69] Vajilla de porcelana" },
      { ncm_code: "6912.00.00", title: "[Cap. 69] Vajilla de otra cerámica" }
    );
  }
  // Cerámico / porcelanato / azulejo para piso o pared → 6907
  if (/\b(cer[aá]mic\w*\s+(para\s+)?(piso|pared|revestim)|porcelanato\w*|azulejo\w*|baldosa\w*\s+cer[aá]mic\w*|piso\w*\s+cer[aá]mic\w*)\b/.test(text)) {
    seeds.push(
      { ncm_code: "6907.21.00", title: "[Cap. 69] Baldosa/porcelanato cerámico para piso o pared" },
      { ncm_code: "6907.22.00", title: "[Cap. 69] Las demás placas cerámicas (absorción media)" }
    );
  }
  // Motor eléctrico → 8501
  if (/\bmotor\w*\s+(el[eé]ctric\w*|trif[aá]sic\w*|monof[aá]sic\w*|de\s+inducci[oó]n|asincr[oó]nic\w*)\b/.test(text)) {
    seeds.push(
      { ncm_code: "8501.52.00", title: "[Cap. 85] Motor eléctrico de CA, 750 W–75 kW" },
      { ncm_code: "8501.51.00", title: "[Cap. 85] Motor eléctrico de CA, hasta 750 W" }
    );
  }
  // Muebles (cap. 94): silla / mesa / placard / escritorio / mueble
  if (/\b(silla\w*|sill[oó]n\w*|butaca\w*|banqueta\w*)\b/.test(text) && !/\b(rueda\w*|ni[ñn]o\w*\s+para\s+auto|de\s+auto)\b/.test(text)) {
    seeds.push(
      { ncm_code: "9401.30.00", title: "[Cap. 94] Silla giratoria de altura ajustable" },
      { ncm_code: "9401.61.00", title: "[Cap. 94] Asiento con armazón de madera, tapizado" }
    );
  }
  if (/\b(mesa\w*|escritorio\w*|placard\w*|ropero\w*|c[oó]moda\w*|estanter[ií]a\w*|biblioteca\w*\s+mueble|mueble\w*)\b/.test(text)) {
    seeds.push(
      { ncm_code: "9403.30.00", title: "[Cap. 94] Mueble de madera para oficina" },
      { ncm_code: "9403.60.00", title: "[Cap. 94] Los demás muebles de madera" }
    );
  }
  // Bebidas alcohólicas (cap. 22)
  if (/\b(vino\w*)\b/.test(text) && !/\b(vinagre\w*|vinil\w*)\b/.test(text)) {
    seeds.push(
      { ncm_code: "2204.21.00", title: "[Cap. 22] Vino de uva en recipientes ≤ 2 L" },
      { ncm_code: "2204.10.10", title: "[Cap. 22] Vino espumoso (tipo champagne)" }
    );
  }
  if (/\b(cerveza\w*|birra\w*)\b/.test(text)) {
    seeds.push({ ncm_code: "2203.00.00", title: "[Cap. 22] Cerveza de malta" });
  }
  if (/\b(whisky\w*|whiskey\w*|vodka\w*|\bgin\b|ginebra\w*|\bron\b|tequila\w*|licor\w*|aperitivo\w*)\b/.test(text)) {
    seeds.push({ ncm_code: "2208.30.00", title: "[Cap. 22] Bebida espirituosa (whisky/gin/vodka/ron/licor)" });
  }
  // Dentífrico / pasta dental → 3306.10
  if (/\b(dent[ií]fric\w*|pasta\w*\s+dental|crema\w*\s+dental)\b/.test(text)) {
    seeds.push({ ncm_code: "3306.10.00", title: "[Cap. 33] Dentífrico / pasta dental" });
  }
  // Guantes textiles → 6116 (punto) / 6216 (plano)
  if (/\bguante\w*\b/.test(text) && !/\b(l[aá]tex|nitrilo|quir[uú]rgic\w*|descartabl\w*|seguridad\s+industrial|cuero\b)\b/.test(text)) {
    seeds.push(
      { ncm_code: "6116.93.00", title: "[Cap. 61] Guantes de fibras sintéticas, de punto" },
      { ncm_code: "6216.00.00", title: "[Cap. 62] Guantes textiles (tejido plano)" }
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
  // Mínimo bajo: "jean", "lego", "mouse", "tablet" deben disparar su semilla.
  if (q.length < 4) return null;

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
