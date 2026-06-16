import { buildNcmKnowledgeEvidence } from "@/lib/ncm/knowledge/ncmKnowledgeEvidence";
import { openaiJson } from "@/lib/ai/openaiClient";
import { anthropicJson, anthropicAvailable } from "@/lib/ai/anthropicClient";
import { lookupProductNcm } from "@/lib/ncm/productCatalog";

/**
 * Elige proveedor para clasificar: Anthropic (Opus) si hay ANTHROPIC_API_KEY,
 * salvo que NCM_CLASSIFIER_PROVIDER fuerce "openai". Si Claude falla, cae a OpenAI.
 */
async function classifierJson<T>(opts: {
  system: string;
  user: string;
  openaiModel: string;
  timeoutMs: number;
}): Promise<T> {
  const provider = process.env.NCM_CLASSIFIER_PROVIDER;
  const useAnthropic = provider === "anthropic" || (provider !== "openai" && anthropicAvailable());
  if (useAnthropic) {
    try {
      return (await anthropicJson<any>({ system: opts.system, user: opts.user, timeoutMs: opts.timeoutMs })) as T;
    } catch (e) {
      if (process.env.NCM_DEBUG === "1") console.warn("[ncmClassifier] Anthropic falló, uso OpenAI:", e);
      // fallback a OpenAI
    }
  }
  return (await openaiJson<any>({
    system: opts.system,
    user: opts.user,
    model: opts.openaiModel,
    timeoutMs: opts.timeoutMs,
  })) as T;
}
import {
  ambiguityQuestionsList,
  buildFallbackAmbiguityFromCodes,
  normalizeAmbiguityPayload,
  type NormalizedAmbiguity,
  NCM_AMBIGUITY_GENERIC_FALLBACK_QUESTION,
} from "@/lib/clasificar-ncm/ncmAmbiguity";
import {
  NCM_AMBIGUITY_CLASSIFIER_BLOCK,
  NCM_CLASSIFIER_PROFESSIONAL_BLOCK,
  NCM_EXPERT_RIGOR_BLOCK,
  NCM_RGI_GIR_BLOCK,
} from "@/lib/clasificar-ncm/professionalModePrompt";

export type NcmCandidate = {
  ncm_code: string;
  confidence: number;
  rationale?: string;
};

export type NcmEvidenceCandidate = {
  ncm_code: string;
  title?: string;
};

export type NcmClassification = {
  ncm_code: string;
  confidence: number;
  rationale: string;
  candidates: NcmCandidate[];
  hs_heading?: string;
  kind?: string;
  search_terms?: string[];
  missing_info_questions?: string[];
  /** True cuando hace falta respuesta del usuario antes de afirmar el NCM. */
  needs_clarification?: boolean;
  /** Set when classifying from a restricted candidate list (PCRAM/local evidence). */
  ambiguous?: boolean;
  discarded?: Array<{ ncm: string; reason: string }>;
  /** Mismo contenido que `discarded` con clave `code` (intercambio / UI). */
  discardedCandidates?: Array<{ code: string; reason: string }>;
  /** Causa de la duda + pregunta decisiva (si aplica). */
  ambiguity?: NormalizedAmbiguity;
};

