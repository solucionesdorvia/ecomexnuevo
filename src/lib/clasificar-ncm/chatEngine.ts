import { openaiJson } from "@/lib/ai/openaiClient";
import { anthropicJson, anthropicAvailable } from "@/lib/ai/anthropicClient";
import { buildAmbiguityAssistantParagraph, type NormalizedAmbiguity } from "@/lib/clasificar-ncm/ncmAmbiguity";
import { runNcmMotor } from "@/lib/clasificar-ncm/runNcmMotor";
import { matchProductAnchor } from "@/lib/clasificar-ncm/commonProductAnchors";
import { ncmDigitsOnly, formatMercosurNcm8 } from "@/lib/ncm/knowledge/normalize";
import {
  formatImporterProfileForPrompt,
  type ImporterProfile,
} from "@/lib/importer/importerProfile";
import type { CaseSnapshot, ChatMessage, ProductType } from "./types";

/**
 * Detecta si el último mensaje del usuario contiene un código NCM completo
 * (6 u 8 dígitos, con o sin separadores). Devuelve el código normalizado a 8
 * dígitos formato Mercosur, o null si no hay uno claro.
 *
 * Requiere expresión de intención explícita ("es", "uso", "la", "código", etc.)
 * o que el código sea el único contenido del mensaje — así evitamos capturar
 * dígitos sueltos (teléfonos, cantidades) como si fueran NCM.
 */
function extractExplicitNcmFromMessage(text: string): string | null {
  // Sacar URLs ANTES de buscar dígitos: el ID de un aviso dentro de una URL
  // (p. ej. agroads .../detalle.asp?clasi=973242) NO es un NCM que el usuario
  // haya indicado. Sin esto, 973242 se devolvía formateado como "9732.42.00".
  const raw = text
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/www\.\S+/gi, " ")
    .trim();
  if (!raw) return null;

  const match = raw.match(/\b(\d{4}[.\s]?\d{2}[.\s]?\d{2}|\d{6,10})\b/);
  if (!match) return null;

  const digits = ncmDigitsOnly(match[1]);
  if (digits.length < 6 || digits.length > 10) return null;

  const lower = raw.toLowerCase();
  const isWholeMessage =
    raw === match[1] || raw.replace(/\s+/g, "") === match[1].replace(/\s+/g, "");
  // Un código con separadores tipo NCM (8703.10 / 8703.10.00) ya es señal fuerte;
  // dígitos "pelados" (973242, teléfonos, IDs, cantidades) son ambiguos y exigen
  // una palabra explícita (ncm/código/partida/posición) o que sean TODO el mensaje.
  const hasNcmSeparators = /\d{4}[.\s]\d{2}/.test(match[1]);
  const strongIntent = /\b(ncm|c[óo]digo|partida|posici[óo]n)\b/.test(lower);
  const softIntent =
    /\b(es|ser[íi]a|usar|usa|usemos|poner|pone|pond[eé]|cotiz[áa]|cotizar|con|bajo)\b/.test(lower);
  const hasIntent = isWholeMessage || strongIntent || (hasNcmSeparators && softIntent);
  if (!hasIntent) return null;

  return formatMercosurNcm8(digits.slice(0, 8));
}

/**
 * Extrae un único código NCM del mensaje del analista, si lo propuso con
 * confianza (una sola aparición + palabras tipo "podés usar", "clasifica como",
 * "va como", "ncm:").
 *
 * Sirve para evitar que el motor clasificador (IA paralela) devuelva candidatos
 * absurdos y los concatene a la respuesta del analista que ya cerró bien.
 */
function extractDecisiveNcmFromAnalyst(message: string): string | null {
  const text = message.trim();
  if (!text) return null;

  const matches = Array.from(text.matchAll(/\b(\d{4}[.\s]?\d{2}[.\s]?\d{2}|\d{8})\b/g));
  if (matches.length !== 1) return null;

  const raw = matches[0][1];
  const digits = ncmDigitsOnly(raw);
  if (digits.length !== 8) return null;

  const lower = text.toLowerCase();
  const hasCommit =
    /\b(ncm|pod[eé]s? usar|us[aá]|clasif\w+|va\s+(como|bajo|con)|partida|posici[óo]n|c[óo]digo\s+\d)/.test(
      lower
    );
  if (!hasCommit) return null;

  // Evitar si el analista expresa duda en la misma oración.
  const hasDoubt = /\b(duda|ambig|podr[íi]a ser|o bien|entre|depende)\b/.test(lower);
  if (hasDoubt) return null;

  return formatMercosurNcm8(digits);
}

const CLASSIFY_TIMEOUT_MS = Number(process.env.NCM_CHAT_CLASSIFY_TIMEOUT_MS) || 15_000;

/** En la UI /clasificarncm priorizamos latencia: motor en modo rápido salvo env. */
const CLASIFICAR_CHAT_USE_FULL_MOTOR_PIPELINE =
  process.env.NCM_CLASIFICAR_CHAT_USE_FULL_PIPELINE === "1";

const CLASIFICAR_CLASSIFY_TIMEOUT_MS =
  Number(process.env.NCM_CLASIFICAR_CLASSIFY_TIMEOUT_MS) || CLASSIFY_TIMEOUT_MS;

const CLASIFICAR_ANALYST_TIMEOUT_MS =
  Number(process.env.NCM_CLASIFICAR_ANALYST_TIMEOUT_MS) ||
  Number(process.env.NCM_CHAT_ANALYST_TIMEOUT_MS) ||
  // 25s: el analista suele responder en 2-5s, pero con links (scrape previo) o
  // payloads grandes a veces se acerca al límite. 12s abortaba de más; este techo
  // casi nunca se toca, solo evita el error transitorio.
  25_000;

