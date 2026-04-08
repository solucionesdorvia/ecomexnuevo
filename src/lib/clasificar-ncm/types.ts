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
  status: CaseStatus;
  /** Preguntas pendientes sugeridas por el asistente (máx. 3 en lógica) */
  pendingQuestions?: string[];
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
