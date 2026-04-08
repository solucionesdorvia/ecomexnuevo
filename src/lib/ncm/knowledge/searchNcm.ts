import { existsSync, readFileSync } from "fs";
import path from "path";
import Fuse from "fuse.js";
import type { NcmKnowledgeRecord, NcmSearchHit } from "./types";
import { filterIncoherentForProductText } from "./coherence";
import { ncmDigitsOnly } from "./normalize";

let cachedRecords: NcmKnowledgeRecord[] | null = null;

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

/** Tras re-ingesta o cambio de `index.json` en caliente. */
export function clearKnowledgeCache(): void {
  cachedRecords = null;
  fuseInstance = null;
  fuseBuiltForCount = -1;
}

let fuseInstance: Fuse<NcmKnowledgeRecord> | null = null;
let fuseBuiltForCount = -1;

function getFuse(records: NcmKnowledgeRecord[]): Fuse<NcmKnowledgeRecord> {
  if (fuseInstance && records.length === fuseBuiltForCount) return fuseInstance;
  fuseBuiltForCount = records.length;
  fuseInstance = new Fuse(records, {
    keys: [
      { name: "searchText", weight: 0.55 },
      { name: "description", weight: 0.3 },
      { name: "code", weight: 0.1 },
      { name: "chapterTitle", weight: 0.05 },
    ],
    threshold: 0.42,
    ignoreLocation: true,
    minMatchCharLength: 2,
    includeScore: true,
  });
  return fuseInstance;
}

function tokenizeForMatch(q: string): string[] {
  return q
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^\p{L}\d]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length > 1)
    .slice(0, 24);
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

function fuseScoreToDisplay(score: number | undefined): number {
  if (score == null || !Number.isFinite(score)) return 0.55;
  return Math.max(0, Math.min(1, 1 / (1 + score * 4)));
}

export type SearchNcmOptions = {
  limit?: number;
  /** Aplicar filtro wearable vs infra (default true) */
  applyCoherence?: boolean;
  /** Texto del producto (para coherencia). Si no se pasa, se usa `query`. */
  productContext?: string;
};

/**
 * Búsqueda híbrida: Fuse.js sobre índice + refuerzo si el query trae dígitos NCM.
 * Requiere `data/ncm/index.json` (generado con `npm run ncm:ingest`).
 */
export function searchNcm(query: string, opts?: SearchNcmOptions): NcmSearchHit[] {
  const records = loadKnowledgeRecords();
  if (!records.length || !query.trim()) return [];

  const limit = Math.min(Math.max(opts?.limit ?? 10, 1), 30);
  const fuse = getFuse(records);
  const q = query.trim().slice(0, 800);

  const raw = fuse.search(q, { limit: limit * 3 });
  const digitQuery = ncmDigitsOnly(q);

  const hits: NcmSearchHit[] = raw.map((r) => {
    const item = r.item;
    const base = fuseScoreToDisplay(r.score);
    let score = base;
    if (digitQuery.length >= 4 && item.codeDigits.startsWith(digitQuery.slice(0, Math.min(8, digitQuery.length)))) {
      score = Math.min(1, score + 0.35);
    }
    return {
      code: item.code,
      description: item.description,
      chapter: item.chapter,
      chapterTitle: item.chapterTitle,
      headingCode: item.headingCode,
      score,
      matchedTerms: matchedTerms(q, item),
      level: item.level,
    };
  });

  hits.sort((a, b) => b.score - a.score);
  const sliced = hits.slice(0, limit);
  if (opts?.applyCoherence === false) return sliced;
  const productCtx = (opts?.productContext ?? q).trim();
  return filterIncoherentForProductText(productCtx, sliced);
}