/** Respuesta más rápida: últimos turnos y tope de caractereres para el analista. */
function truncateTranscript(messages: ChatMessage[], maxMessages = 24, maxChars = 12_000): string {
  const recent = messages.slice(-maxMessages);
  const parts: string[] = [];
  let total = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    const m = recent[i]!;
    const line = `${m.role === "user" ? "Usuario" : "Analista"}: ${m.content}`;
    if (total + line.length + 2 > maxChars) break;
    parts.unshift(line);
    total += line.length + 2;
  }
  return parts.join("\n\n");
}

/**
 * Extrae FOB unitario (USD), cantidad y origen del texto libre del usuario.
 * Heurísticas simples; se usa como complemento del analista IA (si éste no
 * pobló `purchase`, acá lo rescatamos).
 */
function extractPurchaseFromText(text: string): {
  fobUnitUsd?: number;
  quantity?: number;
  origin?: string;
} {
  const t = (text || "").toLowerCase();
  if (!t) return {};

  // Precio: "USD 1.200", "usd1200", "1200 usd", "u$s 200", "$ 50"
  let fobUnitUsd: number | undefined;
  const fobPatterns: RegExp[] = [
    /(?:usd|u\$s|us\$|\$)\s*([\d]+(?:[.,]\d{1,3})*)/i,
    /([\d]+(?:[.,]\d{1,3})*)\s*(?:usd|u\$s|us\$|d[oó]lares)/i,
  ];
  for (const re of fobPatterns) {
    const m = t.match(re);
    if (m) {
      const raw = m[1];
      const normalized = raw.includes(",")
        ? raw.replace(/\./g, "").replace(",", ".")
        : raw.replace(/\.(?=\d{3}(?:\D|$))/g, "");
      const n = Number(normalized);
      if (Number.isFinite(n) && n > 0) {
        fobUnitUsd = n;
        break;
      }
    }
  }

  // Cantidad: "500 unidades", "100 u", "2 pzs", "1 unidad", "1 solo", "uno solo",
  //           "una sola", "solo uno", "nada más uno", etc.
  let quantity: number | undefined;
  const qtyMatch = t.match(
    /\b(\d+(?:[.,]\d+)?)\s*(?:unidad(?:es)?|u\b|pzs?|piezas?|uds?|items?)/
  );
  if (qtyMatch) {
    const n = Number(qtyMatch[1].replace(",", "."));
    if (Number.isFinite(n) && n > 0) quantity = Math.max(1, Math.floor(n));
  } else if (
    /\b(?:un[ao]?\s+sol[ao]|1\s+sol[ao]|uno\s+solo|una\s+sola|una\s+unidad|un[ao]?\s+unidad|1\s+unidad|sol[ao]\s+(?:1|un[ao]?|uno|una)|nada\s+m[áa]s\s+(?:1|un[ao]?|uno|una)|un[ao]?\s+(?:y\s+)?nada\s+m[áa]s|un[ao]?\s+ún?ic[ao])\b/.test(t)
  ) {
    quantity = 1;
  }

  // Origen
  const origins: Array<{ re: RegExp; name: string }> = [
    { re: /\b(china|chino|chn)\b/, name: "China" },
    { re: /\b(usa|ee\.?uu\.?|eeuu|estados\s+unidos|america)\b/, name: "Estados Unidos" },
    { re: /\bbrasil\b/, name: "Brasil" },
    { re: /\bespa[ñn]a\b/, name: "España" },
    { re: /\bitalia\b/, name: "Italia" },
    { re: /\balemania\b/, name: "Alemania" },
    { re: /\bm[eé]xico\b/, name: "México" },
    { re: /\b(uruguay|uy)\b/, name: "Uruguay" },
    { re: /\b(paraguay|py)\b/, name: "Paraguay" },
    { re: /\b(chile|cl)\b/, name: "Chile" },
    { re: /\b(peru|pe)\b/, name: "Perú" },
    { re: /\b(colombia|co)\b/, name: "Colombia" },
    { re: /\bjap[oó]n\b/, name: "Japón" },
    { re: /\bcorea( del sur)?\b/, name: "Corea del Sur" },
    { re: /\btaiw[aá]n\b/, name: "Taiwán" },
    { re: /\bturqu[ií]a\b/, name: "Turquía" },
    { re: /\bhong\s*kong\b/, name: "Hong Kong" },
    { re: /\bvietnam\b/, name: "Vietnam" },
    { re: /\bindia\b/, name: "India" },
  ];
  let origin: string | undefined;
  for (const { re, name } of origins) {
    if (re.test(t)) {
      origin = name;
      break;
    }
  }

  return { fobUnitUsd, quantity, origin };
}

/**
 * Detecta intención explícita del usuario de cerrar el cuestionario y avanzar
 * al presupuesto (frases como "calculalo", "listo", "dale", "avanzá",
 * "ya tengo todo", "dame el presupuesto", etc.).
 *
 * Esto sirve como override cuando el LLM analista insiste en preguntar
 * confirmaciones aunque ya tengamos FOB + cantidad + origen.
 */
