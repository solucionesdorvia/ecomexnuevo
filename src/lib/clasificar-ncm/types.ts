import type { AmbiguityReason } from "./ncmAmbiguity";

export type { AmbiguityReason } from "./ncmAmbiguity";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
};

export type NcmCandidateItem = {
  code: string;
  description: string;
  confidence: number;
  rationale: string;
};

export type CaseStatus =
  | "idle"
  | "analyzing"
  | "needs_info"
  | "tentative"
  | "resolved"
  | "error";

export type ProductType = "final" | "part" | "accessory" | "unknown";

/** Metadata de ambigüedad activa (pregunta decisiva ligada a la causa). */
export type NcmAmbiguitySnapshot = {
  reason: AmbiguityReason;
  competingCandidates: string[];
  decisiveField: string;
  question: string;
  secondaryQuestion?: string;
  /** True si el usuario ya respondió en un turno posterior a haber mostrado la duda. */
  answered: boolean;
};

/** Datos de compra que el chat va recolectando para armar el presupuesto. */
export type PurchaseSnapshot = {
  /** Precio FOB por unidad en USD (o el precio unitario que dijo el usuario). */
  fobUnitUsd?: number;
  /** Cantidad total a importar. */
  quantity?: number;
  /** País de origen (ej. "China", "USA"). */
  origin?: string;
};

/** Estado acumulativo del caso (sin mensajes en API; el cliente añade messages). */
export type CaseSnapshot = {
  productName?: string;
  technicalName?: string;
  mainFunction?: string;
  materials?: string[];
  use?: string;
  powerSource?: string;
  productType?: ProductType;
  industry?: string;
  missingCriticalData?: string[];
  candidates?: NcmCandidateItem[];
  recommendedNcm?: string;
  /** 0–1 */
  confidence?: number;
  /** Explicación técnica del resultado */
  classificationRationale?: string;
  /** Texto armado para el motor NCM (debug / trazabilidad) */
  mergedTechnicalDescription?: string;
  /** Alternativas descartadas (texto breve) */
  discardedNotes?: string[];
  /** Descartes estructurados (filtro duro / ambigüedad resuelta) */
  discardedCandidates?: Array<{ code: string; reason: string }>;
  status: CaseStatus;
  /** Preguntas pendientes sugeridas por el asistente (prioridad: 1 principal, 2 solo si aplica) */
  pendingQuestions?: string[];
  /** Duda estructurada entre candidatos (bloquea “resuelto” hasta aclararse) */
  ambiguity?: NcmAmbiguitySnapshot;
  /** Datos comerciales para la cotización (FOB, cantidad, origen). */
  purchase?: PurchaseSnapshot;
  errorMessage?: string;
};

export type CaseState = CaseSnapshot & {
  messages: ChatMessage[];
};

export const initialCaseSnapshot = (): CaseSnapshot => ({
  status: "idle",
});

export const initialCaseState = (): CaseState => ({
  ...initialCaseSnapshot(),
  messages: [],
});
