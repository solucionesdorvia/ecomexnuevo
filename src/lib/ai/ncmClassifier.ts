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

const CLASSIFICATION_SYSTEM = `Eres un clasificador experto de NCM (Nomenclatura Común del Mercosur) para Argentina.

METODOLOGÍA OBLIGATORIA — Seguí estos pasos en orden:

PASO 1 — ANÁLISIS DEL PRODUCTO
Sintetizá en 2-3 líneas: qué es, de qué material está hecho, para qué sirve.
Identificá palabras clave técnicas para búsqueda.

PASO 2 — DETERMINACIÓN DE SECCIÓN Y CAPÍTULO
Determiná la Sección (I a XXI) y Capítulo (01 a 97) correctos.
Regla: La función principal del producto define el capítulo, NO el material.

Secciones clave:
- Sección XVI (Cap. 84-85): Máquinas, aparatos eléctricos
- Sección XVII (Cap. 86-89): Material de transporte
- Sección IV (Cap. 16-24): Productos alimenticios
- Sección XI (Cap. 50-63): Materias textiles
- Sección VII (Cap. 38-40): Plásticos, caucho
- Sección XV (Cap. 72-83): Metales comunes

PASO 3 — IDENTIFICACIÓN DE PARTIDA (4 DÍGITOS)
Dentro del capítulo, buscá la partida que mejor describe el producto.
Aplicá RGI 1: El texto de la partida + notas de sección/capítulo prevalecen.
Aplicá RGI 3a: La descripción más específica tiene prioridad.

PASO 4 — SUBPARTIDA Y NCM (6 y 8 DÍGITOS)
Seleccioná la subpartida de 6 dígitos y el ítem NCM de 8 dígitos.
Verificá posiciones vecinas (subpartidas hermanas) antes de confirmar.
RGI 6: Las RGI 1-5 se aplican a nivel subpartida.

PASO 5 — VALIDACIÓN CRUZADA
Verificá que la posición elegida sea la MÁS ESPECÍFICA.
Listá al menos 2 posiciones DESCARTADAS con motivo.
Verificá exclusiones por notas de capítulo.

PASO 6 — EVALUACIÓN DE CONFIANZA
Base 60%. Sumá:
+15% coincidencia literal con descripción oficial
+10% sin ambigüedad en RGI
+10% posiciones vecinas validadas
+5% exclusiones claras documentadas
Restá:
-20% si hay ambigüedad entre capítulos
-10% si faltan datos técnicos CRÍTICOS (no cosméticos)

IMPORTANTE: Para productos comunes y bien conocidos (cargadores USB, auriculares, ropa básica, juguetes simples), la confianza debería ser >= 70% sin necesitar datos adicionales. Solo pedí información extra si hay ambigüedad REAL entre capítulos o subpartidas. No pidas certificaciones, manuales, o datos de packaging — eso NO afecta la clasificación NCM.

REGLAS CRÍTICAS (OBLIGATORIAS — prevalecen sobre tu conocimiento general):

CARGADORES Y FUENTES DE ALIMENTACIÓN:
- Cargadores USB (Type-C, micro-USB, etc.), adaptadores de corriente, fuentes switching → 8504.40.XX (convertidores estáticos)
- 8504.40.21: rectificadores (conversión AC/DC) potencia ≤ 750W → esto es lo correcto para la mayoría de cargadores USB
- 8504.40.29: otros convertidores estáticos ≤ 750W
- NUNCA clasificar un cargador USB como 8504.10.XX (eso es transformadores de dieléctrico LÍQUIDO, tipo los de postes de electricidad)
- NUNCA clasificar un cargador USB como 8504.31/32/33/34 (eso es otros transformadores)
- Smartphones/tablets: 8517.13 (teléfonos) o 8471 (máquinas de tratamiento de datos)
- Auriculares bluetooth: 8518.30
- Cables USB: 8544.42
- Vehículos personas: 8703, mercancías: 8704
- Ropa: Cap.61 (punto) o 62 (tejido plano)
- Juguetes: Cap.95

Devolvé SOLO JSON válido con estas claves:
- ncm_code: formato XXXX.XX.XX
- confidence: 0 a 1
- rationale: explicación paso a paso de cómo llegaste al NCM (sección → capítulo → partida → subpartida)
- candidates: array de 2-4 posiciones alternativas con ncm_code, confidence, rationale
- hs_heading: 4 dígitos (ej: "8504")
- kind: etiqueta corta en español
- search_terms: 2-6 términos para buscar en PCRAM
- missing_info_questions: 1-4 preguntas si faltan datos técnicos críticos
- excluded_positions: array de objetos {ncm_code, reason} con posiciones descartadas y por qué`;

