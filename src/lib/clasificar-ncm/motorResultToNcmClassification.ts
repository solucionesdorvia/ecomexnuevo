import type { NcmClassification } from "@/lib/ai/ncmClassifier";
import type { NcmMotorResult } from "@/lib/clasificar-ncm/runNcmMotor";

/**
 * Convierte `runNcmMotor` al shape que históricamente producía `classifyWithAI` en
 * `productFromUrlPipeline` (paso inicial), sin tocar el bloque PCRAM / segunda IA.
 */
export function motorResultToNcmClassification(motor: NcmMotorResult): NcmClassification {
  if (motor.engine.mode === "fast") {
    return motor.engine.classification;
  }

  const pl = motor.engine.pipeline;
  const meta = pl.ncmMeta;
  const fromMotor =
    motor.ncm_code && motor.ncm_code.trim() && motor.ncm_code !== "9999.99.99"
      ? motor.ncm_code.trim()
      : "";
  const fromPipeline =
    typeof pl.ncm === "string" && pl.ncm.trim() && pl.ncm !== "9999.99.99" ? pl.ncm.trim() : "";
  const ncm_code = fromMotor || fromPipeline || "9999.99.99";

  return {
    ncm_code,
    confidence: typeof meta?.confidence === "number" ? meta.confidence : motor.confidence,
    rationale: motor.rationale,
    candidates: [],
    hs_heading: meta?.hsHeading,
    kind: meta?.kind,
    search_terms: meta?.searchTerms,
    missing_info_questions: meta?.missingInfoQuestions,
    needs_clarification: meta?.needsClarification,
    ambiguous: meta?.ambiguous,
    discarded: meta?.discarded,
    ambiguity: meta?.ambiguity,
  };
}
