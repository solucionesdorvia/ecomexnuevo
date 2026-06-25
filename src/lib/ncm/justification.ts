/* eslint-disable @typescript-eslint/no-explicit-any */
// productJson es JSON de Prisma con forma dinámica anidada — los casts a any son intencionales.
/**
 * Justificación arancelaria "defendible ante ARCA".
 *
 * Arma, a partir de los datos que el clasificador ya persiste en la cotización
 * (raw.classifier: candidatos, descartados con motivo, confianza, función,
 * materiales) + el nomenclador oficial offline, un documento estructurado que
 * explica POR QUÉ se eligió la posición: descripción oficial de la partida/
 * subpartida, fundamento (función + naturaleza + RGI), alternativas descartadas
 * y score de confianza. Pensado para exportar/imprimir y presentar.
 */
import { loadKnowledgeRecords } from "./knowledge/searchNcm";
import type { NcmKnowledgeRecord } from "./knowledge/types";
import { getOfficialTariff } from "./tariffRates";

const dig8 = (s: string) => (s || "").replace(/\D/g, "").slice(0, 8);

let byCode: Map<string, NcmKnowledgeRecord> | null = null;
let byHeading: Map<string, NcmKnowledgeRecord> | null = null;
function buildIndexes() {
  if (byCode && byHeading) return;
  byCode = new Map();
  byHeading = new Map();
  for (const r of loadKnowledgeRecords()) {
    const k = dig8(r.code);
    if (k && !byCode.has(k)) byCode.set(k, r);
    if (r.level === "heading" && r.headingCode && !byHeading.has(r.headingCode)) {
      byHeading.set(r.headingCode, r);
    }
  }
}

export type ArancelaryJustification = {
  ncm: string;
  ncmDescription: string;
  chapter: string;
  chapterTitle: string;
  headingCode: string;
  headingDescription: string;
  confidencePct: number | null;
  status: string;
  product: {
    title: string;
    mainFunction?: string;
    materials?: string[];
    use?: string;
    productType?: string;
    technicalDescription?: string;
  };
  rationale: string;
  rgiApplied: string; // "RGI 1" | "RGI 1 y 6" detectado del texto, o "RGI 1 (por defecto)"
  discarded: Array<{ code: string; reason: string }>;
  alternatives: Array<{ code: string; description?: string; confidence?: number | null }>;
  tariff: { diePct: number | null; source: string } | null;
  origin?: string;
};

/** Detecta qué RGI/GIR menciona el razonamiento; si no, asume RGI 1 (texto de partida). */
function detectRgi(text: string): string {
  const t = (text || "").toLowerCase();
  const found: string[] = [];
  for (const n of ["1", "2", "3", "4", "5", "6"]) {
    if (new RegExp(`\\b(rgi|gir|regla)\\s*${n}\\b`).test(t)) found.push(n);
  }
  if (!found.length) return "RGI 1 (texto de partida y notas de sección/capítulo)";
  return `RGI ${found.join(" y ")}`;
}

export function buildArancelaryJustification(productJson: unknown): ArancelaryJustification | null {
  const p = (productJson ?? {}) as Record<string, any>;
  const ncm = String(p?.ncm ?? p?.raw?.ncm ?? "").trim();
  if (!ncm || ncm === "9999.99.99") return null;
  buildIndexes();
  const d8 = dig8(ncm);
  const rec = byCode!.get(d8);
  const headingCode = rec?.headingCode || d8.slice(0, 4);
  const headingRec = byHeading!.get(headingCode);
  const cl = (p?.raw?.classifier ?? {}) as Record<string, any>;
  const candidates: any[] = Array.isArray(cl.candidates) ? cl.candidates : [];
  const chosen = candidates.find((c) => dig8(c?.code ?? "") === d8);
  const discardedRaw: any[] = Array.isArray(cl.discardedCandidates) ? cl.discardedCandidates : [];
  const rationale =
    (typeof chosen?.rationale === "string" && chosen.rationale.trim()) ||
    (typeof p?.description === "string" ? p.description.split("\n\n").filter(Boolean).pop() : "") ||
    "";
  const off = getOfficialTariff(ncm);
  return {
    ncm,
    ncmDescription: rec?.description || p?.raw?.pcram?.title || "",
    chapter: rec?.chapter || d8.slice(0, 2),
    chapterTitle: rec?.chapterTitle || "",
    headingCode,
    headingDescription: headingRec?.description || "",
    confidencePct: typeof cl.confidence === "number" ? Math.round(cl.confidence * 100) : null,
    status: typeof cl.status === "string" ? cl.status : "",
    product: {
      title: String(p?.title ?? ""),
      mainFunction: typeof cl.mainFunction === "string" ? cl.mainFunction : undefined,
      materials: Array.isArray(cl.materials) ? cl.materials : undefined,
      use: typeof cl.use === "string" ? cl.use : undefined,
      productType: typeof cl.productType === "string" ? cl.productType : undefined,
      technicalDescription:
        (typeof cl.mergedTechnicalDescription === "string" && cl.mergedTechnicalDescription) ||
        (typeof p?.description === "string" ? p.description : undefined),
    },
    rationale,
    rgiApplied: detectRgi(`${rationale} ${cl.mergedTechnicalDescription ?? ""}`),
    discarded: discardedRaw
      .filter((x) => x && x.code)
      .map((x) => ({ code: String(x.code), reason: String(x.reason ?? "No corresponde por función/naturaleza.") }))
      .slice(0, 6),
    alternatives: candidates
      .filter((c) => dig8(c?.code ?? "") !== d8 && c?.code)
      .map((c) => ({
        code: String(c.code),
        description: typeof c.description === "string" ? c.description : undefined,
        confidence: typeof c.confidence === "number" ? c.confidence : null,
      }))
      .slice(0, 4),
    tariff: off ? { diePct: off.diePct, source: off.source } : null,
    origin: typeof p?.origin === "string" ? p.origin : undefined,
  };
}
