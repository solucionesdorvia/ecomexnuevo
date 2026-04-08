/**
 * Ingesta capítulos NCM desde PDF o export HTML (.pdf.txt).
 *
 * Uso:
 *   NCM_SOURCE_DIR="/ruta/a/pdfs" npx tsx scripts/ncm/ingest-chapters.ts
 *   npx tsx scripts/ncm/ingest-chapters.ts "/ruta/opcional"
 *
 * Salida:
 *   data/ncm/chapters/chapter_XX.json
 *   data/ncm/index.json  (índice plano para searchNcm)
 */
import fs from "fs";
import path from "path";
import { flattenAllChapters } from "../../src/lib/ncm/knowledge/flattenChapter";
import { parseNcmSourceBuffer } from "../../src/lib/ncm/knowledge/parseSourceBuffer";
import type { NcmChapterJson } from "../../src/lib/ncm/knowledge/types";

async function main() {
  const srcDir = process.argv[2] || process.env.NCM_SOURCE_DIR || ".";
  const resolved = path.resolve(srcDir);
  if (!fs.existsSync(resolved)) {
    console.error("No existe el directorio:", resolved);
    process.exit(1);
  }

  const outDir = path.join(process.cwd(), "data", "ncm", "chapters");
  fs.mkdirSync(outDir, { recursive: true });

  const allFiles = fs
    .readdirSync(resolved)
    .filter((f) => /\.(pdf|txt|html)$/i.test(f) && !f.startsWith("."));

  const set = new Set(allFiles);
  /** Si existe `capitulo_XX.pdf`, no reprocesar `capitulo_XX.pdf.txt` (mismo contenido). */
  const files = allFiles.filter((f) => {
    if (!/\.pdf\.txt$/i.test(f)) return true;
    const pdfTwin = f.replace(/\.pdf\.txt$/i, ".pdf");
    return !set.has(pdfTwin);
  });

  const chapters: NcmChapterJson[] = [];

  for (const f of files.sort()) {
    const full = path.join(resolved, f);
    const buf = fs.readFileSync(full);
    try {
      const ch = await parseNcmSourceBuffer(buf, f);
      chapters.push(ch);
      const out = path.join(outDir, `chapter_${ch.chapter}.json`);
      fs.writeFileSync(out, JSON.stringify(ch, null, 2), "utf8");
      // eslint-disable-next-line no-console
      console.log("OK", f, "→", out, "partidas:", ch.headings.length, "filas:", ch._rowCount ?? "—");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("FAIL", f, e);
    }
  }

  const flat = flattenAllChapters(chapters);
  const indexPath = path.join(process.cwd(), "data", "ncm", "index.json");
  fs.writeFileSync(indexPath, JSON.stringify(flat, null, 2), "utf8");
  // eslint-disable-next-line no-console
  console.log("index.json →", indexPath, "registros:", flat.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
