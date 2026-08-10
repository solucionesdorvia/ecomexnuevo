/**
 * Carga el catálogo verificado (data/ncm/despachos/catalog.json → concretados)
 * en la tabla ProductNcm como entradas "de oro" (verified: true, source: manual),
 * porque provienen de despachos/SIMI reales oficializados por AFIP.
 *
 * Uso:
 *   npx tsx scripts/ncm/despachos/import.ts            # DRY-RUN: muestra qué haría, no escribe
 *   npx tsx scripts/ncm/despachos/import.ts --commit   # escribe en la base (requiere DATABASE_URL)
 *
 * Regla de upsert: una fila por producto (key = nombre normalizado). Si ya existe
 * una entrada verificada, la de despacho manda (decisión más reciente sobre un
 * import efectivamente concretado). Guarda keywords, origen/fecha/FOB en notes.
 */
import fs from "fs";
import path from "path";
import { prisma } from "../../../src/lib/db";
import { normalizeProductKey } from "../../../src/lib/ncm/productCatalog";

type Entry = {
  op: string;
  producto: string;
  keywords?: string[];
  ncm: string | null;
  ncmSim?: string | null;
  ncmDescripcion?: string | null;
  origen?: string | null;
  estado?: string | null;
  fobUsd?: number | null;
  despachoId?: string | null;
  fecha?: string | null;
};

const COMMIT = process.argv.includes("--commit");
const CATALOG = path.join(process.cwd(), "data", "ncm", "despachos", "catalog.json");

function buildNotes(e: Entry): string {
  const bits = [
    `Despacho OP ${e.op}`,
    e.origen ? `origen ${e.origen}` : null,
    e.estado ? e.estado.toLowerCase() : null,
    e.fecha ? e.fecha : null,
    typeof e.fobUsd === "number" ? `FOB USD ${e.fobUsd}` : null,
    e.ncmSim ? `SIM ${e.ncmSim}` : null,
  ].filter(Boolean);
  return bits.join(" · ").slice(0, 500);
}

async function main() {
  if (!fs.existsSync(CATALOG)) {
    console.error(`No existe ${CATALOG}. Corré primero: npx tsx scripts/ncm/despachos/merge.ts`);
    process.exit(1);
  }
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8")) as { concretados?: Entry[] };
  const rows = (catalog.concretados ?? []).filter((e) => e.ncm && normalizeProductKey(e.producto).length >= 3);

  console.log(`${COMMIT ? "COMMIT" : "DRY-RUN"} · ${rows.length} productos con NCM a cargar en ProductNcm\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const e of rows) {
    const key = normalizeProductKey(e.producto);
    const data = {
      name: e.producto.trim().slice(0, 200),
      keywords: (e.keywords ?? []).join(", ").slice(0, 500) || null,
      ncm: e.ncm!.trim(),
      ncmDescription: e.ncmDescripcion?.slice(0, 500) ?? null,
      confidence: 1,
      source: "manual" as const,
      notes: buildNotes(e),
      verified: true,
    };

    if (!COMMIT) {
      console.log(`  [${key}]  → ${data.ncm}   (${e.producto})`);
      continue;
    }

    try {
      const existing = await prisma.productNcm.findUnique({ where: { key } });
      if (existing) {
        await prisma.productNcm.update({ where: { key }, data: { ...data, timesUsed: { increment: 0 } } });
        updated++;
      } else {
        await prisma.productNcm.create({ data: { key, ...data } });
        created++;
      }
    } catch (err) {
      console.warn(`  ⚠ falló ${key}: ${(err as Error).message}`);
      skipped++;
    }
  }

  if (COMMIT) {
    console.log(`\n✔ Listo. Creados: ${created} · Actualizados: ${updated} · Fallidos: ${skipped}`);
    await prisma.$disconnect();
  } else {
    console.log(`\n(DRY-RUN) No se escribió nada. Para cargar: npx tsx scripts/ncm/despachos/import.ts --commit`);
  }
}

main();
