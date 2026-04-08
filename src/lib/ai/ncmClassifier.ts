import { openaiJson } from "@/lib/ai/openaiClient";

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
} | null {
  if (!isWearableMisclassifiedAsPhone(text, ncm_code)) return null;

  const q = [
    "¿El producto es un **smartwatch / reloj inteligente de muñeca** (pantalla, apps, sensores) o un **teléfono celular smartphone**? (8517.13 es solo para teléfonos; wearables suelen ir por 8517.62 u otra subpartida del 8517 distinta de 8517.13.)",
    "Si es smartwatch: ¿tiene **eSIM / línea celular propia** o solo **Bluetooth** vinculado al teléfono? (puede cambiar la subpartida).",
  ];

  return {
    ncm_code: "9999.99.99",
    confidence: Math.min(confidence, 0.38),
    rationale: `${rationale} — Ajuste automático: 8517.13 es **teléfono celular**; este texto describe un **wearable**, no un smartphone. Se busca posición en 8517.62 (o equivalente) vía nomenclador.`,
    hs_heading: "8517",
    kind: kind ? `${kind} (wearable vs teléfono)` : "Dispositivo cap. 8517 — confirmar tipo",
    search_terms: uniqueTerms([...(search_terms ?? []), "reloj inteligente", "smartwatch", "8517.62"]),
    missing_info_questions: q,
    needs_clarification: true,
    ambiguous: true,
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

const EVIDENCE_SYSTEM_PROMPT = `Sos un clasificador profesional de NCM (Mercosur / Argentina), actuando como un despachante de aduana senior.

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
   - Si los candidatos mezclan teléfonos y wearables y no podés decidir, devolvé 9999.99.99, ambiguous true, y completá follow_up_questions.

4. Aplicar RGI:
   - RGI 1: Comparar directamente con la descripción legal de cada candidato (usá el título provisto como proxy)
   - RGI 3a: Elegir la descripción MÁS ESPECÍFICA
   - RGI 3b: Si es un conjunto/kit → elegir por carácter esencial

5. DESCARTAR candidatos: Para cada candidato descartado, indicar brevemente por qué NO aplica (si corresponde)

6. DECISIÓN FINAL:
   - Elegir el mejor candidato de la lista
   - Si hay duda razonable → ambiguous = true (y preferí bajar confidence)

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
- follow_up_questions: array de strings, máximo 2; antes de cada una: **«¿Esto puede cambiar la clasificación?»** Solo si afecta función principal, parte/accesorio/final, capítulo/partida o material dominante en mezclas; si no, dejá vacío`;

const SYSTEM_PROMPT = `Sos un clasificador experto NCM (Argentina/Mercosur). Devolvé SOLO JSON.

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
- Esos productos suelen ir por **8517.62** (aparatos para transmisión/recepción de voz, datos, etc. — incluye wearables) u otra subpartida del 8517 que NO sea 8517.13. Elegí la subpartida más específica que conozcas para "reloj inteligente" / "smartwatch".
- **Marca "Apple" sola no implica**: Apple Watch ≠ iPhone. Si el texto dice "Apple Watch" o "Watch Series", es **wearable**, no smartphone.

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

**Máximo 3 preguntas**, solo si pueden afectar:
- función principal; o
- producto final vs parte vs accesorio; o
- capítulo / partida (4 dígitos); o
- material dominante en mezclas/composición.

3. **missing_info_questions**: vacío salvo que quede una duda real en esos frentes. NO preguntar por datos obvios o inferibles.
4. Si el texto es ambiguo entre **dos capítulos o partidas distintas** (ej. reloj mecánico vs smart; tejido vs plástico que define capítulo), needs_clarification true y preguntas mínimas que pasen el test anterior.
5. Si tenés suficiente información (incluidas inferencias razonables), needs_clarification: false y missing_info_questions: [].

Devolvé JSON con:
- ncm_code: "XXXX.XX.XX"
- confidence: 0 a 1 (bajá si hay duda)
- rationale: cadena breve: función principal → por qué esta partida (mencionar RGI si aplica)
- candidates: 2-3 alternativas [{ncm_code, confidence, rationale}]
- hs_heading: 4 dígitos (ej "8517")
- kind: etiqueta corta español
- search_terms: 2-4 términos para buscar en nomenclador/PCRAM (incluí términos legales, no solo marca)
- needs_clarification: boolean
- missing_info_questions: array de strings, máximo 3, vacío si no hace falta`;

export async function classifyWithAI(
  text: string,
  opts?: {
    candidates?: NcmEvidenceCandidate[];
    evidenceNote?: string;
  }
): Promise<NcmClassification> {
  const evidence = Array.isArray(opts?.candidates) ? opts!.candidates.slice(0, 12) : [];

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
        opts?.evidenceNote ? `\nNota adicional:\n${String(opts.evidenceNote).slice(0, 1000)}` : "",
      ].join("\n")
    : [
        "Clasificá el NCM:",
        opts?.evidenceNote ? `EVIDENCE_NOTE:\n${String(opts.evidenceNote).slice(0, 1000)}` : "",
        text.slice(0, 4000),
      ].join("\n");

  try {
    const start = Date.now();
    // eslint-disable-next-line no-console
    console.log("[ncmClassifier] calling OpenAI for:", text.slice(0, 80), evidence.length ? "(evidence)" : "");

    const r = await openaiJson<{
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
    }>({ system, user, model: process.env.OPENAI_MODEL || "gpt-4o-mini" });

    const elapsed = Date.now() - start;
    let ncm_code = formatNcm(String(r.ncm_code ?? ""));
    // eslint-disable-next-line no-console
    console.log(`[ncmClassifier] result: ${ncm_code} (confidence: ${r.confidence}, ${elapsed}ms)`);

    if (evidence.length) {
      const inList = ncm_code === "9999.99.99" || isNcmInEvidence(ncm_code, evidence);
      if (!inList) {
        ncm_code = "9999.99.99";
      }
      let ambiguous = Boolean(r.ambiguous);
      if (ncm_code === "9999.99.99") ambiguous = true;
      const confidence = clamp01(Number(r.confidence ?? 0));
      const rationale = String(r.rationale ?? "Clasificación restringida a candidatos.").trim();
      const discardedRaw = Array.isArray(r.discarded) ? r.discarded : [];
      const discarded = discardedRaw
        .slice(0, 12)
        .map((d) => ({
          ncm: formatNcm(String(d?.ncm ?? "")),
          reason: String(d?.reason ?? "").trim() || "—",
        }))
        .filter((d) => ncmDigits(d.ncm).length >= 6 && d.ncm !== "9999.99.99");

      const followRaw = Array.isArray(r.follow_up_questions) ? r.follow_up_questions : [];
      const followUp = followRaw
        .map((x) => String(x).trim())
        .filter(Boolean)
        .slice(0, 2);

      return {
        ncm_code,
        confidence,
        rationale,
        candidates: [],
        ambiguous,
        discarded: discarded.length ? discarded : undefined,
        missing_info_questions: followUp.length ? followUp : undefined,
        needs_clarification: followUp.length > 0 || ambiguous,
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

    const guard = tryGuardWearableVsPhone(text, ncm_code, confidence, rationale, hs_heading, kind, search_terms);
    if (guard) {
      ncm_code = guard.ncm_code;
      confidence = guard.confidence;
      rationale = guard.rationale;
      hs_heading = guard.hs_heading;
      kind = guard.kind;
      search_terms = guard.search_terms;
      missing_info_questions = guard.missing_info_questions;
      needs_clarification = guard.needs_clarification;
    } else if (!needs_clarification && modelQuestions.length) {
      needs_clarification = true;
    }

    const ambiguous =
      Boolean(guard?.ambiguous) ||
      needs_clarification ||
      (missing_info_questions && missing_info_questions.length > 0) ||
      confidence < 0.45;

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
    };
  } catch (err) {
    // eslint-disable-next-line no-console
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
