import { classifyWithAI, type NcmClassification } from "@/lib/ai/ncmClassifier";
import { openaiJson } from "@/lib/ai/openaiClient";
import { buildAmbiguityAssistantParagraph } from "@/lib/clasificar-ncm/ncmAmbiguity";
import { formatMercosurNcm8, ncmDigitsOnly } from "@/lib/ncm/knowledge/normalize";
import { productFromTextPipeline } from "@/lib/scraper/productFromTextPipeline";
import { NCM_AMBIGUITY_FALLBACK_QUESTION, NCM_ANALYST_PROFESSIONAL_BLOCK } from "@/lib/clasificar-ncm/professionalModePrompt";
import type { CaseSnapshot, ChatMessage, NcmCandidateItem, ProductType } from "./types";

const AMBIGUITY_UI_CONF_CAP = 0.68;

function mapClassifierAmbiguityToSnapshot(
  a: NcmClassification["ambiguity"],
  prevAmb: CaseSnapshot["ambiguity"]
): CaseSnapshot["ambiguity"] {
  if (!a) return undefined;
  return {
    reason: a.reason,
    competingCandidates: a.competingCandidates,
    decisiveField: a.decisiveField,
    question: a.primaryQuestion,
    secondaryQuestion: a.secondaryQuestion,
    answered: Boolean(prevAmb),
  };
}

function normalizeNcmCode(raw: string | undefined): string {
  const d = ncmDigitsOnly(String(raw ?? ""));
  if (d.length < 6) return "";
  return formatMercosurNcm8(d);
}

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

const ANALYST_TIMEOUT_MS = Number(process.env.NCM_CHAT_ANALYST_TIMEOUT_MS) || 28_000;
const CLASSIFY_TIMEOUT_MS = Number(process.env.NCM_CHAT_CLASSIFY_TIMEOUT_MS) || 22_000;

/**
 * Por defecto: pipeline completo (IA + nomenclador local + PCRAM si hay credenciales) para NCM de 8 dígitos alineado al oficial.
 * `NCM_CHAT_FAST_PIPELINE=1` solo IA + índice local (más rápido, menos precisión).
 */
