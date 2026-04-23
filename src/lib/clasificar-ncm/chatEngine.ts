import { openaiJson } from "@/lib/ai/openaiClient";
import { buildAmbiguityAssistantParagraph, type NormalizedAmbiguity } from "@/lib/clasificar-ncm/ncmAmbiguity";
import { runNcmMotor } from "@/lib/clasificar-ncm/runNcmMotor";
import { ncmDigitsOnly, formatMercosurNcm8 } from "@/lib/ncm/knowledge/normalize";
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
  const raw = text.trim();
  if (!raw) return null;

  const match = raw.match(/\b(\d{4}[.\s]?\d{2}[.\s]?\d{2}|\d{6,10})\b/);
  if (!match) return null;

  const digits = ncmDigitsOnly(match[1]);
  if (digits.length < 6 || digits.length > 10) return null;

  const lower = raw.toLowerCase();
  const hasIntent =
    /\b(es|ser[íi]a|usar|usa|usemos|poner|pone|pond[eé]|cotiz[áa]|cotizar|con|bajo|c[óo]digo|ncm|la|el)\b/.test(
      lower
    ) || raw === match[1] || raw.replace(/\s+/g, "") === match[1].replace(/\s+/g, "");
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

const CLASSIFY_TIMEOUT_MS = Number(process.env.NCM_CHAT_CLASSIFY_TIMEOUT_MS) || 22_000;

/** En la UI /clasificarncm priorizamos latencia: motor en modo rápido salvo env. */
const CLASIFICAR_CHAT_USE_FULL_MOTOR_PIPELINE =
  process.env.NCM_CLASIFICAR_CHAT_USE_FULL_PIPELINE === "1";

const CLASIFICAR_CLASSIFY_TIMEOUT_MS =
  Number(process.env.NCM_CLASIFICAR_CLASSIFY_TIMEOUT_MS) || CLASSIFY_TIMEOUT_MS;