function detectClosureIntent(text: string): boolean {
  const t = (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  if (!t) return false;

  const patterns: RegExp[] = [
    /\bcalcul(?:al?[ao]|emos|a)\b/, // calculalo, calculá, calculemos
    /\bavanz[ae]?(?:mos|l[ao])?\b/, // avanza, avancemos, avanzalo
    /\b(?:dale|listo|adelante|vamos)\b/, // dale, listo, adelante, vamos
    /\b(?:hac|hag)[ea]m[oa]sl?[oa]\b/, // hagamoslo, haceloesto
    /\bproced[ea]/, // procedé, procede, procedamos
    /\bcontinu[ao]\b/, // continuá, continúa
    /\bcerr[ae]l?[ao]\b/, // cerralo, cerrar
    /\bgener[ae]l?[ao]\b/, // generalo, genera
    /\bsacal[ao]\b/, // sacalo, sacala
    /\bsegui\b/, // seguí
    /\bya (?:lo )?ten[ge]o(?: todo)?\b/, // ya lo tengo, ya tengo todo
    /\bquiero (?:el|mi|ver) (?:el )?presupuesto\b/,
    /\bdame (?:el|un|mi) presupuesto\b/,
    /\bpresupuestal?[ao]\b/, // presupuestalo
    /\bcotizal?[ao]\b/, // cotizalo, cotizá
    // Frases de frustración / "y entonces":
    /\bsin (?:darme|dar(?:le|me|se)?|el presupuesto)\b/, // "asi queda sin darme el presupuesto"
    /\bno (?:me )?(?:da[sn]?|sale|aparece|sigue|llega)\b/, // "no me da", "no sale"
    /\bque (?:pas[oóa]|hay|onda)\b/, // "que pasa", "que hay"
    /\bmostr[áa](?:me)?l?[oa]\b/, // mostrame, mostralo
    /\bd[áa](?:me)?(?:lo|melo)?\b/, // dame, damelo
    /\bya[\s,!]/, // "ya," / "ya!" como urgencia (pero no "ya lo tengo" que ya está cubierto)
  ];
  return patterns.some((re) => re.test(t));
}

/**
 * Elimina del texto cualquier código NCM (formatos XXXX.XX.XX, XXXXXXXX,
 * "cap. NN", "capítulo NN", "partida NNNN") para evitar que el usuario final
 * vea jerga aduanera. Defensa contra prompts que el modelo ignore.
 */
function stripNcmCodes(input: string): string {
  if (!input) return input;
  let out = input;
  // Patrones típicos: 8471.30.00, 9506.91.00.139W, 84.71.30, 85287200.
  out = out.replace(/\b\d{2,4}[.\s]\d{2}[.\s]\d{2}(?:[.\s]?\d{0,3}[A-Za-z]?)?\b/g, "—");
  // Código de 6 dígitos (partida.subpartida, ej. 8429.51) — NO precedido por
  // $/decimales para no romper montos.
  out = out.replace(/(?<![\$\d.,])\b\d{4}[.\s]\d{2}\b(?![.\s]?\d)/g, "—");
  // 8 dígitos corridos, pero NO montos (no preceded by $ or decimales).
  out = out.replace(/(?<![\$\d.,])\b\d{8}\b(?!\s*[\.,]?\d)/g, "—");
  // Menciones textuales de jerga.
  out = out.replace(/\b(cap\.?|cap[ií]tulo)\s+\d{2,4}\b/gi, "");
  out = out.replace(/\bpartida\s+\d{4}\b/gi, "");
  out = out.replace(/\bsubpartida\s+[\d.]+\b/gi, "");
  out = out.replace(/\bNCM\s*[:\-]?\s*[\d.]*\b/g, "");
  // Limpia dobles espacios y líneas vacías sobrantes.
  out = out.replace(/ {2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return out;
}

/**
 * Preguntas "meta" que el modelo dirige al SISTEMA, no al importador (fuga de
 * la mecánica interna: pedir habilitar candidatos, jerga del nomenclador, etc.).
 * Nunca deben mostrarse en la UI. Ej. real: "¿Pueden habilitar candidatos del
 * (8429.51/8429.52) para clasificar la retroexcavadora?".
 */
const META_QUESTION_RE =
  /\b(habilit\w+|candidat\w+|nomenclador|subpartida|posici[oó]n\s+arancelaria|para\s+clasificar)\b/i;

/**
 * Limpia preguntas antes de mostrarlas al usuario: saca códigos NCM/jerga,
 * descarta vacías, las que quedan con "—" (tenían un código) y las meta.
 */
function cleanUserFacingQuestions(qs: unknown): string[] {
  if (!Array.isArray(qs)) return [];
  return qs
    .map((q) => stripNcmCodes(String(q ?? "")).trim())
    .filter((q) => q.length > 0 && !q.includes("—") && !META_QUESTION_RE.test(q))
    .slice(0, 3);
}

export function buildTechnicalDescription(messages: ChatMessage[], snap: CaseSnapshot): string {
  const userLines = messages.filter((m) => m.role === "user").map((m) => m.content.trim()).filter(Boolean);
  const parts: string[] = [];
  if (snap.productName) parts.push(`Denominación comercial / producto: ${snap.productName}`);
  if (snap.technicalName) parts.push(`Denominación técnica: ${snap.technicalName}`);
  if (snap.mainFunction) parts.push(`Función principal: ${snap.mainFunction}`);
  if (snap.materials?.length) parts.push(`Materiales / composición: ${snap.materials.join(", ")}`);
  if (snap.use) parts.push(`Uso / aplicación: ${snap.use}`);
  if (snap.powerSource) parts.push(`Alimentación / energía: ${snap.powerSource}`);
  if (snap.productType && snap.productType !== "unknown") parts.push(`Tipo (final/parte/accesorio): ${snap.productType}`);
  if (snap.industry) parts.push(`Sector / industria: ${snap.industry}`);
  if (userLines.length) parts.push(`Historial del importador:\n${userLines.join("\n")}`);
  return parts.join("\n").trim() || userLines.join("\n");
}

const ANALYST_SYSTEM = `Sos un asesor de importaciones. Tu trabajo es armar el presupuesto de traer un producto a Argentina lo más rápido posible.

=== FILOSOFÍA: INFERIR PRIMERO, PREGUNTAR SOLO SI ES IMPOSIBLE ===

**Antes de hacer cualquier pregunta, intentá clasificar el producto con lo que ya tenés.**
Si la función del producto es clara por su nombre, descripción, marca o modelo → clasificá directamente, marcá 'ready_to_run_classifier: true' y pedí solo los datos comerciales que falten.

Solo preguntás cuando existen **dos o más partidas arancelarias realmente distintas** que requieren un dato específico para elegir entre ellas. Ese dato debe ser la única razón para preguntar.

**Nunca preguntes por:**
- Material del producto (salvo que el material sea LO ÚNICO que distingue dos partidas, ej: envase de vidrio vs plástico)
- Marca, modelo, especificaciones técnicas que no cambian la categoría
- Información que ya se puede inferir del nombre o contexto
- Cosas que no afectan los impuestos

=== REGLA CRÍTICA: PROHIBIDO ===

No menciones nunca: códigos NCM, partidas, subpartidas, capítulos HS, Mercosur, GIR, RGI, encuadre, nomenclador, posición arancelaria. La clasificación es trabajo interno tuyo.

=== CUÁNDO NO PREGUNTAR NADA ===

Si el producto tiene función inequívoca → clasificá y pasá directo a pedir precio/cantidad/origen si faltan:
- Cualquier electrónica de consumo (laptops, phones, tablets, auriculares, cargadores, cables, cámaras, consolas, monitores, etc.)
- Ropa y textiles (remeras, pantalones, zapatillas, etc.)
- Alimentos envasados con marca/descripción clara
- Herramientas con uso claro (taladro, sierra, llave inglesa, etc.)
- Vehículos con marca y modelo conocido
- Muebles con descripción clara
- Cualquier producto cuya categoría no tenga subpartidas que dependan de un dato que el usuario no dio

=== CUÁNDO SÍ PREGUNTAR (GENUINA AMBIGÜEDAD) ===

Solo si el producto puede encuadrar en dos categorías con **aranceles diferentes** y no hay forma de inferirlo:
- Una bomba: ¿industrial o doméstica? (cambian los aranceles realmente)
- Un motor: ¿eléctrico o combustión interna?
- Un envase: ¿vidrio o plástico?
- Un tejido: ¿sintético o natural?

En ese caso, **una sola pregunta**, enmarcada en términos del presupuesto: "Para darte el costo exacto, ¿la bomba es para uso doméstico o industrial?"

=== ENTRADAS: LINK, EXCEL, PDF, FOTO ===

El usuario puede mandar el producto como link de publicación, planilla Excel, PDF del proveedor o foto. El sistema te lo agrega al mensaje:
- **[PRODUCTO DEL LINK] / texto de factura o catálogo**: usá ese título y precio como el producto a clasificar. No vuelvas a pedir el nombre.
- **[LINK NO LEÍDO]**: no se pudo abrir el link. Decile en una línea que no pudiste acceder al link y pedile **una foto/captura del producto y su nombre**. NO inventes ni clasifiques el producto hasta que te lo mande (ready_to_run_classifier: false).

=== DATOS COMERCIALES (OBLIGATORIOS — NO SUPONER) ===

Necesitás exactamente estos 3 datos para cotizar:
1. Precio FOB unitario en USD
2. Cantidad de unidades a importar
3. País o región de origen

**REGLA DE EXTRACCIÓN — MUY IMPORTANTE:**
Si el usuario escribió cualquiera de estos datos en su mensaje → **extraelos directamente sin preguntar**.
Ejemplos de datos ya confirmados:
- "1 unidad" / "1 unit" / "una unidad" → quantity: 1 ✓
- "50 pares" / "100 unidades" → quantity: 50 / 100 ✓
- "desde China" / "desde EE.UU." → origin ✓
- "USD 1200" / "precio FOB 800" → fob_unit_usd ✓

Solo preguntás por un dato si el usuario **no lo mencionó en ningún momento** de la conversación.
Si **alguno falta** → pediselos en UNA SOLA pregunta, todos juntos: "¿Cuánto sale cada uno en dólares, cuántos vas a traer y de qué país?"
**NO marques ready_to_run_classifier: true hasta tener los 3 datos.**
**NUNCA le preguntes algo que ya te dijo.**

=== ESTILO ===

- Directo. 1-2 líneas máximo.
- Una sola pregunta por turno, nunca más.
- Sin preámbulos ("Con la información provista…", "Procedamos a…"). Arrancá de una.
- Tono del usuario: si es casual → casual. Si es técnico → técnico.

=== RESPUESTA (SOLO JSON) ===

{
  "assistant_message": "1-2 líneas máximo. Sin códigos ni jerga aduanera.",
  "product_name": "string | null",
  "technical_name": "string | null",
  "main_function": "string | null",
  "materials": ["string"],
  "use": "string | null",
  "power_source": "string | null",
  "product_type": "final" | "part" | "accessory" | "unknown",
  "industry": "string | null",
  "missing_critical_data": ["string"],
  "questions_next": ["máximo 1 pregunta, solo si hay ambigüedad real de partida. Si no hay ambigüedad: array vacío []"],
  "purchase": {
    "fob_unit_usd": number | null,
    "quantity": number | null,
    "origin": "string | null"
  },
  "ready_to_run_classifier": boolean,
  "classification_rationale_draft": "string | null (uso interno)"
}`;

type AnalystJson = {
  assistant_message?: string;
  product_name?: string | null;
  technical_name?: string | null;
  main_function?: string | null;
  materials?: string[];
  use?: string | null;
  power_source?: string | null;
  product_type?: string | null;
  industry?: string | null;
  missing_critical_data?: string[];
  questions_next?: string[];
  purchase?: {
    fob_unit_usd?: number | null;
    quantity?: number | null;
    origin?: string | null;
  } | null;
  ready_to_run_classifier?: boolean;
  classification_rationale_draft?: string | null;
};

function pickFiniteNumber(next: number | null | undefined, prev: number | undefined): number | undefined {
  if (typeof next === "number" && Number.isFinite(next) && next > 0) return next;
  return prev;
}

function pickNonEmptyString(next: string | null | undefined, prev: string | undefined): string | undefined {
  const t = typeof next === "string" ? next.trim() : "";
  return t.length > 0 ? t : prev;
}

function mergeSnapshot(prev: CaseSnapshot, a: AnalystJson): CaseSnapshot {
  const pt = (a.product_type ?? prev.productType) as ProductType | undefined;
  const productType: ProductType =
    pt === "final" || pt === "part" || pt === "accessory" ? pt : prev.productType ?? "unknown";

  const mergedPurchase = {
    fobUnitUsd: pickFiniteNumber(a.purchase?.fob_unit_usd ?? null, prev.purchase?.fobUnitUsd),
    quantity: pickFiniteNumber(a.purchase?.quantity ?? null, prev.purchase?.quantity),
    origin: pickNonEmptyString(a.purchase?.origin ?? null, prev.purchase?.origin),
  };
  const purchase =
    mergedPurchase.fobUnitUsd !== undefined ||
    mergedPurchase.quantity !== undefined ||
    mergedPurchase.origin !== undefined
      ? mergedPurchase
      : undefined;

  return {
    ...prev,
    productName: a.product_name ?? prev.productName,
    technicalName: a.technical_name ?? prev.technicalName,
    mainFunction: a.main_function ?? prev.mainFunction,
    materials: Array.isArray(a.materials) && a.materials.length ? a.materials : prev.materials,
    use: a.use ?? prev.use,
    powerSource: a.power_source ?? prev.powerSource,
    productType,
    industry: a.industry ?? prev.industry,
    missingCriticalData: Array.isArray(a.missing_critical_data)
      ? a.missing_critical_data
      : prev.missingCriticalData,
    classificationRationale: a.classification_rationale_draft ?? prev.classificationRationale,
    purchase,
  };
}

export async function processClasificarTurn(opts: {
  messages: ChatMessage[];
  snapshot: CaseSnapshot;
  /** Perfil del importador logueado, inyectado al contexto del analista (Fase 0.b). */
  importerProfile?: ImporterProfile | null;
}): Promise<{ assistantMessage: string; snapshot: CaseSnapshot }> {
  const { messages, snapshot: prev, importerProfile } = opts;

  // Bloque de contexto del importador para que el bot no re-pregunte su perfil.
  const profileBlock = formatImporterProfileForPrompt(importerProfile);
  const analystSystem = profileBlock ? `${ANALYST_SYSTEM}\n\n${profileBlock}` : ANALYST_SYSTEM;

  /**
   * Short-circuit: si el usuario explicita un NCM en el último mensaje
   * (ej. "es 8516.10.00"), lo aceptamos como decisión y cerramos sin repreguntar.
   */
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const explicitNcm = extractExplicitNcmFromMessage(lastUser);
  if (explicitNcm) {
    const reused = prev.candidates?.find((c) => ncmDigitsOnly(c.code) === ncmDigitsOnly(explicitNcm));
    const confidence = reused?.confidence ?? 0.7;
    const rationale =
      reused?.description ||
      prev.classificationRationale ||
      "Clasificación confirmada por el usuario.";

    const snap: CaseSnapshot = {
      ...prev,
      recommendedNcm: explicitNcm,
      confidence,
      classificationRationale: rationale,
      status: "resolved",
      pendingQuestions: undefined,
      ambiguity: undefined,
      missingCriticalData: undefined,
      errorMessage: undefined,
    };

    return {
      assistantMessage: `Listo. Clasifico con **${explicitNcm}** según tu indicación.`,
      snapshot: snap,
    };
  }

  const transcript = truncateTranscript(messages);

  const stateJson = JSON.stringify(
    {
      productName: prev.productName,
      technicalName: prev.technicalName,
      mainFunction: prev.mainFunction,
      materials: prev.materials,
      use: prev.use,
      powerSource: prev.powerSource,
      productType: prev.productType,
      industry: prev.industry,
      missingCriticalData: prev.missingCriticalData,
    },
    null,
    2
  );

  const userPayload = `CONVERSACIÓN:\n${transcript}\n\nESTADO_ACUMULADO_JSON:\n${stateJson}\n\nProcesá el último turno, actualizá el estado y redactá assistant_message.`;

  // Opciones del motor compartidas entre la llamada especulativa y la definitiva.
  const motorCallOptions = {
    preferFullPipeline: CLASIFICAR_CHAT_USE_FULL_MOTOR_PIPELINE,
    classifyOptions: {
      timeoutMs: CLASIFICAR_CLASSIFY_TIMEOUT_MS,
      model: process.env.NCM_CHAT_CLASSIFY_MODEL ?? (process.env.OPENAI_MODEL || "gpt-4o-mini"),
      skipNcmKnowledge:
        process.env.NCM_CHAT_SKIP_KNOWLEDGE === "1" || process.env.NCM_CHAT_SKIP_KNOWLEDGE === "true",
    },
  };

  /**
   * Motor especulativo: si el snapshot previo ya tiene datos del producto
   * (turnos posteriores al primero), lanzamos el motor en paralelo con el
   * analista usando los datos ya acumulados. Si el analista concluye que no
   * hay que correr el motor, el resultado se descarta silenciosamente.
   * En el primer turno (prev vacío) no hay suficiente información → no lo lanzamos.
   */
  type MotorResult = Awaited<ReturnType<typeof runNcmMotor>>;
  const speculativeTechText = buildTechnicalDescription(messages, prev);
  const canSpeculate = Boolean(
    (prev.productName || prev.mainFunction || prev.technicalName) &&
      speculativeTechText.length >= 30
  );
  const speculativeMotorPromise: Promise<MotorResult | null> = canSpeculate
    ? runNcmMotor({
        text: speculativeTechText,
        snapshot: prev,
        prevSnapshot: prev,
        messages,
        ...motorCallOptions,
      }).catch(() => null)
    : Promise.resolve(null);

  // Mensaje de error honesto del analista: distingue timeout (transitorio),
  // quota/saldo (recargar API) y otros. No culpa a la API key de entrada.
  const analystError = (e: unknown) => {
    const msg = e instanceof Error ? e.message : "Error al analizar.";
    const isTimeout = /abort|timed?\s*out|timeout|ETIMEDOUT/i.test(msg);
    const isQuota = /quota|billing|insufficient|exceeded|rate.?limit|\b429\b/i.test(msg);
    return {
      assistantMessage: isTimeout
        ? "Tardé demasiado en analizar el producto y corté la consulta. Probá de nuevo en unos segundos; si seguís con un link, mandame una foto o captura del producto con su nombre."
        : isQuota
          ? "El servicio de IA se quedó sin crédito por el momento. Reintentá en unos minutos; si persiste, hay que recargar el saldo de la API."
          : "No pude completar el análisis técnico. Reintentá en unos segundos.",
      snapshot: { ...prev, status: (isTimeout || isQuota ? "needs_info" : "error") as CaseSnapshot["status"], errorMessage: msg },
    };
  };

  // Analista: OpenAI primario; si falla (quota/caída/timeout) cae a Anthropic
  // para no tumbar todo el chat (el clasificador ya usa Anthropic por separado).
  const callAnthropicAnalyst = anthropicJson as unknown as (o: {
    system: string;
    user: string;
    timeoutMs?: number;
  }) => Promise<AnalystJson>;

  // Analista y clasificador usan el MISMO motor: Anthropic (Opus) primario.
  // OpenAI queda solo como respaldo si Anthropic no está disponible o falla.
  let analyst: AnalystJson;
  try {
    if (!anthropicAvailable()) throw new Error("ANTHROPIC_API_KEY no disponible");
    analyst = await callAnthropicAnalyst({
      system: analystSystem,
      user: userPayload,
      timeoutMs: CLASIFICAR_ANALYST_TIMEOUT_MS,
    });
  } catch (ePrimary) {
    try {
      analyst = await openaiJson<AnalystJson>({
        system: analystSystem,
        user: userPayload,
        model: process.env.NCM_CHAT_ANALYST_MODEL ?? (process.env.OPENAI_MODEL || "gpt-4o-mini"),
        timeoutMs: CLASIFICAR_ANALYST_TIMEOUT_MS,
      });
    } catch {
      return analystError(ePrimary);
    }
  }

  const snap = mergeSnapshot(prev, analyst);
  const assistantMessage = String(analyst.assistant_message ?? "").trim() || "Sin respuesta del modelo.";

  /**
   * Complemento heurístico: si el analista no extrajo los datos comerciales,
   * los parseamos del texto de todos los mensajes del usuario concatenados.
   * No pisamos lo que ya trajo el analista.
   */
  const fullUserText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" \n ");
  const heur = extractPurchaseFromText(fullUserText);
  if (heur.fobUnitUsd || heur.quantity || heur.origin) {
    const p = snap.purchase ?? {};
    snap.purchase = {
      fobUnitUsd: p.fobUnitUsd ?? heur.fobUnitUsd,
      quantity: p.quantity ?? heur.quantity,
      origin: p.origin ?? heur.origin,
    };
  }
  const questions = cleanUserFacingQuestions(analyst.questions_next);
  snap.pendingQuestions = questions.length ? questions : undefined;

  const ready = Boolean(analyst.ready_to_run_classifier);

  const techText = buildTechnicalDescription(messages, snap);
  snap.mergedTechnicalDescription = techText;

  /**
   * Datos comerciales completos: si ya tenemos FOB + cantidad + origen, podemos
   * avanzar al presupuesto aunque el analista todavía no haya puesto
   * ready_to_run_classifier: true (el modelo a veces lo olvida).
   */
  const dataComplete = Boolean(
    snap.purchase?.fobUnitUsd && snap.purchase?.quantity && snap.purchase?.origin
  );

  /**
   * Intención explícita del usuario de avanzar (último mensaje, p. ej.
   * "calculalo", "listo", "dale"). Si el usuario lo pidió explícitamente y
   * ya tenemos los datos comerciales, ignoramos las questions_next que el
   * LLM analista pueda seguir devolviendo (típicamente confirmaciones).
   */
  const lastUserMessage =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const userWantsToClose = detectClosureIntent(lastUserMessage);

  /**
   * Origen faltante: el LLM analista a veces "olvida" preguntar por el país
   * de origen y se queda confirmando datos parciales. Si tenemos FOB +
   * cantidad pero NO origen, forzamos una pregunta directa por el país en
   * lugar de delegar al LLM. Esto desbloquea conversaciones tipo:
   *   user: "silla de plastico" → "doméstico" → "una sola" → "2 dolares"
   *   analyst: "Listo, tengo toda la información..." (sin preguntar país)
   *   user: (frustrado, no avanza)
   */
  const hasFob = Boolean(snap.purchase?.fobUnitUsd);
  const hasQty = Boolean(snap.purchase?.quantity);
  const hasOrigin = Boolean(snap.purchase?.origin);
  if (hasFob && hasQty && !hasOrigin) {
    snap.status = "needs_info";
    snap.pendingQuestions = ["¿De qué país vas a importar?"];
    return {
      assistantMessage:
        "Solo me falta un dato para armar el presupuesto: ¿de qué país vas a importar? (ej. China, Italia, EE.UU., Brasil…)",
      snapshot: snap,
    };
  }

  /**
   * Ejecutar motor NCM si:
   *  (a) tenemos todos los datos comerciales (FOB + cantidad + origen) — esto
   *      es suficiente por sí solo, el analista ya hizo su trabajo,
   *  (b) o el analista marcó ready y no hay questions_next pendientes.
   *
   * La regla de oro: dataComplete es la señal definitiva. No importa que el
   * analista todavía devuelva ready=false o questions_next=[...]: cuando los
   * tres datos comerciales están disponibles, avanzamos al clasificador.
   */
  const runPipeline =
    techText.length >= 12 &&
    (dataComplete || (ready && questions.length === 0));

  if (!runPipeline) {
    // Cerramos como tentativo SÓLO si ya tenemos NCM + datos comerciales completos.
    // Sin NCM, el clasificador debe seguir corriendo aunque el usuario pida avanzar.
    if (dataComplete && snap.recommendedNcm && (questions.length === 0 || userWantsToClose)) {
      snap.status = "tentative";
      snap.pendingQuestions = undefined;
      snap.ambiguity = undefined;
      snap.confidence = Math.max(snap.confidence ?? 0, 0.5);
      return { assistantMessage, snapshot: snap };
    }
    snap.status = "needs_info";
    return { assistantMessage, snapshot: snap };
  }

  /**
   * Short-circuit: si el analista propuso un NCM de 8 dígitos de forma decisiva
   * en su mensaje, usamos ese. Evita que el motor clasificador corra y meta
   * ruido (candidatos de otros capítulos, ambigüedad irrelevante).
   */
  const analystNcm = extractDecisiveNcmFromAnalyst(assistantMessage);
  if (analystNcm) {
    snap.recommendedNcm = analystNcm;
    snap.confidence = Math.max(snap.confidence ?? 0, 0.8);
    snap.status = "resolved";
    snap.pendingQuestions = undefined;
    snap.ambiguity = undefined;
    snap.classificationRationale =
      analyst.classification_rationale_draft ?? snap.classificationRationale;
    return { assistantMessage, snapshot: snap };
  }

  try {
    /**
     * Usamos el motor especulativo si ya terminó (corrió en paralelo con el
     * analista). Si aún está en vuelo esperamos — siempre será menos tiempo
     * que arrancar desde cero. Si no se lanzó (primer turno o sin datos),
     * hacemos la llamada definitiva con el techText enriquecido por el analista.
     */
    const motor =
      (await speculativeMotorPromise) ??
      (await runNcmMotor({
        text: techText,
        snapshot: snap,
        prevSnapshot: prev,
        messages,
        ...motorCallOptions,
      }));

    const ncm = motor.ncm_code;
    const conf = motor.confidence;

    snap.candidates = motor.candidates.length ? motor.candidates : snap.candidates;
    snap.discardedNotes = motor.discardedNotes.length ? motor.discardedNotes : snap.discardedNotes;
    if (motor.discardedCandidates?.length) {
      snap.discardedCandidates = motor.discardedCandidates;
    }
    // Preservar el NCM previo si el motor no devolvió uno nuevo.
    // Sin esto, un turno donde el motor devuelve null borra el NCM ya clasificado.
    snap.recommendedNcm = ncm ?? snap.recommendedNcm;
    snap.confidence = ncm ? conf : (snap.confidence ?? conf);
    // Sanitizamos las questions del motor: pueden traer códigos, jerga o pedidos
    // meta al sistema (ej. "habilitar candidatos del 8429.51/8429.52"). El helper
    // saca códigos, descarta las que quedan con "—" y las meta.
    const motorQuestionsClean = cleanUserFacingQuestions(motor.questions);
    snap.pendingQuestions = motorQuestionsClean.length ? motorQuestionsClean : undefined;
    snap.ambiguity = motor.ambiguity;
    snap.classificationRationale =
      motor.rationale || snap.classificationRationale || analyst.classification_rationale_draft || undefined;

    if (motor.statusHint === "resolved" && snap.recommendedNcm) {
      snap.status = "resolved";
      snap.pendingQuestions = undefined;
      snap.ambiguity = undefined;
    } else if (snap.recommendedNcm) {
      // Tenemos NCM (del motor o del turno previo) aunque el hint no sea "resolved".
      snap.status = "tentative";
    } else {
      // El motor no fijó un código pero suele traer candidatos (el LLM es no
      // determinista y a veces no "elige" aunque tenga opciones claras). Adoptamos
      // el mejor candidato como TENTATIVO para que SIEMPRE haya una salida; la baja
      // confianza la marca el blindaje del costo. Solo si no hay NINGÚN candidato
      // quedamos en needs_info (y más abajo preguntamos).
      const topCandidate = (motor.candidates ?? [])
        .map((c) => (c?.code ?? "").trim())
        .find((c) => ncmDigitsOnly(c).length >= 6);
      if (topCandidate) {
        const d = ncmDigitsOnly(topCandidate);
        snap.recommendedNcm = d.length >= 8 ? formatMercosurNcm8(d) : topCandidate;
        snap.confidence = Math.min(snap.confidence ?? conf ?? 0.4, 0.45);
        snap.status = "tentative";
      } else {
        // Red de seguridad: producto frecuente conocido → posición canónica
        // verificada (smartphone, auriculares, heladera, etc.). Evita que un
        // común quede sin clasificar por la varianza del LLM.
        const anchor = matchProductAnchor(techText);
        if (anchor) {
          snap.recommendedNcm = anchor.ncm;
          snap.confidence = Math.max(snap.confidence ?? 0, 0.55);
          snap.status = "tentative";
          snap.classificationRationale =
            snap.classificationRationale || `Producto frecuente (${anchor.label}): posición canónica.`;
        } else {
          snap.status = "needs_info";
        }
      }
    }

    /**
     * Si el usuario ya había respondido a una ambigüedad previa (hay mensaje
     * de usuario posterior al último assistant), la damos por respondida:
     * no volvemos a renderizar el mismo bloque con los mismos candidatos.
     * Evita el bucle donde la UI pregunta una y otra vez lo mismo.
     */
    const prevAmbigKey = prev.ambiguity?.competingCandidates?.slice().sort().join("|");
    const currAmbigKey = snap.ambiguity?.competingCandidates?.slice().sort().join("|");
    const ambiguityIsRepeat = Boolean(
      prevAmbigKey && currAmbigKey && prevAmbigKey === currAmbigKey
    );
    if (ambiguityIsRepeat) {
      snap.ambiguity = undefined;
    }

    /**
     * Si la única "ambigüedad" que emitió el motor es el fallback genérico
     * (generic_low_confidence, sin decisiveField real), no tiene valor para
     * el usuario: la descartamos y promovemos a tentativo/resuelto según lo
     * que ya tengamos. Evita la frase "varias posiciones plausibles".
     */
    if (snap.ambiguity && snap.ambiguity.reason === "generic_low_confidence") {
      const field = (snap.ambiguity.decisiveField ?? "").toLowerCase();
      const genericLabels = ["varias posiciones", "afinar criterio", "posiciones plausibles"];
      const isGenericFallback = !field || genericLabels.some((g) => field.includes(g));
      if (isGenericFallback) {
        snap.ambiguity = undefined;
        if (snap.status === "needs_info" && snap.recommendedNcm) {
          snap.status = "tentative";
        }
      }
    }

    /**
     * Override del motor: cuando los datos comerciales están completos (FOB +
     * cantidad + origen) confiamos en el analista y cerramos el caso aunque
     * el motor quiera seguir pidiendo cosas. Corta el loop.
     *
     * También cerramos si el usuario explícitamente pidió avanzar
     * ("calculalo", "listo", "dale", etc.) — aunque haya questions_next
     * pendientes en el LLM analista (suelen ser confirmaciones).
     */
    if (dataComplete && snap.recommendedNcm) {
      // Con todos los datos comerciales + NCM ya disponibles, descartamos preguntas
      // secundarias del analista (uso personal, venta, confirmaciones) que no
      // afectan la clasificación NCM. El usuario ya aportó lo necesario.
      snap.pendingQuestions = undefined;
      snap.ambiguity = undefined;
      const st = snap.status as string;
      if (st === "needs_info" || st === "analyzing") {
        snap.status = "tentative";
      }
    } else if (dataComplete && !snap.recommendedNcm) {
      // Datos completos pero NINGÚN NCM ni candidato (caso raro): NUNCA cerramos
      // como "listo" sin clasificación — eso genera un costo engañoso. Siempre hay
      // salida = preguntar algo concreto para poder clasificar.
      snap.status = "needs_info";
      if ((snap.pendingQuestions?.length ?? 0) === 0 && !snap.ambiguity) {
        snap.pendingQuestions = [
          "Para clasificarlo con precisión me falta un detalle: ¿qué es exactamente, de qué material principal está hecho y para qué se usa?",
        ];
      }
    }

    const ambNorm: NormalizedAmbiguity | undefined =
      motor.engine.mode === "full"
        ? (motor.engine.pipeline.ncmMeta as { ambiguity?: NormalizedAmbiguity } | undefined)?.ambiguity
        : motor.engine.classification.ambiguity ?? undefined;

    /**
     * El motor puede devolver primaryQuestion/secondaryQuestion con códigos NCM
     * y jerga ("decidir entre 3917.21 y 3917.22..."). No los exponemos al usuario:
     * usamos sólo el texto humano de buildAmbiguityAssistantParagraph y le dejamos
     * al analista del siguiente turno reformular la pregunta en lenguaje del
     * producto (el prompt se lo exige).
     *
     * Sólo se concatena si (1) seguimos abiertos, (2) hay ambigüedad nueva,
     * (3) no es repetición del turno anterior.
     */
    const ambiguityParagraph =
      snap.status !== "resolved" && snap.ambiguity && ambNorm && !ambiguityIsRepeat
        ? `\n\n${buildAmbiguityAssistantParagraph(ambNorm)}`
        : "";

    // Nunca devolver un "listo / tengo todo para cotizar" cuando NO hay NCM: si el
    // flujo quedó en needs_info, el mensaje tiene que ser una pregunta (la pendiente
    // o el bloque de ambigüedad), no un cierre que engañe al usuario.
    let outMessage = assistantMessage;
    if (!snap.recommendedNcm && snap.status === "needs_info") {
      const q = (snap.pendingQuestions ?? []).join(" ").trim();
      // Prioridad: pregunta pendiente → bloque de ambigüedad (ya es la pregunta) →
      // pedido genérico de detalle. Nunca un cierre tipo "listo" sin NCM.
      outMessage = q
        ? q
        : ambiguityParagraph
          ? ""
          : "Necesito un detalle más para clasificar el producto: ¿qué es exactamente, de qué material principal está hecho y para qué se usa?";
    }

    // Sanitización final: cualquier código NCM que se haya colado en el mensaje
    // del analista se saca (defense-in-depth contra el prompt).
    const cleaned = stripNcmCodes((outMessage + ambiguityParagraph).trim());

    return {
      assistantMessage: cleaned,
      snapshot: snap,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Si el motor falló (timeout/cuota), igual anclamos productos comunes a su
    // posición canónica para no dejar al usuario sin salida.
    if (!snap.recommendedNcm) {
      const anchor = matchProductAnchor(techText);
      if (anchor) {
        snap.recommendedNcm = anchor.ncm;
        snap.confidence = Math.max(snap.confidence ?? 0, 0.5);
      }
    }
    snap.status = snap.recommendedNcm ? "tentative" : "needs_info";
    return {
      assistantMessage: snap.recommendedNcm
        ? assistantMessage
        : assistantMessage +
          "\n\nDecime un poco más del producto (qué es, de qué material y para qué se usa) para clasificarlo bien.",
      snapshot: { ...snap, errorMessage: msg },
    };
  }
}