function useFullNcmPipeline(): boolean {
  const fast = process.env.NCM_CHAT_FAST_PIPELINE;
  if (fast === "1" || fast === "true") return false;
  const legacy = process.env.NCM_CHAT_FULL_PIPELINE;
  if (legacy === "0" || legacy === "false") return false;
  return true;
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
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
=== INFERENCIA Y CONOCIMIENTO GENERAL (OBLIGATORIO ANTES DE PREGUNTAR) ===

Antes de incluir algo en "questions_next" o "missing_critical_data":

1. **Inferí** características típicas del tipo de producto (mercado, uso habitual, configuración estándar).
2. **Usá** conocimiento general del producto: no pedís al usuario lo que cualquier importador daría por sentado.
3. **Asumí** configuraciones estándar salvo que el texto del usuario indique lo contrario (ej. producto final vs repuesto, alimentación típica, conectividad habitual).

**NO preguntar** por información que sea:
- conocimiento general del producto (obvio para quien conoce la categoría),
- inferible por el tipo de producto,
- irrelevante para la clasificación arancelaria (no cambia partida ni subpartida).

**REGLA DE ORO:** Si la respuesta a una pregunta **no puede cambiar** la partida/subpartida NCM relevante → **NO la hagas**. Dejá "questions_next" vacío y usá supuestos razonables en el estado y en "assistant_message".

=== OPTIMIZACIÓN DE PREGUNTAS (OBLIGATORIO) ===

Antes de escribir cada pregunta, preguntate internamente: **«¿Esta información puede cambiar la clasificación?»**  
Si la respuesta es **NO** → no la incluyas.

**Máximo 3 preguntas en "questions_next"**, y **solo** si cada una puede afectar al menos uno de estos frentes (si no aplica ninguno → no preguntar):
1. **Función principal** del producto (qué hace en la economía aduanera).
2. **Clasificación como producto final vs parte vs accesorio** (criterio esencial / RGI).
3. **Capítulo / partida** (distinto capítulo HS o partida de 4 dígitos).
4. **Material dominante** en mezclas o composiciones (define capítulo o partida de textiles, plásticos, metales, etc.).

Si ninguna pregunta cumple esos cuatro criterios → **questions_next: []** y avanzá con inferencias.

**Ejemplo (smartwatch tipo Apple Watch):** podés asumir dispositivo electrónico portátil, batería recargable, conectividad inalámbrica típica, producto final. **NO** preguntar si tiene batería, si se carga por cable, si tiene deportes, si se conecta al teléfono, salvo que el texto abra una duda que **sí** separe partidas (ej. reloj mecánico vs smart; uso exclusivo distinto que mueva capítulo).

**Sí preguntar** solo cuando haya **bifurcación arancelaria real** encuadrable en los puntos 1–4 anteriores.

=== AMBIGÜEDAD Y PREGUNTAS (OBLIGATORIO) ===

Si detectás **ambigüedad real** (dos capítulos o partidas plausibles, o un dato que bifurca la NCM y no está en el texto): **questions_next** debe incluir **al menos 1** pregunta concreta (máx. 3) y **ready_to_run_classifier: false** hasta responder o poder inferir sin duda. No declarés el caso listo para clasificar dejando la ambigüedad sin una pregunta asociada.

Tu tarea en CADA turno:
1. Interpretar el producto por FUNCIÓN PRINCIPAL y uso real, no solo por nombre comercial.
2. Actualizar campos estructurados; rellená con inferencias razonables los campos que no contradigan al usuario.
3. "missing_critical_data": solo líneas que **sí** bloqueen o acoten la partida NCM y que **no** puedan inferirse (y que encajen en 1–4).
4. "questions_next": como máximo 3 ítems, cada uno pasando el test «¿cambia la clasificación?» y al menos uno de (función principal | parte/accesorio/final | capítulo/partida | material dominante en mezclas). Si no, array vacío.
5. **ready_to_run_classifier**: ponelo en **true** cuando, con inferencias + texto, podés armar una descripción técnica suficiente para buscar NCM. Si pedís preguntas en "questions_next", mantenelo en **false**. Cuando no haya preguntas pendientes y el caso esté acotado, **true** y "questions_next" vacío.
6. Tono: directo, técnico, sin frases como "¿en qué puedo ayudarte?".

Respondé SOLO JSON con esta forma:
{
  "assistant_message": "string (markdown permitido, párrafos claros)",
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
  "classification_rationale_draft": "string | null (breve, por qué podría caer en cierto capítulo)"
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

function mapPipelineToCandidates(
  ncm: string | undefined,
  meta: Record<string, unknown> | undefined,
  pipelineConf: number
): { candidates: NcmCandidateItem[]; discardedNotes: string[] } {
  const discardedNotes: string[] = [];
  const metaObj = meta as {
    pcramCandidates?: Array<{ ncmCode: string; title?: string }>;
    discarded?: Array<{ ncm: string; reason: string }>;
    localCandidates?: Array<{ ncmCode: string; title?: string }>;
  };
  if (metaObj?.discarded?.length) {
    for (const d of metaObj.discarded.slice(0, 8)) {
      discardedNotes.push(`${d.ncm}: ${d.reason}`);
    }
  }

  const cands: NcmCandidateItem[] = [];
  const seen = new Set<string>();
  const push = (code: string, desc: string, conf: number, rat: string) => {
    const k = code.replace(/\D/g, "");
    if (k.length < 6 || seen.has(k)) return;
    seen.add(k);
    cands.push({ code, description: desc || "—", confidence: conf, rationale: rat });
  };

  if (ncm) push(ncm, "Posición prioritaria (motor NCM)", pipelineConf, "Sugerencia del pipeline IA + nomenclador / PCRAM.");

  const pc = metaObj?.pcramCandidates ?? [];
  for (const c of pc.slice(0, 8)) {
    if (!c?.ncmCode) continue;
    push(
      c.ncmCode,
      c.title ?? "",
      Math.max(0.15, pipelineConf - 0.08),
      "Candidato desde búsqueda oficial / evidencia."
    );
  }

  const loc = metaObj?.localCandidates ?? [];
  for (const c of loc.slice(0, 4)) {
    if (!c?.ncmCode) continue;
    push(c.ncmCode, c.title ?? "", 0.2, "Candidato nomenclador local.");
  }

  return { candidates: cands.slice(0, 12), discardedNotes };
}

function mapClassifyAIResult(cls: NcmClassification, conf: number): {
  ncm: string;
  candidates: NcmCandidateItem[];
  discardedNotes: string[];
  rationale?: string;
} {
  const discardedNotes: string[] = [];
  for (const d of cls.discarded ?? []) {
    discardedNotes.push(`${d.ncm}: ${d.reason}`);
  }

  const primary = cls.ncm_code;
  const primaryOk = primary && primary !== "9999.99.99";
  const candidates: NcmCandidateItem[] = [];
  const seen = new Set<string>();

  if (primaryOk) {
    const k = primary.replace(/\D/g, "");
    seen.add(k);
    candidates.push({
      code: primary,
      description: "Sugerencia principal (IA)",
      confidence: conf,
      rationale: cls.rationale,
    });
  }

  for (const c of cls.candidates ?? []) {
    if (!c.ncm_code || c.ncm_code === "9999.99.99") continue;
    const k = c.ncm_code.replace(/\D/g, "");
    if (k.length < 6 || seen.has(k)) continue;
    seen.add(k);
    candidates.push({
      code: c.ncm_code,
      description: "Alternativa",
      confidence: c.confidence,
      rationale: c.rationale ?? "",
    });
  }

  const ncm = primaryOk ? primary : "";
  return {
    ncm,
    candidates: candidates.slice(0, 12),
    discardedNotes,
    rationale: cls.rationale,
  };
}

export async function processClasificarTurn(opts: {
  messages: ChatMessage[];
  snapshot: CaseSnapshot;
}): Promise<{ assistantMessage: string; snapshot: CaseSnapshot }> {
  const { messages, snapshot: prev } = opts;

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
      timeoutMs: ANALYST_TIMEOUT_MS,
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
    if (useFullNcmPipeline()) {
      const pipeline = await productFromTextPipeline(techText);
      const ncmRaw = typeof pipeline.ncm === "string" ? pipeline.ncm.trim() : "";
      const ncm = normalizeNcmCode(ncmRaw) || ncmRaw;
      const meta = pipeline.ncmMeta as Record<string, unknown> | undefined;
      let rawConf = typeof meta?.confidence === "number" ? meta.confidence : 0.45;
      let ambiguous = meta?.ambiguous === true;
      if (pipeline.pcram && ncm) {
        ambiguous = false;
        rawConf = Math.max(rawConf, 0.85);
      }
      let conf = clamp01(ambiguous ? rawConf * 0.85 : rawConf);

      const { candidates, discardedNotes } = mapPipelineToCandidates(ncm || undefined, meta, conf);
      snap.candidates = candidates.length ? candidates : snap.candidates;
      snap.discardedNotes = discardedNotes.length ? discardedNotes : snap.discardedNotes;
      snap.recommendedNcm = ncm || snap.recommendedNcm;
      snap.confidence = conf;
      const pcramTitle =
        pipeline.pcram && typeof pipeline.pcram === "object" && "title" in pipeline.pcram
          ? String((pipeline.pcram as { title?: string }).title ?? "").trim()
          : "";
      snap.classificationRationale =
        pcramTitle || snap.classificationRationale || analyst.classification_rationale_draft || undefined;

      if (snap.recommendedNcm) {
        const n = normalizeNcmCode(snap.recommendedNcm);
        if (n) snap.recommendedNcm = n;
      }
      if (snap.candidates?.length) {
        snap.candidates = snap.candidates.map((c) => ({
          ...c,
          code: normalizeNcmCode(c.code) || c.code,
        }));
      }

      let qsPipeline = Array.isArray(meta?.missingInfoQuestions)
        ? (meta!.missingInfoQuestions as string[]).map((q) => String(q).trim()).filter(Boolean).slice(0, 4)
        : [];
      if (ambiguous && qsPipeline.length === 0) {
        qsPipeline = [NCM_AMBIGUITY_FALLBACK_QUESTION];
      }
      snap.pendingQuestions = qsPipeline.length ? qsPipeline : undefined;

      const ambFromMeta = meta?.ambiguity as NcmClassification["ambiguity"] | undefined;
      snap.ambiguity =
        pipeline.pcram && ncm ? undefined : mapClassifierAmbiguityToSnapshot(ambFromMeta, prev.ambiguity);

      if (snap.ambiguity) {
        conf = Math.min(conf, AMBIGUITY_UI_CONF_CAP);
      }
      snap.confidence = conf;

      const blocksClose =
        Boolean(snap.ambiguity) || qsPipeline.length > 0 || ambiguous;

      if (ncm && conf >= 0.7 && !ambiguous && !blocksClose) {
        snap.status = "resolved";
        snap.pendingQuestions = undefined;
        snap.ambiguity = undefined;
      } else if (ncm || (snap.candidates?.length ?? 0) > 0) {
        snap.status = "tentative";
      } else {
        snap.status = "needs_info";
      }

      const ambFromMetaSnap = snap.ambiguity;
      const ambiguityParagraph =
        ambFromMetaSnap && ambFromMeta
          ? `\n\n---\n**Ambigüedad:** ${buildAmbiguityAssistantParagraph(ambFromMeta)}\n\n**Pregunta:** ${ambFromMeta.primaryQuestion}${
              ambFromMeta.secondaryQuestion ? `\n\n**Si aplica:** ${ambFromMeta.secondaryQuestion}` : ""
            }`
          : ambiguous && !pipeline.pcram
            ? `\n\n**Ambigüedad detectada** entre posiciones cercanas; conviene validar documentalmente.`
            : "";

      const extra =
        ncm && conf < 0.7 && !pipeline.pcram
          ? `\n\n**Clasificación tentativa.** Confianza ${Math.round(conf * 100)}% (umbral recomendado ≥70% para dar por cerrado). Podés afinar datos o validar con despachante.`
          : "";

      const definitive =
        ncm
          ? `\n\n---\n**NCM (8 dígitos, formato Mercosur):** \`${normalizeNcmCode(ncm) || ncm}\`${
              pipeline.pcram
                ? "\n\n*Posición confirmada contra descripción en nomenclador (PCRAM).*"
                : "\n\n*Validá la última posición estadística con el despachante si el producto tiene variante no descrita.*"
            }`
          : "";

      return {
        assistantMessage: assistantMessage + ambiguityParagraph + extra + definitive,
        snapshot: snap,
      };
    }

    const cls = await classifyWithAI(techText, {
      timeoutMs: CLASSIFY_TIMEOUT_MS,
      model: process.env.NCM_CHAT_CLASSIFY_MODEL ?? (process.env.OPENAI_MODEL || "gpt-4o-mini"),
      /** Desactiva búsqueda NCM local (evita parsear index.json en cold start). */
      skipNcmKnowledge:
        process.env.NCM_CHAT_SKIP_KNOWLEDGE === "1" || process.env.NCM_CHAT_SKIP_KNOWLEDGE === "true",
    });
    const rawConf = clamp01(Number(cls.confidence ?? 0));
    const ambiguous = Boolean(cls.ambiguous);
    let conf = clamp01(ambiguous ? rawConf * 0.85 : rawConf);

    const { ncm: ncmRaw, candidates, discardedNotes, rationale } = mapClassifyAIResult(cls, conf);
    const ncm = normalizeNcmCode(ncmRaw) || ncmRaw;
    snap.candidates = candidates.length ? candidates : snap.candidates;
    snap.discardedNotes = discardedNotes.length ? discardedNotes : snap.discardedNotes;
    snap.recommendedNcm = ncm || snap.recommendedNcm;
    snap.classificationRationale =
      rationale || snap.classificationRationale || analyst.classification_rationale_draft || undefined;

    snap.ambiguity = mapClassifierAmbiguityToSnapshot(cls.ambiguity, prev.ambiguity);
    if (snap.ambiguity) {
      conf = Math.min(conf, AMBIGUITY_UI_CONF_CAP);
    }
    snap.confidence = conf;

    const qsFromClassify = Array.isArray(cls.missing_info_questions)
      ? cls.missing_info_questions.map((q) => String(q).trim()).filter(Boolean).slice(0, 4)
      : [];
    snap.pendingQuestions = qsFromClassify.length ? qsFromClassify : undefined;

    if (snap.recommendedNcm) {
      const n = normalizeNcmCode(snap.recommendedNcm);
      if (n) snap.recommendedNcm = n;
    }
    if (snap.candidates?.length) {
      snap.candidates = snap.candidates.map((c) => ({
        ...c,
        code: normalizeNcmCode(c.code) || c.code,
      }));
    }

    const blocksCloseFast =
      Boolean(snap.ambiguity) ||
      qsFromClassify.length > 0 ||
      ambiguous ||
      Boolean(cls.needs_clarification);

    if (ncm && conf >= 0.7 && !ambiguous && !blocksCloseFast) {
      snap.status = "resolved";
      snap.pendingQuestions = undefined;
      snap.ambiguity = undefined;
    } else if (ncm || (snap.candidates?.length ?? 0) > 0) {
      snap.status = "tentative";
    } else {
      snap.status = "needs_info";
    }

    const ambiguityParagraphFast =
      cls.ambiguity && snap.ambiguity
        ? `\n\n---\n**Ambigüedad:** ${buildAmbiguityAssistantParagraph(cls.ambiguity)}\n\n**Pregunta:** ${cls.ambiguity.primaryQuestion}${
            cls.ambiguity.secondaryQuestion ? `\n\n**Si aplica:** ${cls.ambiguity.secondaryQuestion}` : ""
          }`
        : ambiguous
          ? `\n\n**Ambigüedad detectada** entre posiciones cercanas; conviene validar documentalmente.`
          : "";

    const extra =
      ncm && conf < 0.7
        ? `\n\n**Clasificación tentativa.** Confianza ${Math.round(conf * 100)}% (umbral recomendado ≥70% para dar por cerrado). Podés afinar datos o validar con despachante.`
        : "";

    const definitive =
      ncm
        ? `\n\n---\n**NCM (8 dígitos, formato Mercosur):** \`${normalizeNcmCode(ncm) || ncm}\`\n\n*Para posición estadística exacta y tributos, usá el pipeline completo (por defecto) o validá con despachante.*`
        : "";

    return {
      assistantMessage: assistantMessage + ambiguityParagraphFast + extra + definitive,
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
