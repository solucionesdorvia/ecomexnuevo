/**
 * Resolvedor de aranceles OFFLINE desde el índice NCM oficial (data/ncm/chapters).
 *
 * Por qué existe: hasta ahora los derechos salían SOLO de PCRAM en vivo (scraper con
 * login, frágil en producción). Cuando PCRAM fallaba, el motor caía a un 14% genérico
 * para TODO — derechos equivocados sin avisar. El nomenclador oficial ya trae las
 * alícuotas reales por posición; las parseamos acá para tener un piso confiable.
 *
 * Formato de las filas de alícuotas en el índice (quedan pegadas en `description`):
 *   "<sufijoSIM> <texto> <AEC> <DIE> <DII> <intervención> <ReintEXT> <ReintINT>"
 *   ej: "110W De CUATRO (4) o más ejes o con tracción 4x4 o 6x6  20.00 35.00 3.00 LNA 4.50 7.00"
 *
 * Mapeo de columnas (orden oficial AFIP, confirmado con el patrón de excepción
 * nacional de autos: AEC 20% pero DIE 35% en 8701.20.00):
 *   1) AEC  — Arancel Externo Común (Mercosur)
 *   2) DIE  — Derecho de Importación EXTRAZONA  ← el que se usa al importar de China/USA/Europa
 *   3) DII  — Derecho de Importación INTRAZONA (solo si el origen es Mercosur)
 *   4) intervención (LNA / LA / etc.) — restricción
 *   5) Reintegro extrazona (es export, no afecta el costo de importar)
 *   6) Reintegro intrazona (idem)
 *
 * NO incluye TE (3%), IVA (21%), IVA adicional, Ganancias ni IIBB: esos son del
 * régimen general y se aplican por regla uniforme en calcImportQuote.
 */
import fs from "fs";
import path from "path";

export type NcmTariff = {
  ncm: string; // XXXX.XX.XX
  /** Arancel Externo Común (%). */
  aecPct: number | null;
  /** Derecho de Importación Extrazona (%). El relevante para importar fuera del Mercosur. */
  diePct: number | null;
  /** Derecho de Importación Intrazona (%). */
  diiPct: number | null;
  /** Código de intervención crudo de la fila (ej. "LNA", "LA"), si lo hay. */
  intervention: string | null;
  /** Cuántas posiciones SIM se encontraron y si todas coinciden en DIE. */
  simRows: number;
  agree: boolean;
  source: "ncm_index";
};

/** Una fila parseada con su sufijo SIM. */
type RateRow = {
  aec: number;
  die: number;
  dii: number;
  intervention: string | null;
};

const chapterCache = new Map<string, unknown>();

function chaptersDir(): string {
  // Permite override por env por si en deploy el cwd difiere.
  const override = process.env.NCM_CHAPTERS_DIR;
  if (override) return path.isAbsolute(override) ? override : path.join(process.cwd(), override);
  return path.join(process.cwd(), "data", "ncm", "chapters");
}

function loadChapter(chapterNum: string): unknown | null {
  if (chapterCache.has(chapterNum)) return chapterCache.get(chapterNum) ?? null;
  const p = path.join(chaptersDir(), `chapter_${chapterNum}.json`);
  let data: unknown = null;
  try {
    if (fs.existsSync(p)) data = JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    data = null;
  }
  chapterCache.set(chapterNum, data);
  return data;
}

/** Normaliza "8701.20.00", "87012000", "8701200090" → dígitos (8). */
function toDigits8(ncm: string): string | null {
  const d = (ncm || "").replace(/\D/g, "");
  if (d.length < 6) return null;
  return d.slice(0, 8).padEnd(8, "0");
}

/**
 * Extrae las 6 columnas de alícuotas del final de una descripción de fila SIM.
 * Devuelve null si la línea no parece una fila de alícuotas.
 */
function parseRateRow(description: string): RateRow | null {
  // Debe empezar con sufijo SIM tipo "110W", "000Y", "210B".
  if (!/^\s*\d{3}[A-Za-z0-9]\b/.test(description)) return null;
  // Captura los 6 campos al final: AEC DIE DII <interv> ReintEXT ReintINT
  const m = description.match(
    /(\d{1,3}(?:[.,]\d{1,2})?)\s+(\d{1,3}(?:[.,]\d{1,2})?)\s+(\d{1,3}(?:[.,]\d{1,2})?)\s+(\S+)\s+(\d{1,3}(?:[.,]\d{1,2})?)\s+(\d{1,3}(?:[.,]\d{1,2})?)\s*$/
  );
  if (!m) return null;
  const num = (s: string) => Number(s.replace(",", "."));
  const aec = num(m[1]);
  const die = num(m[2]);
  const dii = num(m[3]);
  const interv = m[4];
  if ([aec, die, dii].some((n) => !Number.isFinite(n) || n > 100)) return null;
  const intervention = /^[\d.,-]+$/.test(interv) ? null : interv.toUpperCase();
  return { aec, die, dii, intervention };
}