function formatNcm(ncmRaw: string) {
  const digits = (ncmRaw || "").replace(/\D/g, "");
  if (digits.length < 6) return "9999.99.99";
  const a = digits.slice(0, 4);
  const b = digits.slice(4, 6);
  const c = digits.slice(6, 8).padEnd(2, "0");
  return `${a}.${b}.${c}`;
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function ncmDigits(s: string) {
  return String(s ?? "").replace(/\D/g, "");
}

function isNcmInEvidence(formatted: string, evidence: NcmEvidenceCandidate[]) {
  const key = ncmDigits(formatted);
  if (key.length < 6) return false;
  return evidence.some((e) => ncmDigits(e.ncm_code) === key);
}

/** Reloj/pulsera conectada — no es smartphone aunque la marca sea Apple/Samsung. */
const WEARABLE_NOT_PHONE = /\b(apple watch|galaxy watch|google pixel watch|smartwatch|reloj inteligente|reloj conectado|huawei watch|xiaomi watch|amazfit|fitbit(?:\s+(?:sense|versa|charge|inspire))?|pulsera\s+inteligente|wearable|reloj\s+deportivo\s+con\s+pantalla)\b/i;

function isWearableMisclassifiedAsPhone(text: string, ncmFormatted: string) {
  if (!WEARABLE_NOT_PHONE.test(text)) return false;
  return /^8517\.13\b/.test(ncmFormatted);
}

/**
 * Si la IA confundió wearable con celular, no devolvemos 8517.13: anulamos NCM y dejamos que PCRAM/nomenclador busquen 8517.62*.
 */
function tryGuardWearableVsPhone(
  text: string,
  ncm_code: string,
  confidence: number,
  rationale: string,
  hs_heading: string | undefined,
  kind: string | undefined,
  search_terms: string[] | undefined
): {
  ncm_code: string;
  confidence: number;
  rationale: string;
  hs_heading?: string;
  kind?: string;
  search_terms?: string[];
  missing_info_questions: string[];
  needs_clarification: boolean;
  ambiguous: boolean;
  ambiguity?: NormalizedAmbiguity;
} | null {
  if (!isWearableMisclassifiedAsPhone(text, ncm_code)) return null;

  const q = [
    "¿El producto es un **smartwatch / reloj inteligente de muñeca** (pantalla, apps, sensores) o un **teléfono celular smartphone**? (8517.13 es solo para teléfonos; wearables suelen ir por 8517.62 u otra subpartida del 8517 distinta de 8517.13.)",
    "Si es smartwatch: ¿tiene **eSIM / línea celular propia** o solo **Bluetooth** vinculado al teléfono? (puede cambiar la subpartida).",
  ];

  const amb =
    normalizeAmbiguityPayload(
      {
        reason: "communication_vs_processing",
        competing_candidates: ["8517.13.00", "8517.62.72"],
        decisive_field: "Tipo de aparato (teléfono celular vs wearable / transmisión de datos)",
        primary_question: q[0],
        secondary_question: q[1],
      },
      { competingCodes: ["8517.13.00", "8517.62.72"] }
    ) ?? undefined;

  return {
    ncm_code: "9999.99.99",
    confidence: Math.min(confidence, 0.38),
    rationale: `${rationale} — Ajuste automático: 8517.13 es **teléfono celular**; este texto describe un **wearable**, no un smartphone. Se busca posición en 8517.62 (o equivalente) vía nomenclador.`,
    hs_heading: "8517",
    kind: kind ? `${kind} (wearable vs teléfono)` : "Dispositivo cap. 8517 — confirmar tipo",
    search_terms: uniqueTerms([...(search_terms ?? []), "reloj inteligente", "smartwatch", "8517.62"]),
    missing_info_questions: amb ? ambiguityQuestionsList(amb) : q,
    needs_clarification: true,
    ambiguous: true,
    ambiguity: amb,
  };
}

/** 8527 = radiodifusión / receptores de radio; no aplica a smartwatch por “inalámbrico”. */
function isWearableConnectedDevice(text: string): boolean {
  return WEARABLE_NOT_PHONE.test(text);
}

function is8527MisclassifiedForWearable(ncmFormatted: string): boolean {
  return /^8527\./.test(ncmFormatted);
}

/**
 * Smartwatch/wearable: función principal = conectividad y datos, no radiodifusión (8527).
 * Corrige a 8517.62.72 cuando la IA eligió 8527 por error de razonamiento.
 */
function tryGuardWearableVs8527(
  text: string,
  ncm_code: string,
  confidence: number,
  rationale: string,
  hs_heading: string | undefined,
  kind: string | undefined,
  search_terms: string[] | undefined
): {
  ncm_code: string;
  confidence: number;
  rationale: string;
  hs_heading?: string;
  kind?: string;
  search_terms?: string[];
  missing_info_questions?: string[];
  needs_clarification: boolean;
  ambiguous: boolean;
} | null {
  if (!isWearableConnectedDevice(text) || !is8527MisclassifiedForWearable(ncm_code)) return null;

  const conf = Math.min(Math.max(confidence, 0.66), 0.74);

  return {
    ncm_code: "8517.62.72",
    confidence: conf,
    rationale: `${rationale} — Ajuste automático: **8527** alcanza receptores de **radiodifusión** / aparatos de radio; un Apple Watch u otro wearable no tiene como función principal recibir broadcast. La función principal es **conectividad y transmisión/recepción de datos** con teléfono/red → **8517.62** (p. ej. 8517.62.72), no 8527.`,
    hs_heading: "8517",
    kind: kind ? `${kind} (8517 vs 8527)` : "Wearable — telecomunicaciones 8517.62",
    search_terms: uniqueTerms([
      ...(search_terms ?? []),
      "8517.62.72",
      "8517.62",
      "transmisión recepción datos",
      "smartwatch",
    ]),
    missing_info_questions: undefined,
    needs_clarification: false,
    /** Regla determinística: no marcar ambiguo (evita conf ×0.85 y mensaje erróneo en el chat). */
    ambiguous: false,
  };
}

function uniqueTerms(arr: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    const t = String(x || "").trim();
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
    if (out.length >= 6) break;
  }
  return out.length ? out : undefined;
}

/** Con ambigüedad abierta no se debe mostrar confianza “alta” artificial. */
const AMBIGUITY_OPEN_CONF_CAP = 0.68;

/**
 * Rigor de despachante reforzado en código (no solo en el prompt).
 * - EXPERT_CONF_GATE: por debajo de esto no se presenta una clasificación como
 *   definitiva → se pide aclaración (regla "confianza < 70% → preguntar").
 * - NO_EXCLUSIONS_CONF_CAP: sin exclusiones documentadas, la confianza no puede
 *   superar este valor (regla "si no descartás, máx 69%"). Activable por env
 *   NCM_REQUIRE_EXCLUSIONS=1 (off por defecto para no penalizar productos simples
 *   y claros donde el modelo no lista descartes).
 */
