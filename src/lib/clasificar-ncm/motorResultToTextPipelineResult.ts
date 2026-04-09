import type { TextPipelineResult } from "@/lib/scraper/productFromTextPipeline";
import type { NcmMotorResult } from "@/lib/clasificar-ncm/runNcmMotor";

/**
 * Convierte el resultado de `runNcmMotor` al shape histórico de `productFromTextPipeline`
 * (sandbox / API `/api/clasificar-ncm`).
 *
 * - Modo `full`: el pipeline interno ya es `TextPipelineResult`; se devuelve tal cual.
 * - Modo `fast`: se arma un `TextPipelineResult` desde la clasificación IA + candidatos del motor.
 */
export function motorResultToTextPipelineResult(motor: NcmMotorResult): TextPipelineResult {
  if (motor.engine.mode === "full") {
    return motor.engine.pipeline;
  }

  const cls = motor.engine.classification;
  const ncm =
    motor.ncm_code && motor.ncm_code.trim() ? motor.ncm_code.trim() : undefined;

  const ncmMeta: TextPipelineResult["ncmMeta"] = {
    source: "ai",
    aiNcm: cls.ncm_code,
    hsHeading: cls.hs_heading,
    kind: cls.kind,
    searchTerms: cls.search_terms,
    missingInfoQuestions: cls.missing_info_questions,
    confidence: motor.confidence,
    ambiguous: cls.ambiguous ?? motor.alternatives.length > 1,
    pcramCandidates: motor.alternatives.map((a) => ({
      ncmCode: a.ncm_code,
      title: a.label,
    })),
    discarded: cls.discarded,
    needsClarification: cls.needs_clarification,
    ambiguity: cls.ambiguity,
  };

  return {
    ncm,
    pcram: undefined,
    ncmMeta,
  };
}