type ChapterShape = {
  headings?: Array<{ code?: string; subheadings?: Array<{ code?: string; description?: string }> }>;
};

/** Recolecta las filas de alícuotas de un NCM (8 dígitos) desde su capítulo. */
function collectRateRows(digits8: string): RateRow[] {
  const chapterNum = digits8.slice(0, 2);
  const ch = loadChapter(chapterNum) as ChapterShape | null;
  if (!ch?.headings) return [];
  const rows: RateRow[] = [];
  for (const h of ch.headings) {
    for (const sub of h.subheadings ?? []) {
      const subDigits = (sub.code ?? "").replace(/\D/g, "").slice(0, 8).padEnd(8, "0");
      if (subDigits !== digits8) continue;
      const parsed = parseRateRow(sub.description ?? "");
      if (parsed) rows.push(parsed);
    }
  }
  return rows;
}

function fmtNcm(digits8: string): string {
  return `${digits8.slice(0, 4)}.${digits8.slice(4, 6)}.${digits8.slice(6, 8)}`;
}

/**
 * Devuelve el DIE oficial de TODAS las subpartidas hermanas dentro del mismo
 * heading (4 dígitos) del NCM dado. Sirve para detectar cuándo la elección de
 * subpartida cambia mucho el arancel (ej. 8419.31=14% vs 8419.39=35%) y costear
 * de forma conservadora. Todas las tasas salen de la MISMA fuente (índice
 * offline) para que el rango sea comparable.
 */
export function getSiblingTariffs(ncm: string): Array<{ ncm: string; diePct: number }> {
  const digits8 = toDigits8(ncm);
  if (!digits8) return [];
  const heading4 = digits8.slice(0, 4);
  const ch = loadChapter(digits8.slice(0, 2)) as ChapterShape | null;
  if (!ch?.headings) return [];
  const byCode = new Map<string, number[]>();
  for (const h of ch.headings) {
    for (const sub of h.subheadings ?? []) {
      const d = (sub.code ?? "").replace(/\D/g, "").slice(0, 8).padEnd(8, "0");
      if (d.slice(0, 4) !== heading4) continue;
      const parsed = parseRateRow(sub.description ?? "");
      if (!parsed) continue;
      if (!byCode.has(d)) byCode.set(d, []);
      byCode.get(d)!.push(parsed.die);
    }
  }
  const out: Array<{ ncm: string; diePct: number }> = [];
  for (const [d, dies] of byCode) {
    const m = mode(dies);
    if (typeof m === "number" && Number.isFinite(m)) out.push({ ncm: fmtNcm(d), diePct: m });
  }
  return out;
}

/** Moda (valor más frecuente) de una lista numérica. */
function mode(nums: number[]): number | null {
  if (!nums.length) return null;
  const count = new Map<number, number>();
  for (const n of nums) count.set(n, (count.get(n) ?? 0) + 1);
  let best = nums[0];
  let bestC = 0;
  for (const [v, c] of count) if (c > bestC) (best = v), (bestC = c);
  return best;
}

/**
 * Devuelve las alícuotas oficiales para un NCM, o null si no hay datos.
 * Si varias posiciones SIM difieren, toma la moda y marca `agree=false`.
 */
export function getOfficialTariff(ncm: string): NcmTariff | null {
  const digits8 = toDigits8(ncm);
  if (!digits8) return null;
  const rows = collectRateRows(digits8);
  if (!rows.length) return null;

  const dies = rows.map((r) => r.die);
  const aecs = rows.map((r) => r.aec);
  const diis = rows.map((r) => r.dii);
  const diePct = mode(dies);
  const interventions = rows.map((r) => r.intervention).filter((x): x is string => !!x);

  return {
    ncm: fmtNcm(digits8),
    aecPct: mode(aecs),
    diePct,
    diiPct: mode(diis),
    intervention: interventions[0] ?? null,
    simRows: rows.length,
    agree: dies.every((d) => d === diePct),
    source: "ncm_index",
  };
}
