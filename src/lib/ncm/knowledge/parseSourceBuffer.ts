import path from "path";
import { PDFParse } from "pdf-parse";
import type { NcmChapterJson } from "./types";
import {
  extractChapterMeta,
  extractRowsFromPlainText,
  parseChapterFromRows,
  parseChapterHtml,
} from "./parseChapterHtml";

async function extractPdfText(buf: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buf });
  try {
    const res = await parser.getText();
    return res.text ?? "";
  } finally {
    await parser.destroy();
  }
}

function chapterFromFilename(name: string): string | null {
  const base = path.basename(name).replace(/\.pdf\.txt$/i, ".pdf");
  const lower = base.toLowerCase();
  const m =
    lower.match(/(?:capitulo|cap|chapter)[\s_.-]*(\d{1,2})/i) ??
    lower.match(/(\d{1,2})\.(?:pdf|txt|html)$/i);
  return m ? m[1]!.padStart(2, "0") : null;
}

/** El nombre del archivo (`capitulo_39.pdf`) manda sobre el texto interno (a veces viene otro capítulo). */
function preferFilenameChapter(ch: NcmChapterJson, filename: string): NcmChapterJson {
  const fromName = chapterFromFilename(filename);
  if (!fromName) return ch;
  return { ...ch, chapter: fromName };
}

/**
 * Parsea buffer desde PDF oficial, export HTML (.pdf.txt) o texto.
 */
export async function parseNcmSourceBuffer(buf: Buffer, filename: string): Promise<NcmChapterJson> {
  const lower = filename.toLowerCase();
  const fromName = chapterFromFilename(filename);

  if (lower.endsWith(".pdf")) {
    const t = await extractPdfText(buf);
    if (t.includes("<table")) {
      return preferFilenameChapter(parseChapterHtml(t), filename);
    }
    const rows = extractRowsFromPlainText(t);
    const meta = extractChapterMeta(t);
    return parseChapterFromRows(rows, {
      chapter: fromName ?? (meta.chapter && meta.chapter !== "00" ? meta.chapter : "00"),
      title: meta.title || `Capítulo ${fromName ?? "?"}`,
      sectionTitle: meta.sectionTitle,
    });
  }

  const utf8 = buf.toString("utf8");
  if (utf8.includes("<table")) {
    return preferFilenameChapter(parseChapterHtml(utf8), filename);
  }

  const rows = extractRowsFromPlainText(utf8);
  const meta = extractChapterMeta(utf8);
  return parseChapterFromRows(rows, {
    chapter: fromName ?? (meta.chapter && meta.chapter !== "00" ? meta.chapter : "00"),
    title: meta.title || `Capítulo ${fromName ?? "?"}`,
    sectionTitle: meta.sectionTitle,
  });
}