export async function classifyWithAI(
  text: string,
  opts?: {
    candidates?: NcmEvidenceCandidate[];
    evidenceNote?: string;
  }
): Promise<NcmClassification> {
  const knowledge = process.env.NCM_KNOWLEDGE ?? "";
  const evidence = Array.isArray(opts?.candidates) ? opts!.candidates.slice(0, 12) : [];

  const system = [
    CLASSIFICATION_SYSTEM,
    evidence.length
      ? "REGLA CRÍTICA: si te doy una lista de candidatos (EVIDENCE_CANDIDATES), tu ncm_code DEBE ser uno de esos códigos. Si no podés decidir, devolvé 9999.99.99 con confidence baja y 1–4 missing_info_questions."
      : "",
    knowledge ? `Base de conocimiento adicional:\n${knowledge}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const user = [
    "Clasificá el NCM del siguiente producto usando la metodología de 6 pasos.",
    "IMPORTANTE: Seguí cada paso y documentá tu razonamiento en 'rationale'.",
    opts?.evidenceNote ? `EVIDENCE_NOTE:\n${String(opts.evidenceNote).slice(0, 1500)}` : "",
    evidence.length
      ? `EVIDENCE_CANDIDATES (elegí de esta lista):\n${JSON.stringify(evidence, null, 2)}`
      : "",
    "Producto:",
    text.slice(0, 8000),
  ].join("\n");

  try {
    const r = await openaiJson<{
      ncm_code?: string;
      confidence?: number;
      rationale?: string;
      candidates?: Array<{
        ncm_code?: string;
        confidence?: number;
        rationale?: string;
      }>;
      hs_heading?: string;
      kind?: string;
      search_terms?: string[];
      missing_info_questions?: string[];
      excluded_positions?: Array<{ ncm_code?: string; reason?: string }>;
    }>({ system, user, model: process.env.OPENAI_MODEL || "gpt-4o-mini" });

    const ncm_code = formatNcm(String(r.ncm_code ?? ""));
    const confidence = clamp01(Number(r.confidence ?? 0));

    const excludedInfo = Array.isArray(r.excluded_positions)
      ? r.excluded_positions
          .slice(0, 4)
          .map((e) => `- Descartado ${formatNcm(String(e.ncm_code ?? ""))}: ${e.reason ?? "sin motivo"}`)
          .join("\n")
      : "";

    const rationale = [
      String(r.rationale ?? "Clasificación sugerida por IA.").trim(),
      excludedInfo ? `\nPosiciones descartadas:\n${excludedInfo}` : "",
    ].join("");

    const candidates =
      Array.isArray(r.candidates) && r.candidates.length
        ? r.candidates.slice(0, 6).map((c) => ({
            ncm_code: formatNcm(String(c.ncm_code ?? "")),
            confidence: clamp01(Number(c.confidence ?? 0)),
            rationale: c.rationale ? String(c.rationale) : undefined,
          }))
        : [];

    const hsRaw = String(r.hs_heading ?? "").replace(/\D/g, "");
    const hs_heading = hsRaw.length === 4 ? hsRaw : undefined;
    const kind = r.kind ? String(r.kind).trim() : undefined;
    const search_terms = Array.isArray(r.search_terms)
      ? r.search_terms.map((x) => String(x).trim()).filter(Boolean).slice(0, 6)
      : undefined;
    const missing_info_questions = Array.isArray(r.missing_info_questions)
      ? r.missing_info_questions.map((x) => String(x).trim()).filter(Boolean).slice(0, 4)
      : undefined;

    return {
      ncm_code,
      confidence,
      rationale,
      candidates,
      hs_heading,
      kind,
      search_terms,
      missing_info_questions,
    };
  } catch {
    return {
      ncm_code: "9999.99.99",
      confidence: 0.2,
      rationale: "Fallback: no se pudo clasificar con IA.",
      candidates: [],
    };
  }
}
