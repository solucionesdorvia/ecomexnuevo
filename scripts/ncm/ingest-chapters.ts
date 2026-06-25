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
import crypto from "crypto";
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
      console.log("OK", f, "→", out, "partidas:", ch.headings.length, "filas:", ch._rowCount ?? "—");
    } catch (e) {
      console.error("FAIL", f, e);
    }
  }

  const flat = flattenAllChapters(chapters);
  const indexPath = path.join(process.cwd(), "data", "ncm", "index.json");
  const indexJson = JSON.stringify(flat, null, 2);
  fs.writeFileSync(indexPath, indexJson, "utf8");
  console.log("index.json →", indexPath, "registros:", flat.length);

  // version.json: trazabilidad de freshness. sourceDate = fecha del dump oficial
  // AFIP/ARCA (pasala con NCM_SOURCE_DATE=YYYY-MM-DD al correr la ingesta).
  const version = {
    generatedAt: new Date().toISOString(),
    sourceDate: process.env.NCM_SOURCE_DATE || null,
    checksum: crypto.createHash("sha256").update(indexJson).digest("hex").slice(0, 16),
    records: flat.length,
  };
  const versionPath = path.join(process.cwd(), "data", "ncm", "version.json");
  fs.writeFileSync(versionPath, JSON.stringify(version, null, 2), "utf8");
  console.log("version.json →", versionPath, version);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
