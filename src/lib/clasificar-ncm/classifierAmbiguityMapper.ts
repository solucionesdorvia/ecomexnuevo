import type { NcmClassification } from "@/lib/ai/ncmClassifier";
import type { CaseSnapshot } from "./types";

/** Convierte ambigüedad del clasificador al snapshot persistible en el caso. */
export function mapClassifierAmbiguityToSnapshot(
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