const CLASIFICAR_ANALYST_TIMEOUT_MS =
  Number(process.env.NCM_CLASIFICAR_ANALYST_TIMEOUT_MS) ||
  Number(process.env.NCM_CHAT_ANALYST_TIMEOUT_MS) ||
  24_000;

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

  // Cantidad: "500 unidades", "100 u", "2 pzs", "1 unidad"
  let quantity: number | undefined;
  const qtyMatch = t.match(
    /\b(\d+(?:[.,]\d+)?)\s*(?:unidad(?:es)?|u\b|pzs?|piezas?|uds?|items?)/
  );
  if (qtyMatch) {
    const n = Number(qtyMatch[1].replace(",", "."));
    if (Number.isFinite(n) && n > 0) quantity = Math.max(1, Math.floor(n));
  } else if (
    /\b(?:solo\s+)?(?:una sola|un[a]?\s+sola|una\s+unidad|uno\s+solo|1\s+sola|1\s+unidad)\b/.test(t)
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
 * Elimina del texto cualquier código NCM (formatos XXXX.XX.XX, XXXXXXXX,
 * "cap. NN", "capítulo NN", "partida NNNN") para evitar que el usuario final
 * vea jerga aduanera. Defensa contra prompts que el modelo ignore.
 */
function stripNcmCodes(input: string): string {
  if (!input) return input;
  let out = input;
  // Patrones típicos: 8471.30.00, 9506.91.00.139W, 84.71.30, 85287200.
  out = out.replace(/\b\d{2,4}[.\s]\d{2}[.\s]\d{2}(?:[.\s]?\d{0,3}[A-Za-z]?)?\b/g, "—");
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

const ANALYST_SYSTEM = `Sos un asesor de importaciones que ayuda a una persona a armar el presupuesto de traer un producto a Argentina. Pensás como despachante profesional, pero **hablás como un humano que asesora**, enfocado en **afinar el presupuesto**, no en jerga aduanera.

=== REGLA CRÍTICA (CERO EXCEPCIONES) ===

**PROHIBIDO mencionar en el mensaje al usuario:**
- Códigos NCM o partidas (nada de "8471.30.00", "cap. 8413", "partida 85", "8528.72"). Ni insinuados ("va bajo el capítulo..."), ni completos.
- Palabras: NCM, partida, subpartida, capítulo HS, Mercosur, GIR, RGI, encuadre, nomenclador, posición arancelaria.

La clasificación es **trabajo tuyo interno**. El usuario muchas veces **no sabe ni qué es un NCM** y no le interesa. Él quiere saber cuánto le sale importar y necesita que le pidas los datos del **producto** cuando hagan falta.

=== CÓMO PREGUNTAR CUANDO FALTAN DATOS ===

Cuando necesites un dato para acotar la clasificación, **enmarcarlo en términos del presupuesto**: *"para afinar el presupuesto necesito saber..."*, *"un dato más y te tengo la cotización más cercana a la real..."*.

Ejemplos:
- Mal: "¿La bomba es para uso industrial o doméstico? (para decidir subpartida)"
- Bien: "Para afinar el presupuesto: ¿la bomba es de uso industrial/fábrica o doméstica/hogar? Cambian bastante los impuestos."

- Mal: "¿Es producto final o componente? (part_vs_final)"
- Bien: "Un dato más y afino los costos: ¿lo vas a usar así tal cual o forma parte de una máquina más grande?"

- Mal: "¿Material dominante para GIR 3?"
- Bien: "¿De qué material es principalmente? (afecta los impuestos de importación)"

=== ESTILO DE RESPUESTA ===

- **Tono adaptativo**: leé cómo escribe el usuario. Si es casual → casual. Si es técnico (especificaciones, medidas) → técnico pero sin jerga aduanera.
- **1–3 líneas**. Nunca más de 5.
- **Una sola pregunta por turno** cuando haga falta.
- Nunca arranques con "Dado su uso…", "Con la información proporcionada…", "Procedamos a…". Directo.
- No "resumas" lo que el usuario ya dijo.
- Si el usuario ya dio lo que necesitabas, avanzá y decí algo como *"Listo, ya tengo lo necesario para el presupuesto."* — sin mencionar códigos.

=== CRITERIO INTERNO (NO LO RECITÁS) ===

Internamente razonás por función principal → capítulo → partida → subpartida. Pero afuera **cero** de esto. Si dudás entre dos posiciones, el usuario debe ver solo la pregunta concreta sobre el producto.

Máximo 3 preguntas en "questions_next", en palabras simples del producto, nunca mencionando códigos. Si el caso es simple, cerrá y listo.

=== AMBIGÜEDAD ===

Solo marcar ambigüedad si hay dos partidas reales compitiendo. Si el usuario ya respondió lo que faltaba o dio un código, no marques ambigüedad.

=== DATOS COMERCIALES PARA EL PRESUPUESTO ===

Además de clasificar el producto, necesitás recolectar 3 datos para poder cotizar:
1. **Precio FOB unitario en USD** (cuánto sale cada unidad en origen).
2. **Cantidad** a importar.
3. **País de origen** (ej. China, USA, Brasil).

Cuando ya tenés la clasificación clara y falta alguno de estos, **preguntalos** en una frase breve. Ejemplo:
- *"¿Cuánto te sale cada uno en dólares y cuántos vas a traer?"*
- *"¿De qué país lo traés? ¿Tenés el precio por unidad?"*

Si el usuario escribió datos en el texto (ej. "500 unidades a USD 3 desde China"), extraelos a los campos \`purchase\`. No vuelvas a preguntar lo que ya te dio.

=== RESPUESTA (SOLO JSON) ===

{
  "assistant_message": "1-3 líneas, sin mencionar NCM/partida/capítulo/códigos. Hablá del producto y del presupuesto.",
  "product_name": "string | null",
  "technical_name": "string | null",
  "main_function": "string | null",
  "materials": ["string"],
  "use": "string | null",
  "power_source": "string | null",
  "product_type": "final" | "part" | "accessory" | "unknown",
  "industry": "string | null",
  "missing_critical_data": ["string"],
  "questions_next": ["máximo 3 preguntas, en palabras del producto, sin códigos"],
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
}): Promise<{ assistantMessage: string; snapshot: CaseSnapshot }> {
  const { messages, snapshot: prev } = opts;

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

  let analyst: AnalystJson;
  try {
    analyst = await openaiJson<AnalystJson>({
      system: ANALYST_SYSTEM,
      user: userPayload,
      model: process.env.NCM_CHAT_ANALYST_MODEL ?? (process.env.OPENAI_MODEL || "gpt-4o-mini"),
      timeoutMs: CLASIFICAR_ANALYST_TIMEOUT_MS,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al analizar.";
    return {
      assistantMessage: `No pude completar el análisis técnico (${msg}). Verificá que OPENAI_API_KEY esté configurada.`,
      snapshot: {
        ...prev,
        status: "error",
        errorMessage: msg,
      },
    };
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
  const questions = Array.isArray(analyst.questions_next)
    ? analyst.questions_next.map((q) => String(q).trim()).filter(Boolean).slice(0, 3)
    : [];
  snap.pendingQuestions = questions.length ? questions : undefined;

  const ready = Boolean(analyst.ready_to_run_classifier);

  const techText = buildTechnicalDescription(messages, snap);
  snap.mergedTechnicalDescription = techText;

  /** No ejecutar motor NCM si faltan preguntas pendientes o el analista no liberó clasificación. */
  const runPipeline =
    techText.length >= 12 &&
    ready &&
    questions.length === 0;

  if (!runPipeline) {
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
    const motor = await runNcmMotor({
      text: techText,
      snapshot: snap,
      prevSnapshot: prev,
      messages,
      preferFullPipeline: CLASIFICAR_CHAT_USE_FULL_MOTOR_PIPELINE,
      classifyOptions: {
        timeoutMs: CLASIFICAR_CLASSIFY_TIMEOUT_MS,
        model: process.env.NCM_CHAT_CLASSIFY_MODEL ?? (process.env.OPENAI_MODEL || "gpt-4o-mini"),
        skipNcmKnowledge:
          process.env.NCM_CHAT_SKIP_KNOWLEDGE === "1" || process.env.NCM_CHAT_SKIP_KNOWLEDGE === "true",
      },
    });

    const ncm = motor.ncm_code;
    const conf = motor.confidence;

    snap.candidates = motor.candidates.length ? motor.candidates : snap.candidates;
    snap.discardedNotes = motor.discardedNotes.length ? motor.discardedNotes : snap.discardedNotes;
    if (motor.discardedCandidates?.length) {
      snap.discardedCandidates = motor.discardedCandidates;
    }
    snap.recommendedNcm = ncm ?? undefined;
    snap.confidence = conf;
    // Sanitizamos las questions del motor: pueden traer códigos y jerga.
    const motorQuestionsClean = motor.questions
      .map((q) => stripNcmCodes(q).trim())
      .filter((q) => q.length > 0);
    snap.pendingQuestions = motorQuestionsClean.length ? motorQuestionsClean : undefined;
    snap.ambiguity = motor.ambiguity;
    snap.classificationRationale =
      motor.rationale || snap.classificationRationale || analyst.classification_rationale_draft || undefined;

    if (motor.statusHint === "resolved") {
      snap.status = "resolved";
      snap.pendingQuestions = undefined;
      snap.ambiguity = undefined;
    } else if (motor.statusHint === "tentative") {
      snap.status = "tentative";
    } else {
      snap.status = "needs_info";
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
     * Override del motor: si el analista YA cerró el turno (ready && sin
     * preguntas propias) y los datos comerciales completos están presentes
     * (FOB + cantidad + origen), confiamos en el analista y cerramos el caso.
     * Aunque el motor quiera seguir pidiendo cosas, no lo exponemos al usuario.
     * Esto corta el loop "ya tengo todo → pregunta técnica → ya tengo todo".
     */
    const dataComplete = Boolean(
      snap.purchase?.fobUnitUsd && snap.purchase?.quantity && snap.purchase?.origin
    );
    if (ready && questions.length === 0 && dataComplete) {
      snap.pendingQuestions = undefined;
      snap.ambiguity = undefined;
      if (snap.recommendedNcm && snap.status === "needs_info") {
        snap.status = "tentative";
      } else if (!snap.recommendedNcm) {
        // El motor no dio NCM pero el analista cerró. Marcamos tentativo con
        // confianza baja para que la UI siga al paso de presupuesto.
        snap.status = "tentative";
        snap.confidence = Math.max(snap.confidence ?? 0, 0.5);
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

    // Sanitización final: cualquier código NCM que se haya colado en el mensaje
    // del analista se saca (defense-in-depth contra el prompt).
    const cleaned = stripNcmCodes(assistantMessage + ambiguityParagraph);

    return {
      assistantMessage: cleaned,
      snapshot: snap,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    snap.status = "tentative";
    return {
      assistantMessage:
        assistantMessage + "\n\nNo pude completar la consulta del motor. Probá dar más detalles del producto.",
      snapshot: { ...snap, errorMessage: msg },
    };
  }
}
