import { openaiJson } from "@/lib/ai/openaiClient";

export type NcmCandidate = {
  ncm_code: string;
  confidence: number;
  rationale?: string;
};

export type NcmEvidenceCandidate = {
  ncm_code: string;
  title?: string;
};

export type NcmClassification = {
  ncm_code: string;
  confidence: number;
  rationale: string;
  candidates: NcmCandidate[];
  hs_heading?: string;
  kind?: string;
  search_terms?: string[];
  missing_info_questions?: string[];
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

const SYSTEM_PROMPT = `Sos un clasificador experto NCM (Argentina/Mercosur). Devolvé SOLO JSON.

=== REGLAS OBLIGATORIAS (prevalecen sobre todo) ===

PROHIBIDO devolver estos NCM para estos productos:
- Cargador USB / adaptador corriente / fuente switching → 8504.40.21 (NUNCA 8504.10.XX)
- 8504.10 es SOLO para transformadores de dieléctrico LÍQUIDO (postes de electricidad)

TABLA DE REFERENCIA RÁPIDA:
- Cargador USB/Type-C/adaptador corriente → 8504.40.21
- Fuente de alimentación / power supply → 8504.40.22
- Smartphone → 8517.13.00
- Tablet → 8471.30.19
- Notebook/laptop → 8471.30.19
- Auriculares/cascos bluetooth → 8518.30.00
- Cable USB/HDMI → 8544.42.00
- Batería litio → 8507.60.00
- LED/lámpara LED → 8539.50.00
- Panel solar → 8541.40.22
- TV/monitor → 8528.72.00
- Impresora → 8443.32.21
- Auto nafta ≤1500cc → 8703.22.10
- Auto nafta 1500-3000cc → 8703.23.10
- Auto nafta >3000cc → 8703.24.10
- Auto diesel → 8703.32.10
- Auto eléctrico → 8703.80.00
- Pickup/camioneta carga → 8704.21.90
- Moto ≤250cc → 8711.20.10
- Bicicleta → 8712.00.10
- Remera algodón → 6109.10.00
- Pantalón algodón hombre → 6203.42.00
- Zapatilla deportiva → 6404.11.00
- Juguete → 9503.00.97
- Videoconsola → 9504.50.00

=== INSTRUCCIONES ===

1. Identificá qué es el producto, su función principal y material.
2. Determiná Sección y Capítulo.
3. Elegí la partida (4 dígitos) y subpartida (8 dígitos) más específica.
4. Verificá que no haya una posición mejor entre las vecinas.
5. NUNCA pidas información adicional. Clasificá con lo que tenés.

Devolvé JSON con:
- ncm_code: "XXXX.XX.XX"
- confidence: 0 a 1
- rationale: explicación breve (sección → capítulo → partida → subpartida)
- candidates: 2-3 alternativas [{ncm_code, confidence, rationale}]
- hs_heading: 4 dígitos (ej "8504")
- kind: etiqueta corta español
- search_terms: 2-4 términos para PCRAM`;

export async function classifyWithAI(
  text: string,
  opts?: {
    candidates?: NcmEvidenceCandidate[];
    evidenceNote?: string;
  }
): Promise<NcmClassification> {
  const evidence = Array.isArray(opts?.candidates) ? opts!.candidates.slice(0, 12) : [];

  const system = [
    SYSTEM_PROMPT,
    evidence.length
      ? "REGLA: tu ncm_code DEBE ser uno de los EVIDENCE_CANDIDATES. Si no podés decidir, devolvé 9999.99.99."
      : "",
  ].filter(Boolean).join("\n\n");

  const user = [
    "Clasificá el NCM:",
    opts?.evidenceNote ? `EVIDENCE_NOTE:\n${String(opts.evidenceNote).slice(0, 1000)}` : "",
    evidence.length ? `EVIDENCE_CANDIDATES:\n${JSON.stringify(evidence, null, 2)}` : "",
    text.slice(0, 4000),
  ].join("\n");

  try {
    const start = Date.now();
    // eslint-disable-next-line no-console
    console.log("[ncmClassifier] calling OpenAI for:", text.slice(0, 80));
    const r = await openaiJson<{
      ncm_code?: string;
      confidence?: number;
      rationale?: string;
      candidates?: Array<{ ncm_code?: string; confidence?: number; rationale?: string }>;
      hs_heading?: string;
      kind?: string;
      search_terms?: string[];
    }>({ system, user, model: process.env.OPENAI_MODEL || "gpt-4o-mini" });

    const elapsed = Date.now() - start;
    const ncm_code = formatNcm(String(r.ncm_code ?? ""));
    // eslint-disable-next-line no-console
    console.log(`[ncmClassifier] result: ${ncm_code} (confidence: ${r.confidence}, ${elapsed}ms)`);

    const confidence = clamp01(Number(r.confidence ?? 0));
    const rationale = String(r.rationale ?? "Clasificación sugerida por IA.").trim();
    const candidates = Array.isArray(r.candidates) && r.candidates.length
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
      ? r.search_terms.map((x) => String(x).trim()).filter(Boolean).slice(0, 6)
      : undefined;

    return { ncm_code, confidence, rationale, candidates, hs_heading, kind, search_terms };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[ncmClassifier] FAILED:", err instanceof Error ? err.message : err);
    return {
      ncm_code: "9999.99.99",
      confidence: 0.2,
      rationale: "Fallback: no se pudo clasificar con IA.",
      candidates: [],
    };
  }
}
