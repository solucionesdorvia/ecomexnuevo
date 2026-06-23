import { existsSync, readFileSync } from "fs";
import path from "path";
import type { NcmKnowledgeRecord, NcmSearchHit } from "./types";
import { filterIncoherentForProductText } from "./coherence";
import { ncmDigitsOnly } from "./normalize";
import { expandQueryWithSynonyms } from "./synonyms";

let cachedRecords: NcmKnowledgeRecord[] | null = null;

/** Por defecto solo subpartidas (posiciones legales); menos ruido. Incluir partidas: `NCM_SEARCH_INCLUDE_HEADINGS=1`. */
function searchPool(records: NcmKnowledgeRecord[]): NcmKnowledgeRecord[] {
  if (process.env.NCM_SEARCH_INCLUDE_HEADINGS === "1") return records;
  return records.filter((r) => r.level === "subheading");
}

export function getKnowledgeIndexPath(): string {
  const override = process.env.NCM_KNOWLEDGE_INDEX_PATH;
  if (override) return path.isAbsolute(override) ? override : path.join(process.cwd(), override);
  return path.join(process.cwd(), "data", "ncm", "index.json");
}

export function loadKnowledgeRecords(): NcmKnowledgeRecord[] {
  if (cachedRecords) return cachedRecords;
  const p = getKnowledgeIndexPath();
  if (!existsSync(p)) {
    cachedRecords = [];
    return cachedRecords;
  }
  try {
    const raw = JSON.parse(readFileSync(p, "utf8")) as unknown;
    const arr = Array.isArray(raw) ? raw : (raw as { records?: NcmKnowledgeRecord[] })?.records;
    cachedRecords = Array.isArray(arr) ? (arr as NcmKnowledgeRecord[]) : [];
  } catch {
    cachedRecords = [];
  }
  return cachedRecords;
}

export function clearKnowledgeCache(): void {
  cachedRecords = null;
}

const STOP = new Set([
  "los",
  "las",
  "una",
  "uno",
  "del",
  "por",
  "con",
  "para",
  "como",
  "más",
  "este",
  "esta",
  "eso",
  "son",
  "que",
]);

function tokenizeForMatch(q: string): string[] {
  return q
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^\p{L}\d]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP.has(t))
    .slice(0, 32);
}

function matchedTerms(query: string, record: NcmKnowledgeRecord): string[] {
  const terms = tokenizeForMatch(query);
  const hay = `${record.searchText} ${record.code}`.toLowerCase();
  const out: string[] = [];
  for (const t of terms) {
    if (hay.includes(t)) out.push(t);
  }
  const digits = ncmDigitsOnly(query);
  if (digits.length >= 4 && record.codeDigits.includes(digits.slice(0, Math.min(8, digits.length)))) {
    out.push(digits.slice(0, 8));
  }
  return [...new Set(out)].slice(0, 12);
}

/** Coincidencia por términos + prefijo NCM (sin Fuse: evita bloqueos de minutos al indexar ~44k filas). */
function scoreRecord(query: string, rec: NcmKnowledgeRecord): number {
  const qTerms = tokenizeForMatch(query);
  const hay = `${rec.searchText}\n${rec.description}\n${rec.code}`.toLowerCase().slice(0, 1200);
  let s = 0;
  for (const t of qTerms) {
    if (t.length >= 4 && hay.includes(t)) s += 3;
    else if (t.length >= 3 && hay.includes(t)) s += 2;
    else if (t.length >= 2 && hay.includes(t)) s += 0.6;
  }

  const d = ncmDigitsOnly(query);
  if (d.length >= 4) {
    const pref4 = d.slice(0, 4);
    const take = Math.min(8, d.length);
    const pref = d.slice(0, take);
    if (rec.codeDigits.startsWith(pref)) s += 12;
    else if (rec.codeDigits.startsWith(pref4)) s += 5;
    else if (rec.headingCode === pref4) s += 3;
  }

  return s;
}

export type SearchNcmOptions = {
  limit?: number;
  applyCoherence?: boolean;
  productContext?: string;
};

/**
 * Búsqueda sobre `data/ncm/index.json`.
 */
export function searchNcm(query: string, opts?: SearchNcmOptions): NcmSearchHit[] {
  const records = loadKnowledgeRecords();
  if (!records.length || !query.trim()) return [];

  const pool = searchPool(records);
  const q = query.trim().slice(0, 800);
  // Query expandida con sinónimos formales del nomenclador (aditivo) — solo para
  // puntuar. La original (`q`) se conserva para matchedTerms y la coherencia.
  const qScore = expandQueryWithSynonyms(q);
  const limit = Math.min(Math.max(opts?.limit ?? 10, 1), 30);
  const scanLimit = Math.min(pool.length, Number(process.env.NCM_SEARCH_MAX_SCAN) || 60_000);

  const scored: { item: NcmKnowledgeRecord; raw: number }[] = [];
  for (let i = 0; i < scanLimit; i++) {
    const item = pool[i]!;
    const raw = scoreRecord(qScore, item);
    if (raw > 0) scored.push({ item, raw });
  }

  if (scored.length === 0) return [];

  scored.sort((a, b) => b.raw - a.raw);
  const maxRaw = scored[0]!.raw;
  const slice = scored.slice(0, Math.min(Math.max(limit * 4, 40), 200));

  let hits: NcmSearchHit[] = slice.map(({ item, raw }) => ({
    code: item.code,
    description: item.description,
    chapter: item.chapter,
    chapterTitle: item.chapterTitle,
    headingCode: item.headingCode,
    score: Math.min(1, raw / Math.max(maxRaw, 1e-6)),
    matchedTerms: matchedTerms(q, item),
    level: item.level,
  }));

  hits.sort((a, b) => b.score - a.score);
  hits = hits.slice(0, limit);

  if (opts?.applyCoherence === false) return hits;
  const productCtx = (opts?.productContext ?? q).trim();
  return filterIncoherentForProductText(productCtx, hits);
}