const EXPERT_CONF_GATE = 0.7;
const NO_EXCLUSIONS_CONF_CAP = 0.69;
const REQUIRE_DOCUMENTED_EXCLUSIONS = process.env.NCM_REQUIRE_EXCLUSIONS === "1";

function collectCompetingCodesFree(ncm_code: string, candidates: NcmCandidate[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (c: string) => {
    const f = formatNcm(c);
    if (f === "9999.99.99" || seen.has(f)) return;
    seen.add(f);
    out.push(f);
  };
  push(ncm_code);
  const sorted = [...candidates].sort((a, b) => b.confidence - a.confidence);
  for (const c of sorted) {
    if (c.confidence >= 0.22) push(c.ncm_code);
    if (out.length >= 5) break;
  }
  return out;
}

function collectCompetingCodesEvidence(ncm_code: string, evidence: NcmEvidenceCandidate[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (c: string) => {
    const f = formatNcm(c);
    if (f === "9999.99.99" || seen.has(f)) return;
    seen.add(f);
    out.push(f);
  };
  push(ncm_code);
  for (const e of evidence) {
    push(e.ncm_code);
    if (out.length >= 6) break;
  }
  return out;
}

const EVIDENCE_SYSTEM_PROMPT =
  `Sos un clasificador profesional de NCM (Mercosur / Argentina), actuando como un despachante de aduana senior.

` +
  NCM_CLASSIFIER_PROFESSIONAL_BLOCK +
  NCM_RGI_GIR_BLOCK +
  NCM_EXPERT_RIGOR_BLOCK +
  NCM_AMBIGUITY_CLASSIFIER_BLOCK +
  `

IMPORTANTE:
- NO debes inventar códigos NCM
- SOLO podés elegir entre los candidatos proporcionados
- Si ninguno aplica correctamente → marcar como "ambiguous": true y devolver ncm_code "9999.99.99"

PROCESO OBLIGATORIO:

1. Determinar la FUNCIÓN PRINCIPAL del producto
   → Esto tiene más peso que el nombre comercial o la marca (ej. "Apple" puede ser iPhone o Apple Watch: son capítulos distintos dentro de 85)

2. Identificar:
   - tipo de producto (final, parte, accesorio)
   - tecnología (eléctrico, mecánico, químico, etc.)
   - uso real

3. Capítulo 8517 — NO confundir:
   - Subpartidas tipo 8517.13: TELÉFONOS CELULARES (smartphone). Función principal: comunicación por red móvil.
   - Smartwatch / reloj inteligente / wearable de muñeca: NO es 8517.13 aunque reciba llamadas. Si el título del candidato dice "teléfono" pero el producto es claramente reloj inteligente, DESCARTAR ese candidato y explicar en "reason".
   - **8527** NO es para smartwatchs: 8527 es **radiodifusión** / receptores de radio. Si el producto es wearable con Bluetooth/Wi‑Fi/LTE por conectividad, **NO** elijas 8527 aunque diga “inalámbrico”. Preferí **8517.62** (transmisión/recepción de datos) entre los candidatos.
   - Si los candidatos mezclan teléfonos y wearables y no podés decidir, devolvé 9999.99.99, ambiguous true, y completá follow_up_questions.

4. Aplicar RGI:
   - RGI 1: Comparar directamente con la descripción legal de cada candidato (usá el título provisto como proxy)
   - RGI 3a: Elegir la descripción MÁS ESPECÍFICA
   - RGI 3b: Si es un conjunto/kit → elegir por carácter esencial

5. DESCARTAR candidatos: Para cada candidato descartado, indicar brevemente por qué NO aplica (si corresponde)

6. DECISIÓN FINAL:
   - Elegir el mejor candidato de la lista
   - Si hay duda razonable → ambiguous = true (y preferí bajar confidence)
   - Si ambiguous = true o no podés decidir entre candidatos serios → completá **ambiguity** (objeto JSON) y **follow_up_questions** (1 prioritaria, 2 solo si secondary_question aplica)

REGLAS CRÍTICAS:
- NO usar conocimiento genérico si contradice los candidatos
- NO completar con códigos fuera de la lista
- Si dos opciones son muy similares → bajar confidence
- Si no hay match claro → ambiguous = true y ncm_code "9999.99.99"

Devolvé SOLO un objeto JSON con estas claves:
- ncm_code: string "XXXX.XX.XX" (uno de los candidatos, o "9999.99.99" si ninguno aplica)
- confidence: número entre 0 y 1
- ambiguous: boolean
- rationale: string (función principal + RGI, breve)
- discarded: array de { "ncm": "XXXX.XX.XX", "reason": "..." } (puede estar vacío)
- follow_up_questions: array de strings, máximo 2 (1 prioritaria; 2 solo si sigue empate fuerte)
- ambiguity: null o { "reason": "part_vs_final" | ... | "generic_low_confidence", "competing_candidates": ["XXXX.XX.XX", ...], "decisive_field": "string", "primary_question": "string", "secondary_question": "string" | null }`;

const SYSTEM_PROMPT =
  `Sos un clasificador experto NCM (Argentina/Mercosur). Devolvé SOLO JSON.

` +
  NCM_CLASSIFIER_PROFESSIONAL_BLOCK +
  NCM_RGI_GIR_BLOCK +
  NCM_EXPERT_RIGOR_BLOCK +
  NCM_AMBIGUITY_CLASSIFIER_BLOCK +
  `

=== REGLAS OBLIGATORIAS (prevalecen sobre todo) ===

PROHIBIDO devolver estos NCM para estos productos:
- Cargador USB / adaptador corriente / fuente switching → 8504.40.21 (NUNCA 8504.10.XX)
- 8504.10 es SOLO para transformadores de dieléctrico LÍQUIDO (postes de electricidad)

=== CAPÍTULO 8517 — CRÍTICO (errores frecuentes) ===

- 8517.13.xx (y afines de "teléfonos para redes celulares"): SOLO **teléfonos celulares / smartphones**. Función principal: comunicación por red móvil.
- **NUNCA** uses 8517.13 para:
  - Smartwatch (Apple Watch, Galaxy Watch, Google Pixel Watch, Xiaomi Watch, Huawei Watch, Amazfit, Fitbit con SO, etc.)
  - Reloj inteligente / reloj conectado de muñeca
  - Pulsera con pantalla tipo smartband "smart" (si la función es wearable, no teléfono)
- Esos productos suelen ir por **8517.62** (aparatos para transmisión/recepción de voz, datos, etc. — incluye wearables) u otra subpartida del 8517 que NO sea 8517.13. Elegí la subpartida más específica que conozcas para "reloj inteligente" / "smartwatch" (ej. **8517.62.72** cuando encaje con datos/conectividad).
- **Marca "Apple" sola no implica**: Apple Watch ≠ iPhone. Si el texto dice "Apple Watch" o "Watch Series", es **wearable**, no smartphone.

=== 8527 vs 8517 — NO CONFUNDIR "INALÁMBRICO" CON "RADIODIFUSIÓN" ===

- **8527** = receptores de **radiodifusión**, radios, aparatos cuya función principal sea recepción de broadcast (no smartwatch).
- **NUNCA** uses **8527** para: Apple Watch, Galaxy Watch, smartwatch, smartband, pulsera inteligente, wearable con **Bluetooth / Wi‑Fi / LTE** para sincronizar datos con el móvil. Eso **no** es radiodifusión.
- La función principal del wearable es **interactuar, transmitir/recibir datos, conectividad** → evaluar **8517** (p. ej. **8517.62**), no 8527.
- Confundir "electrónico portátil” o “inalámbrico” con **radio** es un error grave.

Capítulo 91: reloj de pulsera **solo mecánico** o **de cuarzo tradicional** (sin apps, sin smart) puede ser 9101/9102 según corresponda — no confundir con 8517.

=== TABLA DE REFERENCIA RÁPIDA (orientativa) ===

- Cargador USB/Type-C/adaptador corriente → 8504.40.21
- Fuente de alimentación / power supply → 8504.40.22
- Smartphone / teléfono celular → 8517.13.00
- Smartwatch / reloj inteligente → 8517.62 (NO 8517.13)
- Tablet → 8471.30.19
- Notebook/laptop → 8471.30.19
- Auriculares/cascos bluetooth → 8518.30.00
- Cable USB/HDMI → 8544.42.00
- Batería litio → 8507.60.00
- LED/lámpara LED → 8539.50.00
- Panel solar → 8541.40.22
- TV/monitor → 8528.72.00
- Impresora → 8443.32.21
- Auto nafta ≤1500cc → 8703.22.10
- Auto nafta 1500-3000cc → 8703.23.10
- Auto nafta >3000cc → 8703.24.10
- Auto diesel → 8703.32.10
- Auto eléctrico → 8703.80.00
- Pickup/camioneta carga → 8704.21.90
- Moto ≤250cc → 8711.20.10
- Bicicleta → 8712.00.10
- Remera algodón → 6109.10.00
- Pantalón algodón hombre → 6203.42.00
- Zapatilla deportiva → 6404.11.00
- Juguete → 9503.00.97
- Videoconsola → 9504.50.00

=== INSTRUCCIONES DE RAZONAMIENTO ===

1. Identificá la FUNCIÓN PRINCIPAL (no el nombre comercial).
2. **Inferí** lo típico del tipo de producto (mercado, uso estándar) antes de pedir datos.

=== OPTIMIZACIÓN DE PREGUNTAS ===

Antes de cada ítem en **missing_info_questions**, preguntate: **«¿Esta información puede cambiar la clasificación?»** → Si **NO**, no lo incluyas.

**Prioridad:** **1** pregunta principal que más reduzca la ambigüedad; **2** solo si sin la segunda seguiría un empate fuerte entre dos NCM.

3. **missing_info_questions**: vacío salvo duda real. NO preguntar por datos obvios o inferibles.
4. Si el texto es ambiguo entre **dos capítulos o partidas distintas**, needs_clarification true y **al menos una** pregunta en missing_info_questions (no vacío), **más** el objeto **ambiguity** con la causa.
5. Si tenés suficiente información (incluidas inferencias razonables), needs_clarification: false y missing_info_questions: [] y ambiguity: null.
6. **Regla:** si needs_clarification es true o hay duda real entre partidas, **missing_info_questions no puede estar vacío** (salvo que una sola posición sea ya defendible sin más datos).

**Salida:** usá **solo** el esquema JSON de abajo (ncm_code con puntos, confidence numérica 0–1). No uses otro formato (ej. confidence "high/medium/low" o claves ncm/justification).

Devolvé JSON con:
- ncm_code: "XXXX.XX.XX"
- confidence: 0 a 1 (producto simple y claro → ≥ 0.85 si encaje legal es firme; bajá solo ante duda real entre partidas/capítulos)
- rationale: cadena breve: función principal → por qué esta partida (mencionar RGI si aplica)
- candidates: 2-3 alternativas [{ncm_code, confidence, rationale}]
- hs_heading: 4 dígitos (ej "8517")
- kind: etiqueta corta español
- search_terms: 2-4 términos para buscar en nomenclador/PCRAM (incluí términos legales, no solo marca)
- needs_clarification: boolean
- missing_info_questions: array de strings, máximo 2 (1 prioritaria)
- ambiguity: null o { "reason": "part_vs_final" | ... | "generic_low_confidence", "competing_candidates": [...], "decisive_field": "...", "primary_question": "...", "secondary_question": null | "..." }`;

export async function classifyWithAI(
  text: string,
  opts?: {
    candidates?: NcmEvidenceCandidate[];
    evidenceNote?: string;
    /** Default 45s. Usar valores menores en chat interactivo. */
    timeoutMs?: number;
    model?: string;
    /** No enriquecer con búsqueda sobre `data/ncm/index.json` (modo libre o candidatos ya provistos). */
    skipNcmKnowledge?: boolean;
  }
): Promise<NcmClassification> {
  // Reuso del catálogo curado: si ya hay una NCM VERIFICADA para este producto,
  // la usamos directamente (más rápido y consistente, sin llamar a la IA).
  if (process.env.NCM_CATALOG_REUSE !== "0") {
    try {
      const hit = await lookupProductNcm(text);
      if (hit?.verified && hit.ncm && hit.ncm !== "9999.99.99") {
        const code = formatNcm(hit.ncm);
        const heading = code.replace(/\D/g, "").slice(0, 4);
        return {
          ncm_code: code,
          confidence: Math.max(hit.confidence ?? 0.9, 0.9),
          rationale: "Reutilizado del catálogo verificado de E-COMEX.",
          candidates: [],
          ambiguous: false,
          needs_clarification: false,
          hs_heading: heading.length === 4 ? heading : undefined,
        };
      }
    } catch {
      // catálogo no disponible: seguir con la clasificación normal
    }
  }

  let evidence = Array.isArray(opts?.candidates) ? opts!.candidates.slice(0, 12) : [];
  let evidenceNoteExtra = opts?.evidenceNote ?? "";

  if (
    !evidence.length &&
    !opts?.skipNcmKnowledge &&
    process.env.NCM_KNOWLEDGE_ENABLED !== "false"
  ) {
    try {
      const kn = buildNcmKnowledgeEvidence(text);
      if (kn?.candidates.length) {
        evidence = kn.candidates;
        evidenceNoteExtra = [kn.note, evidenceNoteExtra].filter(Boolean).join("\n\n");
      }
    } catch {
      // índice ausente o corrupto: seguir en modo libre
    }
  }

  const system = evidence.length
    ? EVIDENCE_SYSTEM_PROMPT
    : [
        SYSTEM_PROMPT,
        "",
      ].join("\n");

  const user = evidence.length
    ? [
        "INPUT:",
        "",
        "Producto:",
        text.slice(0, 4000),
        "",
        "Candidatos NCM:",
        JSON.stringify(
          evidence.map((c) => ({
            ncm_code: c.ncm_code,
            title: c.title ?? "",
          })),
          null,
          2
        ),
        evidenceNoteExtra ? `\nNota adicional:\n${String(evidenceNoteExtra).slice(0, 1000)}` : "",
      ].join("\n")
    : [
        "Clasificá el NCM:",
        evidenceNoteExtra ? `EVIDENCE_NOTE:\n${String(evidenceNoteExtra).slice(0, 1000)}` : "",
        text.slice(0, 4000),
      ].join("\n");

  try {
    const start = Date.now();
    if (process.env.NCM_DEBUG === "1") {
      console.log("[ncmClassifier] calling OpenAI for:", text.slice(0, 80), evidence.length ? "(evidence)" : "");
    }

    const r = await classifierJson<{
      ncm_code?: string;
      confidence?: number;
      ambiguous?: boolean;
      rationale?: string;
      candidates?: Array<{ ncm_code?: string; confidence?: number; rationale?: string }>;
      discarded?: Array<{ ncm?: string; reason?: string }>;
      hs_heading?: string;
      kind?: string;
      search_terms?: string[];
      needs_clarification?: boolean;
      missing_info_questions?: string[];
      follow_up_questions?: string[];
      ambiguity?: {
        reason?: string;
        competing_candidates?: string[];
        decisive_field?: string;
        primary_question?: string;
        secondary_question?: string | null;
      } | null;
    }>({
      system,
      user,
      openaiModel: opts?.model ?? (process.env.OPENAI_MODEL || "gpt-4o-mini"),
      timeoutMs: opts?.timeoutMs ?? 45_000,
    });

    const elapsed = Date.now() - start;
    let ncm_code = formatNcm(String(r.ncm_code ?? ""));
    if (process.env.NCM_DEBUG === "1") {
      console.log(`[ncmClassifier] result: ${ncm_code} (confidence: ${r.confidence}, ${elapsed}ms)`);
    }

    if (evidence.length) {
      let rationaleEvidence = String(r.rationale ?? "Clasificación restringida a candidatos.").trim();
      let wearable8527Fix = false;
      if (isWearableConnectedDevice(text) && is8527MisclassifiedForWearable(ncm_code)) {
        const fromList = evidence
          .map((e) => formatNcm(e.ncm_code))
          .filter((c) => /^8517\.62/.test(c) && c !== "9999.99.99")
          .sort()[0];
        ncm_code = fromList ?? "8517.62.72";
        wearable8527Fix = true;
        rationaleEvidence = `${rationaleEvidence} — Corrección: **8527** es radiodifusión/radio; wearable conectado → **8517.62** (datos/telecom), no 8527.`;
      }

      const inList =
        ncm_code === "9999.99.99" ||
        isNcmInEvidence(ncm_code, evidence) ||
        (wearable8527Fix && /^8517\.62/.test(ncm_code));
      if (!inList) {
        ncm_code = "9999.99.99";
      }
      if (ncm_code === "9999.99.99" && isWearableConnectedDevice(text)) {
        const fromEv = evidence
          .map((e) => formatNcm(e.ncm_code))
          .filter((c) => /^8517\.62/.test(c) && c !== "9999.99.99")
          .sort()[0];
        ncm_code = fromEv ?? "8517.62.72";
        rationaleEvidence = `${rationaleEvidence} — Smartwatch/wearable: posición típica **8517.62** (transmisión/recepción de datos).`;
      }
      let ambiguous = Boolean(r.ambiguous);
      if (ncm_code === "9999.99.99") ambiguous = true;
      let confidence = clamp01(Number(r.confidence ?? 0));
      if (wearable8527Fix && ncm_code !== "9999.99.99") {
        ambiguous = false;
        confidence = Math.max(confidence, 0.7);
      } else if (
        isWearableConnectedDevice(text) &&
        /^8517\.62/.test(ncm_code) &&
        ncm_code !== "9999.99.99"
      ) {
        /** El modelo a veces devuelve confianza muy baja pese a candidato 8517.62 correcto para wearables. */
        ambiguous = false;
        confidence = Math.max(confidence, 0.72);
      }
      const rationale = rationaleEvidence;
      const discardedRaw = Array.isArray(r.discarded) ? r.discarded : [];
      const discarded = discardedRaw
        .slice(0, 12)
        .map((d) => ({
          ncm: formatNcm(String(d?.ncm ?? "")),
          reason: String(d?.reason ?? "").trim() || "—",
        }))
        .filter((d) => ncmDigits(d.ncm).length >= 6 && d.ncm !== "9999.99.99");

      const codesEv = collectCompetingCodesEvidence(ncm_code, evidence);
      let ambEv: NormalizedAmbiguity | undefined;
      if (ambiguous) {
        const fromModel =
          r.ambiguity && r.ambiguity !== null
            ? normalizeAmbiguityPayload(r.ambiguity, { competingCodes: codesEv })
            : null;
        if (fromModel) {
          ambEv = fromModel;
        } else if (codesEv.length >= 2) {
          ambEv = buildFallbackAmbiguityFromCodes(codesEv);
        } else {
          ambEv =
            normalizeAmbiguityPayload(
              {
                reason: "generic_low_confidence",
                primary_question: NCM_AMBIGUITY_GENERIC_FALLBACK_QUESTION,
              },
              { competingCodes: codesEv.length ? codesEv : [ncm_code] }
            ) ?? undefined;
        }
      }

      const followRaw = Array.isArray(r.follow_up_questions) ? r.follow_up_questions : [];
      let followUp = followRaw
        .map((x) => String(x).trim())
        .filter(Boolean)
        .slice(0, 2);
      if (ambEv) {
        followUp = ambiguityQuestionsList(ambEv);
      } else if (ambiguous && followUp.length === 0) {
        followUp = [NCM_AMBIGUITY_GENERIC_FALLBACK_QUESTION];
      }

      let confOut = confidence;
      if (ambEv) {
        confOut = Math.min(confOut, AMBIGUITY_OPEN_CONF_CAP);
      }

      // Refuerzo en código del rigor de despachante (no confiar solo en el prompt).
      // Eximimos los casos con piso legal de wearable (8517.62), que se fijan a propósito.
      const wearableFloorEv =
        wearable8527Fix ||
        (isWearableConnectedDevice(text) && /^8517\.62/.test(ncm_code) && ncm_code !== "9999.99.99");
      if (
        REQUIRE_DOCUMENTED_EXCLUSIONS &&
        ncm_code !== "9999.99.99" &&
        discarded.length === 0 &&
        !wearableFloorEv
      ) {
        confOut = Math.min(confOut, NO_EXCLUSIONS_CONF_CAP);
      }
      let needsClarEv = followUp.length > 0 || ambiguous;
      if (ncm_code !== "9999.99.99" && !wearableFloorEv && confOut < EXPERT_CONF_GATE) {
        needsClarEv = true;
        if (!followUp.length) followUp = [NCM_AMBIGUITY_GENERIC_FALLBACK_QUESTION];
      }

      return {
        ncm_code,
        confidence: confOut,
        rationale,
        candidates: [],
        ambiguous,
        discarded: discarded.length ? discarded : undefined,
        discardedCandidates: discarded.length
          ? discarded.map((d) => ({ code: d.ncm, reason: d.reason }))
          : undefined,
        missing_info_questions: followUp.length ? followUp : undefined,
        needs_clarification: needsClarEv,
        ambiguity: ambEv,
      };
    }

    let confidence = clamp01(Number(r.confidence ?? 0));
    let rationale = String(r.rationale ?? "Clasificación sugerida por IA.").trim();
    const candidates = Array.isArray(r.candidates) && r.candidates.length
      ? r.candidates.slice(0, 6).map((c) => ({
          ncm_code: formatNcm(String(c.ncm_code ?? "")),
          confidence: clamp01(Number(c.confidence ?? 0)),
          rationale: c.rationale ? String(c.rationale) : undefined,
        }))
      : [];

    const hsRaw = String(r.hs_heading ?? "").replace(/\D/g, "");
    let hs_heading = hsRaw.length === 4 ? hsRaw : undefined;
    let kind = r.kind ? String(r.kind).trim() : undefined;
    let search_terms = Array.isArray(r.search_terms)
      ? r.search_terms.map((x) => String(x).trim()).filter(Boolean).slice(0, 6)
      : undefined;

    const modelQuestions = Array.isArray(r.missing_info_questions)
      ? r.missing_info_questions.map((x) => String(x).trim()).filter(Boolean).slice(0, 3)
      : [];
    let missing_info_questions: string[] | undefined = modelQuestions.length ? modelQuestions : undefined;
    let needs_clarification = Boolean(r.needs_clarification);

    let guard8527: ReturnType<typeof tryGuardWearableVs8527> = null;
    const guardPhone = tryGuardWearableVsPhone(text, ncm_code, confidence, rationale, hs_heading, kind, search_terms);
    if (guardPhone) {
      ncm_code = guardPhone.ncm_code;
      confidence = guardPhone.confidence;
      rationale = guardPhone.rationale;
      hs_heading = guardPhone.hs_heading;
      kind = guardPhone.kind;
      search_terms = guardPhone.search_terms;
      missing_info_questions = guardPhone.missing_info_questions;
      needs_clarification = guardPhone.needs_clarification;
    } else {
      guard8527 = tryGuardWearableVs8527(text, ncm_code, confidence, rationale, hs_heading, kind, search_terms);
      if (guard8527) {
        ncm_code = guard8527.ncm_code;
        confidence = guard8527.confidence;
        rationale = guard8527.rationale;
        hs_heading = guard8527.hs_heading;
        kind = guard8527.kind;
        search_terms = guard8527.search_terms;
        missing_info_questions = guard8527.missing_info_questions;
        needs_clarification = guard8527.needs_clarification;
      } else if (!needs_clarification && modelQuestions.length) {
        needs_clarification = true;
      }
    }

    if (!guardPhone && !guard8527 && isWearableConnectedDevice(text) && ncm_code === "9999.99.99") {
      ncm_code = "8517.62.72";
      confidence = Math.max(confidence, 0.7);
      rationale = `${rationale} — Clasificación orientativa **8517.62** para smartwatch/wearable (aparatos para transmisión/recepción de datos).`;
      needs_clarification = false;
      missing_info_questions = undefined;
      hs_heading = hs_heading ?? "8517";
    } else if (
      !guardPhone &&
      isWearableConnectedDevice(text) &&
      /^8517\.62/.test(ncm_code) &&
      ncm_code !== "9999.99.99"
    ) {
      confidence = Math.max(confidence, 0.72);
      needs_clarification = false;
      missing_info_questions = undefined;
    }

    let ambiguous =
      Boolean(guardPhone?.ambiguous) ||
      Boolean(guard8527?.ambiguous) ||
      needs_clarification ||
      (missing_info_questions && missing_info_questions.length > 0) ||
      confidence < 0.45;

    if (
      isWearableConnectedDevice(text) &&
      /^8517\.62/.test(ncm_code) &&
      ncm_code !== "9999.99.99"
    ) {
      ambiguous = false;
    }

    let ambiguityOut: NormalizedAmbiguity | undefined = guardPhone?.ambiguity;

    if (!ambiguous) {
      ambiguityOut = undefined;
    } else if (!ambiguityOut) {
      const codes = collectCompetingCodesFree(ncm_code, candidates);
      const rawAmb = r.ambiguity;
      ambiguityOut =
        rawAmb && rawAmb !== null
          ? normalizeAmbiguityPayload(rawAmb, { competingCodes: codes }) ?? undefined
          : undefined;
      if (!ambiguityOut && codes.length >= 2) {
        ambiguityOut = buildFallbackAmbiguityFromCodes(codes);
      }
      if (!ambiguityOut) {
        ambiguityOut =
          normalizeAmbiguityPayload(
            {
              reason: "generic_low_confidence",
              primary_question: NCM_AMBIGUITY_GENERIC_FALLBACK_QUESTION,
            },
            { competingCodes: codes.length ? codes : [ncm_code] }
          ) ?? undefined;
      }
    }

    if (ambiguityOut) {
      missing_info_questions = ambiguityQuestionsList(ambiguityOut);
      needs_clarification = true;
      confidence = Math.min(confidence, AMBIGUITY_OPEN_CONF_CAP);
    } else if (
      (needs_clarification || ambiguous || ncm_code === "9999.99.99") &&
      (!missing_info_questions || missing_info_questions.length === 0)
    ) {
      const skipWearable8517Resolved =
        isWearableConnectedDevice(text) &&
        /^8517\.62/.test(ncm_code) &&
        ncm_code !== "9999.99.99";
      if (!skipWearable8517Resolved) {
        missing_info_questions = [NCM_AMBIGUITY_GENERIC_FALLBACK_QUESTION];
        needs_clarification = true;
      }
    }

    if (needs_clarification && missing_info_questions && missing_info_questions.length > 0) {
      ambiguous = true;
      if (
        isWearableConnectedDevice(text) &&
        /^8517\.62/.test(ncm_code) &&
        ncm_code !== "9999.99.99"
      ) {
        ambiguous = false;
      }
    }

    if (!ambiguous) {
      ambiguityOut = undefined;
    }

    const discardedModelRaw = Array.isArray(r.discarded) ? r.discarded : [];
    const discardedModel = discardedModelRaw
      .slice(0, 12)
      .map((d) => ({
        ncm: formatNcm(String(d?.ncm ?? "")),
        reason: String(d?.reason ?? "").trim() || "—",
      }))
      .filter((d) => ncmDigits(d.ncm).length >= 6 && d.ncm !== "9999.99.99");

    // Refuerzo en código del rigor de despachante (igual que en modo evidencia).
    const wearableFloorFree =
      isWearableConnectedDevice(text) && /^8517\.62/.test(ncm_code) && ncm_code !== "9999.99.99";
    if (
      REQUIRE_DOCUMENTED_EXCLUSIONS &&
      ncm_code !== "9999.99.99" &&
      discardedModel.length === 0 &&
      !wearableFloorFree
    ) {
      confidence = Math.min(confidence, NO_EXCLUSIONS_CONF_CAP);
    }
    if (ncm_code !== "9999.99.99" && !wearableFloorFree && confidence < EXPERT_CONF_GATE) {
      needs_clarification = true;
      ambiguous = true;
      if (!missing_info_questions || missing_info_questions.length === 0) {
        missing_info_questions = [NCM_AMBIGUITY_GENERIC_FALLBACK_QUESTION];
      }
    }

    return {
      ncm_code,
      confidence,
      rationale,
      candidates,
      hs_heading,
      kind,
      search_terms,
      missing_info_questions,
      needs_clarification,
      ambiguous,
      ambiguity: ambiguityOut,
      discarded: discardedModel.length ? discardedModel : undefined,
      discardedCandidates: discardedModel.length
        ? discardedModel.map((d) => ({ code: d.ncm, reason: d.reason }))
        : undefined,
    };
  } catch (err) {
    console.error("[ncmClassifier] FAILED:", err instanceof Error ? err.message : err);
    return {
      ncm_code: "9999.99.99",
      confidence: 0.2,
      rationale: "Fallback: no se pudo clasificar con IA.",
      candidates: [],
      ambiguous: evidence.length ? true : undefined,
    };
  }
}
