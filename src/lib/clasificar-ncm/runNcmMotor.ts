/**
 * Único punto de entrada para obtener una clasificación NCM en la app.
 * No depende de UI ni de Route Handlers.
 */

import { classifyWithAI, type NcmClassification } from "@/lib/ai/ncmClassifier";
import { mapClassifierAmbiguityToSnapshot } from "@/lib/clasificar-ncm/classifierAmbiguityMapper";
import { formatMercosurNcm8, ncmDigitsOnly } from "@/lib/ncm/knowledge/normalize";
import { searchNcm } from "@/lib/ncm/knowledge/searchNcm";
import { productFromTextPipeline, type TextPipelineResult } from "@/lib/scraper/productFromTextPipeline";
import {
  deriveProductSignals,
  runDeterministicCandidateStages,
  resolveAmbiguityDecision,
  snapshotAmbiguityToNormalized,
  type DiscardedCandidate,
} from "@/lib/clasificar-ncm/ncmCandidatePipeline";
import { NCM_AMBIGUITY_FALLBACK_QUESTION } from "@/lib/clasificar-ncm/professionalModePrompt";
import type { CaseSnapshot, ChatMessage, NcmCandidateItem } from "./types";

const AMBIGUITY_UI_CONF_CAP = 0.68;

export function shouldUseFullNcmPipeline(): boolean {
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

export function normalizeNcmCode(raw: string | undefined): string {
  const d = ncmDigitsOnly(String(raw ?? ""));
  if (d.length < 6) return "";
  return formatMercosurNcm8(d);
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
  discardedCandidates?: Array<{ code: string; reason: string }>;
  rationale?: string;
} {
  const discardedNotes: string[] = [];
  const seenCodes = new Set<string>();
  const structured: Array<{ code: string; reason: string }> = [];
  for (const x of cls.discardedCandidates ?? []) {
    if (seenCodes.has(x.code)) continue;
    seenCodes.add(x.code);
    structured.push({ code: x.code, reason: x.reason });
  }
  for (const d of cls.discarded ?? []) {
    if (seenCodes.has(d.ncm)) continue;
    seenCodes.add(d.ncm);
    structured.push({ code: d.ncm, reason: d.reason });
  }
  for (const d of structured) {
    discardedNotes.push(`${d.code}: ${d.reason}`);
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
    discardedCandidates: structured.length ? structured : undefined,
    rationale: cls.rationale,
  };
}

function sortCandidatesByConfidence(c: NcmCandidateItem[]): NcmCandidateItem[] {
  return [...c].sort((a, b) => b.confidence - a.confidence);
}

function applyDecisiveCandidatePipeline(opts: {
  techText: string;
  snap: CaseSnapshot;
  prevSnapshot: CaseSnapshot;
  messages: ChatMessage[];
  candidates: NcmCandidateItem[];
}): { candidates: NcmCandidateItem[]; discardedExtra: DiscardedCandidate[] } {
  const signals = deriveProductSignals(opts.techText, { productType: opts.snap.productType });
  const { candidates: staged, discarded: d1 } = runDeterministicCandidateStages(signals, opts.candidates);
  let out = staged;
  const extra: DiscardedCandidate[] = [...d1];

  const lastUser = [...opts.messages].reverse().find((m) => m.role === "user")?.content?.trim() ?? "";
  if (opts.prevSnapshot.ambiguity && lastUser.length > 0) {
    const norm = snapshotAmbiguityToNormalized(opts.prevSnapshot.ambiguity);
    const res = resolveAmbiguityDecision(norm, lastUser, out);
    out = res.candidates;
    extra.push(...res.discarded);
  }

  return { candidates: sortCandidatesByConfidence(out), discardedExtra: extra };
}

export type NcmMotorEnginePayload =
  | {
      mode: "full";
      pipeline: TextPipelineResult;
      ambiguous: boolean;
    }
  | {
      mode: "fast";
      classification: NcmClassification;
      ambiguous: boolean;
    };

export type NcmMotorResult = {
  ncm_code: string | null;
  confidence: number;
  rationale: string;
  alternatives: Array<{ ncm_code: string; confidence: number; label: string; rationale: string }>;
  /** Ambigüedad lista para `CaseSnapshot` (o undefined). */
  ambiguity: CaseSnapshot["ambiguity"];
  questions: string[];
  discardedCandidates?: Array<{ code: string; reason: string }>;
  discardedNotes: string[];
  candidates: NcmCandidateItem[];
  blocksClose: boolean;
  statusHint: "resolved" | "tentative" | "needs_info";
  engine: NcmMotorEnginePayload;
};

export type RunNcmMotorInput = {
  text: string;
  snapshot: CaseSnapshot;
  prevSnapshot: CaseSnapshot;
  messages: ChatMessage[];
  preferFullPipeline?: boolean;
  classifyOptions?: {
    timeoutMs?: number;
    model?: string;
    skipNcmKnowledge?: boolean;
  };
};

const DEFAULT_CLASSIFY_TIMEOUT_MS = Number(process.env.NCM_CHAT_CLASSIFY_TIMEOUT_MS) || 22_000;

function candidatesToAlternatives(cands: NcmCandidateItem[]): NcmMotorResult["alternatives"] {
  return cands.map((c) => ({
    ncm_code: normalizeNcmCode(c.code) || c.code,
    confidence: c.confidence,
    label: c.description,
    rationale: c.rationale,
  }));
}

export async function runNcmMotor(input: RunNcmMotorInput): Promise<NcmMotorResult> {
  const techText = input.text.trim();
  const snap = input.snapshot;
  const prev = input.prevSnapshot;
  const messages = input.messages;
  const useFull = input.preferFullPipeline ?? shouldUseFullNcmPipeline();
  const classifyOpts = input.classifyOptions ?? {};

  if (useFull) {
    const pipeline = await productFromTextPipeline(techText);
    const ncmRaw = typeof pipeline.ncm === "string" ? pipeline.ncm.trim() : "";
    const ncmPipeline = normalizeNcmCode(ncmRaw) || ncmRaw;
    const meta = pipeline.ncmMeta as Record<string, unknown> | undefined;
    let rawConf = typeof meta?.confidence === "number" ? meta.confidence : 0.45;
    let ambiguous = meta?.ambiguous === true;
    if (pipeline.pcram && ncmPipeline) {
      ambiguous = false;
      rawConf = Math.max(rawConf, 0.85);
    }
    let conf = clamp01(ambiguous ? rawConf * 0.85 : rawConf);

    const { candidates: mappedCands, discardedNotes: pipeDiscNotes } = mapPipelineToCandidates(
      ncmPipeline || undefined,
      meta,
      conf
    );
    let candidates = mappedCands.length ? mappedCands : [];
    let discardedNotes = [...pipeDiscNotes];

    const metaObj = meta as { discarded?: Array<{ ncm: string; reason: string }> } | undefined;
    let discardedStruct: Array<{ code: string; reason: string }> = [];
    if (metaObj?.discarded?.length) {
      discardedStruct = metaObj.discarded.slice(0, 12).map((d) => ({ code: d.ncm, reason: d.reason }));
    }

    let clearedByDecisive = false;
    if (candidates.length) {
      const dec = applyDecisiveCandidatePipeline({
        techText,
        snap,
        prevSnapshot: prev,
        messages,
        candidates,
      });
      if (dec.discardedExtra.length) {
        discardedNotes = [...discardedNotes, ...dec.discardedExtra.map((d) => `${d.code}: ${d.reason}`)];
        discardedStruct = [...discardedStruct, ...dec.discardedExtra];
      }
      if (dec.candidates.length) {
        candidates = dec.candidates;
        const top = dec.candidates[0]!;
        conf = top.confidence;
      } else if (dec.discardedExtra.length) {
        candidates = [];
        clearedByDecisive = true;
      }
    }

    const pcramTitle =
      pipeline.pcram && typeof pipeline.pcram === "object" && "title" in pipeline.pcram
        ? String((pipeline.pcram as { title?: string }).title ?? "").trim()
        : "";

    const rationale =
      pcramTitle || "Clasificación desde pipeline completo (IA + nomenclador / PCRAM).";

    const ambFromMeta = meta?.ambiguity as NcmClassification["ambiguity"] | undefined;
    const ambiguitySnap: CaseSnapshot["ambiguity"] =
      pipeline.pcram && ncmPipeline ? undefined : mapClassifierAmbiguityToSnapshot(ambFromMeta, prev.ambiguity);

    if (ambiguitySnap) {
      conf = Math.min(conf, AMBIGUITY_UI_CONF_CAP);
    }

    let qsPipeline = Array.isArray(meta?.missingInfoQuestions)
      ? (meta!.missingInfoQuestions as string[]).map((q) => String(q).trim()).filter(Boolean).slice(0, 4)
      : [];
    if (ambiguous && qsPipeline.length === 0) {
      qsPipeline = [NCM_AMBIGUITY_FALLBACK_QUESTION];
    }

    const blocksClose = Boolean(ambiguitySnap) || qsPipeline.length > 0 || ambiguous;

    const normCands = candidates.map((c) => ({
      ...c,
      code: normalizeNcmCode(c.code) || c.code,
    }));

    let ncm_code: string | null = null;
    if (normCands.length > 0) {
      ncm_code = normalizeNcmCode(normCands[0]!.code) || normCands[0]!.code;
    } else if (clearedByDecisive) {
      ncm_code = null;
    } else {
      ncm_code = ncmPipeline ? normalizeNcmCode(ncmPipeline) || ncmPipeline : null;
    }

    let statusHint: NcmMotorResult["statusHint"] = "needs_info";
    if (ncm_code && conf >= 0.7 && !ambiguous && !blocksClose) {
      statusHint = "resolved";
    } else if (ncm_code || normCands.length > 0) {
      statusHint = "tentative";
    }

    return {
      ncm_code,
      confidence: conf,
      rationale,
      alternatives: candidatesToAlternatives(normCands),
      ambiguity: ambiguitySnap,
      questions: qsPipeline,
      discardedCandidates: discardedStruct.length ? discardedStruct : undefined,
      discardedNotes,
      candidates: normCands,
      blocksClose,
      statusHint,
      engine: { mode: "full", pipeline, ambiguous },
    };
  }

  const classifyArgs = {
    timeoutMs: classifyOpts.timeoutMs ?? DEFAULT_CLASSIFY_TIMEOUT_MS,
    model: classifyOpts.model ?? (process.env.NCM_CHAT_CLASSIFY_MODEL ?? (process.env.OPENAI_MODEL || "gpt-4o-mini")),
    skipNcmKnowledge:
      classifyOpts.skipNcmKnowledge ??
      (process.env.NCM_CHAT_SKIP_KNOWLEDGE === "1" || process.env.NCM_CHAT_SKIP_KNOWLEDGE === "true"),
  };
  // Reintento por confiabilidad: el LLM a veces devuelve sin código (o 9999.99.99)
  // para productos claros (variabilidad / timeout transitorio). Si NO es una
  // ambigüedad real, reintentamos hasta 2 veces más antes de caer a "sin NCM".
  let cls = await classifyWithAI(techText, classifyArgs);
  const hasUsableCode = (c: NcmClassification | null | undefined) => {
    const d = String(c?.ncm_code ?? "").replace(/\D/g, "");
    return d.length >= 6 && d.slice(0, 8) !== "99999999";
  };
  for (let attempt = 0; attempt < 2 && !hasUsableCode(cls) && !cls?.ambiguous; attempt++) {
    cls = await classifyWithAI(techText, classifyArgs);
  }

  const rawConf = clamp01(Number(cls.confidence ?? 0));
  const ambiguous = Boolean(cls.ambiguous);
  let conf = clamp01(ambiguous ? rawConf * 0.85 : rawConf);

  const mapped = mapClassifyAIResult(cls, conf);
  const ncmFromCls = normalizeNcmCode(mapped.ncm) || mapped.ncm;
  let candidates = mapped.candidates.length ? mapped.candidates : [];
  let discardedNotes = [...mapped.discardedNotes];
  let discardedCandidates = mapped.discardedCandidates;

  // Fallback léxico: si la IA no resolvió un código (se rindió con 9999/None) pero
  // NO marcó ambigüedad real, usamos el mejor match del nomenclador oficial como
  // NCM TENTATIVO. Evita que productos claros pero "moderadamente seguros" (ej.
  // zapatillas conf 0.55) caigan a "sin NCM" → arancel genérico. Si hay ambigüedad
  // real entre partidas, NO forzamos: ahí sí corresponde pedir aclaración.
  if (!candidates.length && !ambiguous && techText.trim().length >= 6) {
    const hits = searchNcm(techText, { limit: 3, productContext: techText });
    if (hits.length) {
      candidates = hits.map((h) => ({
        code: normalizeNcmCode(h.code) || h.code,
        description: h.description,
        confidence: clamp01(Math.min(0.6, 0.5 + (h.score ?? 0) * 0.1)),
        rationale: "Mejor coincidencia del nomenclador oficial (la IA no devolvió un código).",
      }));
      conf = Math.max(conf, candidates[0]!.confidence);
    }
  }

  let decisiveEmptiedAll = false;
  if (candidates.length) {
    const dec = applyDecisiveCandidatePipeline({
      techText,
      snap,
      prevSnapshot: prev,
      messages,
      candidates,
    });
    if (dec.discardedExtra.length) {
      discardedCandidates = [...(discardedCandidates ?? []), ...dec.discardedExtra];
      discardedNotes = [...discardedNotes, ...dec.discardedExtra.map((d) => `${d.code}: ${d.reason}`)];
    }
    if (dec.candidates.length) {
      candidates = dec.candidates;
      const top = dec.candidates[0]!;
      conf = top.confidence;
    } else if (dec.discardedExtra.length) {
      candidates = [];
      decisiveEmptiedAll = true;
    }
  }

  let recommendedNcm: string | null = null;
  if (candidates.length) {
    const top = candidates[0]!;
    recommendedNcm = normalizeNcmCode(top.code) || top.code;
  } else if (decisiveEmptiedAll) {
    recommendedNcm = null;
  }
  if (!decisiveEmptiedAll) {
    recommendedNcm = ncmFromCls || recommendedNcm;
  }

  const ambiguitySnap = mapClassifierAmbiguityToSnapshot(cls.ambiguity, prev.ambiguity);
  if (ambiguitySnap) {
    conf = Math.min(conf, AMBIGUITY_UI_CONF_CAP);
  }

  const qsFromClassify = Array.isArray(cls.missing_info_questions)
    ? cls.missing_info_questions.map((q) => String(q).trim()).filter(Boolean).slice(0, 4)
    : [];

  const blocksCloseFast =
    Boolean(ambiguitySnap) || qsFromClassify.length > 0 || ambiguous || Boolean(cls.needs_clarification);

  const normCands = candidates.map((c) => ({
    ...c,
    code: normalizeNcmCode(c.code) || c.code,
  }));

  let statusHint: NcmMotorResult["statusHint"] = "needs_info";
  const effectiveNcm = recommendedNcm;
  if (effectiveNcm && conf >= 0.7 && !ambiguous && !blocksCloseFast) {
    statusHint = "resolved";
  } else if (effectiveNcm || normCands.length > 0) {
    statusHint = "tentative";
  }

  return {
    ncm_code: effectiveNcm,
    confidence: conf,
    rationale: mapped.rationale || cls.rationale || "Clasificación desde modo rápido (IA).",
    alternatives: candidatesToAlternatives(normCands),
    ambiguity: ambiguitySnap,
    questions: qsFromClassify,
    discardedCandidates,
    discardedNotes,
    candidates: normCands,
    blocksClose: blocksCloseFast,
    statusHint,
    engine: { mode: "fast", classification: cls, ambiguous },
  };
}
