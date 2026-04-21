import { openaiJson } from "@/lib/ai/openaiClient";
import { buildAmbiguityAssistantParagraph, type NormalizedAmbiguity } from "@/lib/clasificar-ncm/ncmAmbiguity";
import { NCM_ANALYST_PROFESSIONAL_BLOCK } from "@/lib/clasificar-ncm/professionalModePrompt";
import { normalizeNcmCode, runNcmMotor } from "@/lib/clasificar-ncm/runNcmMotor";
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

const ANALYST_SYSTEM =
  `Sos analista técnico senior en comercio exterior (Argentina / NCM Mercosur). No sos un chatbot de marketing.

` +
  NCM_ANALYST_PROFESSIONAL_BLOCK +
  `
=== ESTILO DE RESPUESTA (OBLIGATORIO) ===

- **Breve**: 1 a 3 líneas como regla. Nunca más de 5. Sin intro ni despedida.
- **Nada de resumen repetido**: NO vuelvas a listar "Material", "Función", "Uso" si ya se habló antes. Solo mencioná lo nuevo o lo decisivo.
- **Sin tablas ni secciones con títulos** salvo que el usuario las pida explícitamente. Un párrafo plano.
- **Una pregunta por turno como mucho.** Si ya pediste un dato que no te respondieron, no lo repitas formateado; reformulalo natural.
- Si el usuario ya dio un NCM concreto (ej. "es 8516.10.00"), **aceptalo** sin pedir más datos y sin volver a plantear el dilema.
- Tono profesional, directo, sin frases de relleno ("podemos avanzar", "con la información proporcionada"). No hace falta decir que estás procesando.

=== INFERENCIA Y CONOCIMIENTO GENERAL ===

Antes de preguntar algo, inferí con conocimiento del producto. NO pidas al usuario lo que cualquier importador daría por sentado. Si el dato no cambia partida/subpartida → no lo pidas.

**Máximo 3 preguntas** en "questions_next", y solo si afectan: función principal | parte/accesorio/final | capítulo/partida | material dominante en mezclas. Si ninguna aplica → array vacío.

=== AMBIGÜEDAD ===

Solo señalá ambigüedad si hay duda real entre capítulos o partidas. Si el usuario ya resolvió el dilema (ej. te dice un NCM exacto), **NO** marques ambigüedad ni pidas más.

=== RESPUESTA (SOLO JSON) ===

{
  "assistant_message": "máximo 3 líneas, texto plano sin listas decorativas",
  "product_name": "string | null",
  "technical_name": "string | null",
  "main_function": "string | null",
  "materials": ["string"],
  "use": "string | null",
  "power_source": "string | null",
  "product_type": "final" | "part" | "accessory" | "unknown",
  "industry": "string | null",
  "missing_critical_data": ["string"],
  "questions_next": ["máximo 3 preguntas"],
  "ready_to_run_classifier": boolean,
  "classification_rationale_draft": "string | null"
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
  ready_to_run_classifier?: boolean;
  classification_rationale_draft?: string | null;
};

function mergeSnapshot(prev: CaseSnapshot, a: AnalystJson): CaseSnapshot {
  const pt = (a.product_type ?? prev.productType) as ProductType | undefined;
  const productType: ProductType =
    pt === "final" || pt === "part" || pt === "accessory" ? pt : prev.productType ?? "unknown";

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

  let snap = mergeSnapshot(prev, analyst);
  const assistantMessage = String(analyst.assistant_message ?? "").trim() || "Sin respuesta del modelo.";
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
    const ambiguous = motor.engine.ambiguous;

    snap.candidates = motor.candidates.length ? motor.candidates : snap.candidates;
    snap.discardedNotes = motor.discardedNotes.length ? motor.discardedNotes : snap.discardedNotes;
    if (motor.discardedCandidates?.length) {
      snap.discardedCandidates = motor.discardedCandidates;
    }
    snap.recommendedNcm = ncm ?? undefined;
    snap.confidence = conf;
    snap.pendingQuestions = motor.questions.length ? motor.questions : undefined;
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

    const ambNorm: NormalizedAmbiguity | undefined =
      motor.engine.mode === "full"
        ? (motor.engine.pipeline.ncmMeta as { ambiguity?: NormalizedAmbiguity } | undefined)?.ambiguity
        : motor.engine.classification.ambiguity ?? undefined;

    const pipeline = motor.engine.mode === "full" ? motor.engine.pipeline : null;

    // Solo renderizar el bloque de ambigüedad si:
    // 1) seguimos abiertos, 2) hay ambiguity NUEVA, 3) no es repetición del turno anterior.
    const ambiguityParagraph =
      snap.status !== "resolved" && snap.ambiguity && ambNorm && !ambiguityIsRepeat
        ? `\n\n---\n**Ambigüedad:** ${buildAmbiguityAssistantParagraph(ambNorm)}\n\n**Pregunta:** ${ambNorm.primaryQuestion}${
            ambNorm.secondaryQuestion ? `\n\n**Si aplica:** ${ambNorm.secondaryQuestion}` : ""
          }`
        : "";

    const extraFull =
      motor.engine.mode === "full" && ncm && conf < 0.7 && !pipeline?.pcram
        ? `\n\n**Clasificación tentativa.** Confianza ${Math.round(conf * 100)}% (umbral recomendado ≥70% para dar por cerrado). Podés afinar datos o validar con despachante.`
        : motor.engine.mode === "fast" && ncm && conf < 0.7
          ? `\n\n**Clasificación tentativa.** Confianza ${Math.round(conf * 100)}% (umbral recomendado ≥70% para dar por cerrado). Podés afinar datos o validar con despachante.`
          : "";

    const definitiveFull =
      ncm && motor.engine.mode === "full"
        ? `\n\n---\n**NCM (8 dígitos, formato Mercosur):** \`${normalizeNcmCode(ncm) || ncm}\`${
            pipeline?.pcram
              ? "\n\n*Posición confirmada contra descripción en nomenclador (PCRAM).*"
              : "\n\n*Validá la última posición estadística con el despachante si el producto tiene variante no descrita.*"
          }`
        : ncm && motor.engine.mode === "fast"
          ? `\n\n---\n**NCM (8 dígitos, formato Mercosur):** \`${normalizeNcmCode(ncm) || ncm}\`\n\n*Clasificación rápida en chat. Para pipeline completo (nomenclador/PCRAM), configurá \`NCM_CLASIFICAR_CHAT_USE_FULL_PIPELINE=1\` en el servidor o validá con despachante.*`
          : "";

    return {
      assistantMessage: assistantMessage + ambiguityParagraph + extraFull + definitiveFull,
      snapshot: snap,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    snap.status = "tentative";
    return {
      assistantMessage:
        assistantMessage +
        `\n\nEl motor de NCM no pudo completar la consulta (${msg}). El análisis previo sigue valiendo; probá agregar más datos técnicos.`,
      snapshot: { ...snap, errorMessage: msg },
    };
  }
}
