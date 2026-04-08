import * as cheerio from "cheerio";
import type { NcmChapterHeading, NcmChapterJson, NcmSubheading } from "./types";
import { cleanDescription, formatMercosurNcm8, headingCode4, ncmDigitsOnly } from "./normalize";

export type ParsedRow = { code: string; description: string };

const CODE_RE =
  /^(?:\d{2}\.\d{2}|\d{4}\.\d{1,2}(?:\.\d{2})?|\d{4}\.\d{2}\.\d{2}|\d{4}\.\d{2})$/;

function looksLikeCode(cell: string): boolean {
  const t = cell.trim();
  if (!t || t.length > 18) return false;
  return CODE_RE.test(t);
}

function looksLikeTaxOrStatColumn(cell: string): boolean {
  const t = cell.trim();
  if (!t) return true;
  if (/^(LA|NC|NG|EX|EXC)$/i.test(t)) return true;
  if (/^\d{1,2}\.\d{2}$/.test(t) && t.length <= 5) return true;
  if (/^\d{3}[A-Z]$/i.test(t)) return true;
  return false;
}

function pickDescription(cells: string[], codeIdx: number): string {
  if (cells.length >= 6) {
    const d5 = cleanDescription(cells[5] ?? "");
    if (d5.length >= 3 && !looksLikeTaxOrStatColumn(d5)) return d5;
  }
  let best = "";
  for (let i = codeIdx + 1; i < cells.length; i++) {
    const c = cleanDescription(cells[i] ?? "");
    if (!c || looksLikeTaxOrStatColumn(c)) continue;
    if (c.length > best.length) best = c;
  }
  return best;
}

/** `01.01` o `0101` (solo 4 dígitos) = partida nueva. */
export function isFourDigitPartida(code: string): boolean {
  const t = code.trim();
  if (/^\d{2}\.\d{2}$/.test(t)) return true;
  const d = ncmDigitsOnly(t);
  return d.length === 4 && !t.includes(".");
}

function normalizeDisplayCode(raw: string): string {
  const d = ncmDigitsOnly(raw);
  if (d.length <= 4) return headingCode4(raw);
  if (d.length <= 6) {
    const a = d.slice(0, 4);
    const b = d.slice(4, 6);
    return `${a}.${b}`;
  }
  return formatMercosurNcm8(d);
}

/**
 * Extrae filas código + descripción desde HTML tipo tabla AFIP/Mercosur.
 */
/** Fallback cuando el PDF devuelve texto plano sin tablas HTML. */
export function extractRowsFromPlainText(text: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const lines = text.split(/\r?\n/);
  const re = /^(\d{2}\.\d{2}|\d{4}\.\d{1,2}(?:\.\d{2})?)\s+(.{3,500}?)\s*$/;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(re);
    if (m) rows.push({ code: m[1]!, description: cleanDescription(m[2]!) });
  }
  return rows;
}

export function extractRowsFromHtml(html: string): ParsedRow[] {
  const $ = cheerio.load(html);
  const out: ParsedRow[] = [];

  $("tr").each((_, tr) => {
    const cells = $(tr)
      .find("td")
      .map((__, td) => cleanDescription($(td).text()))
      .get() as string[];
    if (cells.length < 4) return;

    const codeIdx = cells.findIndex((c) => looksLikeCode(c));
    if (codeIdx < 0) return;

    const code = cells[codeIdx]!.trim();
    const description = pickDescription(cells, codeIdx);
    if (!description || description.length < 2) return;

    out.push({ code, description });
  });

  return out;
}

function dedupeKey(code: string, desc: string): string {
  return `${ncmDigitsOnly(code)}|${desc.slice(0, 120)}`;
}

export function buildHeadingsFromRows(rows: ParsedRow[]): NcmChapterHeading[] {
  const headings: NcmChapterHeading[] = [];
  let current: NcmChapterHeading | null = null;
  const seen = new Set<string>();

  for (const row of rows) {
    const key = dedupeKey(row.code, row.description);
    if (seen.has(key)) continue;
    seen.add(key);

    if (isFourDigitPartida(row.code)) {
      current = {
        code: headingCode4(row.code),
        description: row.description,
        subheadings: [],
      };
      headings.push(current);
      continue;
    }

    if (!current) continue;
    const prefix = current.code;
    const d = ncmDigitsOnly(row.code);
    if (d.length < 5 || !d.startsWith(prefix)) continue;

    const sub: NcmSubheading = {
      code: normalizeDisplayCode(row.code),
      description: row.description,
    };
    current.subheadings.push(sub);
  }

  return headings;
}

export function parseChapterFromRows(
  rows: ParsedRow[],
  meta: { chapter: string; title: string; sectionTitle?: string }
): NcmChapterJson {
  return {
    chapter: meta.chapter,
    title: meta.title,
    sectionTitle: meta.sectionTitle,
    headings: buildHeadingsFromRows(rows),
    _rowCount: rows.length,
  };
}

export function extractChapterMeta(html: string): { chapter: string; title: string; sectionTitle?: string } {
  const text = html.replace(/\s+/g, " ");
  const cap = text.match(/CAP[ÍI]TULO\s+(\d{1,2})/i);
  const chapter = cap ? cap[1]!.padStart(2, "0") : "";

  const $ = cheerio.load(html);
  let title = "";

  const $capCell = $("td")
    .filter((_, el) => /CAP[ÍI]TULO\s+\d+/i.test($(el).text()))
    .first();
  if ($capCell.length) {
    const $nextRows = $capCell.closest("tr").nextAll("tr").slice(0, 4);
    $nextRows.each((_, row) => {
      if (title) return;
      $(row)
        .find("td")
        .each((__, td) => {
          if (title) return;
          const t = cleanDescription($(td).text());
          if (!t || /Notas\.?/i.test(t) || /CAP[ÍI]TULO/i.test(t)) return;
          if (t.length >= 5 && t.length < 260) title = t;
        });
    });
  }

  const sec = text.match(/SECCION\s+[IVXLC]+\s+([^<]{10,120})/i);
  const sectionTitle = sec ? cleanDescription(sec[1]!) : undefined;

  return { chapter, title: title || `Capítulo ${chapter}`, sectionTitle };
}

export function parseChapterHtml(html: string): NcmChapterJson {
  const meta = extractChapterMeta(html);
  const rows = extractRowsFromHtml(html);
  return parseChapterFromRows(
    rows,
    {
      chapter: meta.chapter || "00",
      title: meta.title,
      sectionTitle: meta.sectionTitle,
    }
  );
}
