/**
 * Tipos y utilidades para ambigüedad NCM: causa, candidatos en competencia y pregunta decisiva.
 */

export type AmbiguityReason =
  | "part_vs_final"
  | "accessory_vs_machine"
  | "communication_vs_processing"
  | "medical_vs_consumer"
  | "industrial_vs_domestic"
  | "material_essential_character"
  | "finished_vs_unfinished"
  | "measurement_vs_control"
  | "generic_low_confidence";

export const AMBIGUITY_REASONS: readonly AmbiguityReason[] = [
  "part_vs_final",
  "accessory_vs_machine",
  "communication_vs_processing",
  "medical_vs_consumer",
  "industrial_vs_domestic",
  "material_essential_character",
  "finished_vs_unfinished",
  "measurement_vs_control",
  "generic_low_confidence",
] as const;

export function isAmbiguityReason(s: string): s is AmbiguityReason {
  return (AMBIGUITY_REASONS as readonly string[]).includes(s);
}

/** Etiquetas cortas para UI / mensajes al usuario. */
export const AMBIGUITY_REASON_LABELS: Record<AmbiguityReason, string> = {
  part_vs_final: "Producto final vs parte o componente",
  accessory_vs_machine: "Accesorio vs máquina o aparato completo",
  communication_vs_processing: "Comunicación/transmisión de datos vs procesamiento informático",
  medical_vs_consumer: "Uso médico/diagnóstico vs consumo general",
  industrial_vs_domestic: "Uso industrial vs doméstico",
  material_essential_character: "Material o carácter esencial (GIR 3)",
  finished_vs_unfinished: "Producto acabado vs semielaborado o materia",
  measurement_vs_control: "Medición/registro vs mando o control",
  generic_low_confidence: "Varias posiciones plausibles (afinar criterio)",
};

/**
 * Preguntas por defecto por tipo de duda (la IA debe preferir variantes específicas al producto).
 * Último recurso si no se pudo acotar la causa.
 */
export const AMBIGUITY_DEFAULT_QUESTIONS: Record<AmbiguityReason, string> = {
  part_vs_final:
    "¿El producto se usa de forma autónoma o está destinado exclusivamente a integrarse en otro equipo como parte o componente?",
  accessory_vs_machine:
    "¿Funciona como accesorio/adaptador de otro equipo o constituye por sí mismo la máquina o aparato principal?",
  communication_vs_processing:
    "¿La función principal es comunicar o transmitir datos, o ejecutar procesamiento local como dispositivo informático (capacidad de cómputo/proceso dominante)?",
  medical_vs_consumer:
    "¿Está destinado a uso médico, diagnóstico o terapéutico certificado, o a monitoreo/bienestar de consumo general?",
  industrial_vs_domestic:
    "¿El uso previsto es principalmente industrial/profesional o doméstico/particular?",
  material_essential_character:
    "¿Qué material predomina en peso o aporta el carácter esencial del producto (textil, plástico, metal, etc.)?",
  finished_vs_unfinished:
    "¿El producto se presenta acabado y listo para el uso final o en estado de materia prima/semielaborado?",
  measurement_vs_control:
    "¿La función principal es medir/registrar magnitudes o accionar, controlar o regular otro equipo?",
  generic_low_confidence:
    "¿Podés precisar la función principal y el uso concreto del producto para distinguir entre las posiciones posibles?",
};

export const NCM_AMBIGUITY_GENERIC_FALLBACK_QUESTION = AMBIGUITY_DEFAULT_QUESTIONS.generic_low_confidence;

export type AmbiguityPayloadRaw = {
  reason?: string;
  competing_candidates?: string[];
  decisive_field?: string;
  primary_question?: string;
  secondary_question?: string | null;
};

export type NormalizedAmbiguity = {
  reason: AmbiguityReason;
  competingCandidates: string[];
  decisiveField: string;
  primaryQuestion: string;
  secondaryQuestion?: string;
};

function formatNcmLoose(raw: string): string {
  const d = String(raw ?? "").replace(/\D/g, "");
  if (d.length < 6) return "";
  const a = d.slice(0, 4);
  const b = d.slice(4, 6);
  const c = d.slice(6, 8).padEnd(2, "0");
  return `${a}.${b}.${c}`;
}

/** Normaliza payload del modelo o construye fallback mínimo. */
export function normalizeAmbiguityPayload(
  raw: AmbiguityPayloadRaw | null | undefined,
  opts: {
    competingCodes: string[];
    useGenericReason?: boolean;
  }
): NormalizedAmbiguity | null {
  const codes = [...new Set(opts.competingCodes.map(formatNcmLoose).filter(Boolean))].slice(0, 6);
  if (!codes.length) return null;

  let reason: AmbiguityReason = "generic_low_confidence";
  if (raw?.reason && isAmbiguityReason(raw.reason)) {
    reason = raw.reason;
  } else if (opts.useGenericReason) {
    reason = "generic_low_confidence";
  } else {
    reason = "generic_low_confidence";
  }

  const primary =
    String(raw?.primary_question ?? "").trim() ||
    AMBIGUITY_DEFAULT_QUESTIONS[reason] ||
    NCM_AMBIGUITY_GENERIC_FALLBACK_QUESTION;

  const decisiveField =
    String(raw?.decisive_field ?? "").trim() ||
    AMBIGUITY_REASON_LABELS[reason] ||
    "Criterio arancelario";

  const secondaryRaw = raw?.secondary_question;
  const secondary =
    secondaryRaw === null || secondaryRaw === undefined
      ? undefined
      : String(secondaryRaw).trim() || undefined;

  const competing =
    Array.isArray(raw?.competing_candidates) && raw.competing_candidates.length
      ? raw.competing_candidates.map(formatNcmLoose).filter(Boolean).slice(0, 6)
      : codes;

  return {
    reason,
    competingCandidates: competing.length ? competing : codes,
    decisiveField,
    primaryQuestion: primary,
    secondaryQuestion: secondary,
  };
}

/** Fallback cuando no hay payload del modelo: explica competencia entre 2+ NCM. */
export function buildFallbackAmbiguityFromCodes(ncmCodes: string[]): NormalizedAmbiguity {
  const codes = [...new Set(ncmCodes.map(formatNcmLoose).filter(Boolean))].slice(0, 4);
  const [a, b] = [codes[0] ?? "—", codes[1] ?? codes[0] ?? "—"];
  const q =
    codes.length >= 2
      ? `¿Podés indicar qué función principal y uso concreto tiene el producto para decidir entre **${a}** y **${b}** (u otras posiciones cercanas en la lista de candidatos)?`
      : NCM_AMBIGUITY_GENERIC_FALLBACK_QUESTION;

  return {
    reason: "generic_low_confidence",
    competingCandidates: codes,
    decisiveField: "Función principal / encuadre legal",
    primaryQuestion: q,
  };
}

export function ambiguityQuestionsList(a: NormalizedAmbiguity): string[] {
  const out = [a.primaryQuestion];
  if (a.secondaryQuestion) out.push(a.secondaryQuestion);
  return out.slice(0, 2);
}

/** Texto para asistente: por qué hay duda + qué falta. */
export function buildAmbiguityAssistantParagraph(a: NormalizedAmbiguity): string {
  // Mensaje pensado para el usuario final: habla de "afinar el presupuesto",
  // no menciona NCM ni jerga aduanera. El código/candidatos quedan internos.
  const need = a.decisiveField ? `sobre ${a.decisiveField.toLowerCase().trim()}` : "del producto";
  return `Para afinar el presupuesto necesito un dato más ${need}.`;
}
