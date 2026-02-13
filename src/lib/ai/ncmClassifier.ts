import { openaiJson } from "@/lib/ai/openaiClient";

export type NcmCandidate = {
  ncm_code: string;
  confidence: number;
  rationale?: string;
};

export type NcmClassification = {
  ncm_code: string;
  confidence: number;
  rationale: string;
  candidates: NcmCandidate[];
  // Extra signals (optional) to improve PCRAM validation/search.
  hs_heading?: string; // e.g. "8701", "8703"
  kind?: string; // e.g. "tractor", "auto", "camion", "partes", "otro"
  search_terms?: string[]; // PCRAM-friendly keywords
  missing_info_questions?: string[]; // short questions to ask user if needed
};

function formatNcm(ncmRaw: string) {
  const digits = (ncmRaw || "").replace(/\D/g, "");
  if (digits.length < 6) return "9999.99.99";
  const a = digits.slice(0, 4);
  const b = digits.slice(4, 6);
  const c = digits.slice(6, 8).padEnd(2, "0");
  return `${a}.${b}.${c}`;
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export async function classifyWithAI(text: string): Promise<NcmClassification> {
  const knowledge = process.env.NCM_KNOWLEDGE ?? "";

  const system = [
    "Eres un clasificador experto de NCM (Argentina).",
    "Tu tarea es proponer el NCM más probable para el producto descrito.",
    "Devuelve SOLO JSON válido con estas claves: ncm_code, confidence, rationale, candidates, hs_heading, kind, search_terms, missing_info_questions.",
    "confidence debe ser un número entre 0 y 1.",
    "ncm_code debe tener el formato XXXX.XX.XX (si recibes solo dígitos, formatea).",
    "hs_heading debe ser 4 dígitos cuando puedas (por ejemplo 8701, 8703, 8427). Si no aplica, null.",
    "kind debe ser una etiqueta corta en español (por ejemplo: tractor, automóvil, camioneta, camión, partes, maquinaria, alimento, otro).",
    "search_terms deben ser 2–6 términos en español útiles para buscar en PCRAM. Priorizá términos genéricos técnicos; evitá marcas/modelos salvo que sea la única pista.",
    "Reglas rápidas (orientativas) para vehículos (Cap. 87):",
    "- 8703: vehículos diseñados principalmente para transporte de personas (autos/SUV).",
    "- 8704: vehículos para transporte de mercancías (pick-up/camioneta de carga/vehículo utilitario).",
    "- Si te dan SOLO un modelo (ej. 'Hilux', 'Ranger', 'Amarok', 'F-150') y no hay más contexto, asumí 'pick-up/utilitario' y pedí confirmación con una pregunta corta (personas vs carga).",
    "missing_info_questions: si el NCM depende de datos técnicos faltantes (vehículos: personas vs carga, cilindrada, peso total con carga máxima, etc.), devolvé 1–4 preguntas cortas para destrabar.",
    knowledge ? `Base de conocimiento (referencia):\n${knowledge}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const user = [
    "Clasifica el NCM del siguiente producto.",
    "Producto:",
    text.slice(0, 8000),
  ].join("\n");

  try {
    const r = await openaiJson<{
      ncm_code?: string;
      confidence?: number;
      rationale?: string;
      candidates?: Array<{
        ncm_code?: string;
        confidence?: number;
        rationale?: string;
      }>;
      hs_heading?: string;
      kind?: string;
      search_terms?: string[];
      missing_info_questions?: string[];
    }>({ system, user, model: process.env.OPENAI_MODEL || "gpt-4o" });

    const ncm_code = formatNcm(String(r.ncm_code ?? ""));
    const confidence = clamp01(Number(r.confidence ?? 0));
    const rationale = String(r.rationale ?? "Clasificación sugerida por IA.").trim();
    const candidates =
      Array.isArray(r.candidates) && r.candidates.length
        ? r.candidates.slice(0, 6).map((c) => ({
            ncm_code: formatNcm(String(c.ncm_code ?? "")),
            confidence: clamp01(Number(c.confidence ?? 0)),
            rationale: c.rationale ? String(c.rationale) : undefined,
          }))
        : [];

    const hsRaw = String(r.hs_heading ?? "").replace(/\D/g, "");
    const hs_heading = hsRaw.length === 4 ? hsRaw : undefined;
    const kind = r.kind ? String(r.kind).trim() : undefined;
    const search_terms = Array.isArray(r.search_terms)
      ? r.search_terms
          .map((x) => String(x).trim())
          .filter(Boolean)
          .slice(0, 6)
      : undefined;
    const missing_info_questions = Array.isArray(r.missing_info_questions)
      ? r.missing_info_questions
          .map((x) => String(x).trim())
          .filter(Boolean)
          .slice(0, 4)
      : undefined;

    return {
      ncm_code,
      confidence,
      rationale,
      candidates,
      hs_heading,
      kind,
      search_terms,
      missing_info_questions,
    };
  } catch {
    return {
      ncm_code: "9999.99.99",
      confidence: 0.2,
      rationale: "Fallback: no se pudo clasificar con IA.",
      candidates: [],
    };
  }
}

