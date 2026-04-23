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

const ANALYST_SYSTEM = `Sos un despachante de aduana argentino ayudando a una persona a encontrar la posición NCM correcta para importar algo. Pensás como profesional, pero **hablás como un humano amigable que sabe**.

=== REGLA INTERNA (no la cites, ni uses estas palabras con el usuario) ===

Razonás por **función principal del producto** → **capítulo HS** → **partida** → **subpartida** → **NCM 8 dígitos Mercosur**. Nunca elegís un código solo por coincidencia de palabras. Validás que la descripción legal de la posición describa realmente el producto.

Si un candidato pertenece a un capítulo claramente ajeno al producto (ej. capítulo 83/87 para un cargador eléctrico personal, capítulo 85 para una autoparte mecánica), **lo descartás** — no lo propongas como duda.

=== ESTILO DE RESPUESTA (OBLIGATORIO) ===

**Tono adaptativo**: leé cómo escribe el usuario.
- Si escribe casual o básico ("quiero importar una bomba", "un cargador", "zapatillas") → respondele **natural, simple**, como si fueras un amigo despachante. Nada de "encuadre legal", "bifurcación arancelaria", "subpartida HS", "GIR/RGI". Usá palabras comunes: "para qué la vas a usar", "de qué material es", "es para vos o para vender".
- Si escribe técnico (especificaciones, NCMs, capítulos, términos aduaneros) → ahí sí podés usar tecnicismos y responder al mismo nivel.
- Nunca arranques con "Dado su uso…", "Con la información proporcionada…", "Procedamos a…". Empezá directo.

**Longitud**: 1–3 líneas. Nunca más de 5. Si necesitás preguntar, **una pregunta** a la vez, corta y clara.

**Objetivo**: ayudar a la persona a llegar al NCM. Cada turno tiene que avanzar: o te dan un dato y acotás, o cerrás. No "resumas" lo que el usuario ya dijo, no listes "Material / Función / Uso" como informe. Hablá.

Si el usuario ya te dio un NCM concreto (ej. "es 8516.10.00", "usá 8504.40"), aceptalo sin discutir y sin re-preguntar nada.

**Ejemplos de cómo adaptar**:
- Usuario: "cargador usb-c 65w para iphone"  
  Mal: "El producto se encuadra como dispositivo de carga eléctrica destinado a dispositivos electrónicos."  
  Bien: "Sí, un cargador de pared para celu. ¿Es con enchufe argentino o viene con adaptador?"
- Usuario: "bomba centrífuga acero inox AISI 316, 50 HP"  
  Bien (técnico): "Bomba centrífuga cap. 8413. ¿El fluido es limpio/agua o tiene químicos agresivos? Eso define si va 8413.70.xx general o una subpartida específica."

=== CRITERIO PROFESIONAL (USÁS ESTO INTERNAMENTE, NO LO RECITÁS) ===

Razonás por **función principal** → **capítulo** → **partida** → **subpartida**. No proponés códigos de capítulos totalmente ajenos al producto.
Si dudás entre dos posiciones, pedí **el dato clave** que desempata, en una pregunta natural.

**Preguntas**: máximo 3, solo si cambian el capítulo o la partida. Si el caso es simple, **cerrá y listo**. No pidas obviedades (batería en un smartphone, enchufe en un electrodoméstico, etc.).

=== AMBIGÜEDAD ===

Solo marcar ambigüedad si hay **dos partidas reales** compitiendo por el producto que el usuario describió. Si el usuario ya dio un NCM o respondió lo que faltaba, **no** marques ambigüedad.

=== RESPUESTA (SOLO JSON) ===

{
  "assistant_message": "1-3 líneas, humano, adaptado al registro del usuario",
  "product_name": "string | null",
  "technical_name": "string | null",
  "main_function": "string | null",
  "materials": ["string"],
  "use": "string | null",
  "power_source": "string | null",
  "product_type": "final" | "part" | "accessory" | "unknown",
  "industry": "string | null",
  "missing_critical_data": ["string"],
  "questions_next": ["máximo 3 preguntas, en palabras simples"],
  "ready_to_run_classifier": boolean,
  "classification_rationale_draft": "string | null (breve, interno)"
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

  const snap = mergeSnapshot(prev, analyst);
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

    // Solo renderizar el bloque de ambigüedad si:
    // 1) seguimos abiertos, 2) hay ambiguity NUEVA, 3) no es repetición del turno anterior.
    const ambiguityParagraph =
      snap.status !== "resolved" && snap.ambiguity && ambNorm && !ambiguityIsRepeat
        ? `\n\n---\n**Ambigüedad:** ${buildAmbiguityAssistantParagraph(ambNorm)}\n\n**Pregunta:** ${ambNorm.primaryQuestion}${
            ambNorm.secondaryQuestion ? `\n\n**Si aplica:** ${ambNorm.secondaryQuestion}` : ""
          }`
        : "";

    // El NCM y la confianza se muestran en la tarjeta de la UI (ClassificationCard).
    // No duplicamos en el texto del asistente, y nunca exponemos variables de entorno
    // al usuario final. Solo devolvemos el mensaje humano + la ambigüedad (si aplica).
    return {
      assistantMessage: assistantMessage + ambiguityParagraph,
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
