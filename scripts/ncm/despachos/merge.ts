/**
 * Junta el dataset base (data/ncm/despachos/dataset.json) con todos los
 * batch-*.json producidos por los agentes de extracción, deduplica por
 * operación y separa:
 *   - concretados: tienen NCM real validado (despacho/SIMI/courier) → alimentan el catálogo
 *   - soloCotizacion: cotizaciones que no se importaron (ncm null) → referencia, no van al catálogo
 *
 * Uso:  npx tsx scripts/ncm/despachos/merge.ts
 * Salida: data/ncm/despachos/catalog.json  (+ resumen por consola)
 *
 * NO toca la base de datos. Es puro procesamiento local.
 */
import fs from "fs";
import path from "path";

type Tasas = Partial<Record<"die" | "te" | "iva" | "ivaAdic" | "ganancias" | "iibb", number>>;

type Entry = {
  op: string;
  producto: string;
  keywords?: string[];
  ncm: string | null;
  ncmSim?: string | null;
  ncmDescripcion?: string | null;
  ncmSecundarios?: string[];
  origen?: string | null;
  estado?: string | null;
  fobUsd?: number | null;
  tasas?: Tasas;
  despachoId?: string | null;
  fecha?: string | null;
  nota?: string;
};

const DIR = path.join(process.cwd(), "data", "ncm", "despachos");

function readJson(file: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.warn(`  ⚠ no pude leer/parsear ${path.basename(file)}: ${(e as Error).message}`);
    return null;
  }
}

function collect(): Entry[] {
  const out: Entry[] = [];

  // 1) dataset.json base (3 hechos a mano) → operaciones[]
  const base = readJson(path.join(DIR, "dataset.json")) as { operaciones?: Entry[] } | null;
  if (base?.operaciones) out.push(...base.operaciones);

  // 2) todos los batch-*.json (arrays de Entry)
  const batches = fs
    .readdirSync(DIR)
    .filter((f) => /^batch-.*\.json$/i.test(f))
    .sort();
  for (const f of batches) {
    const arr = readJson(path.join(DIR, f));
    if (Array.isArray(arr)) {
      const clean = arr.filter((r) => r && typeof r === "object" && "op" in r) as Entry[];
      console.log(`  · ${f}: ${clean.length} filas`);
      out.push(...clean);
    } else {
      console.warn(`  ⚠ ${f} no es un array`);
    }
  }
  return out;
}

function main() {
  console.log("Leyendo dataset + batches…");
  const all = collect();

  // dedup por op: preferí la entrada con NCM sobre la que no tiene
  const byOp = new Map<string, Entry>();
  for (const e of all) {
    const key = String(e.op).padStart(2, "0");
    const prev = byOp.get(key);
    if (!prev) byOp.set(key, e);
    else if (!prev.ncm && e.ncm) byOp.set(key, e); // el que tiene NCM gana
  }

  const entries = [...byOp.values()].sort((a, b) => Number(a.op) - Number(b.op));
  const concretados = entries.filter((e) => e.ncm);
  const soloCotizacion = entries.filter((e) => !e.ncm);

  const catalog = {
    generado: new Date().toISOString().slice(0, 10),
    totalOps: entries.length,
    conNcm: concretados.length,
    sinNcm: soloCotizacion.length,
    concretados,
    soloCotizacion,
  };

  const outFile = path.join(DIR, "catalog.json");
  fs.writeFileSync(outFile, JSON.stringify(catalog, null, 2));

  console.log("\n===== RESUMEN =====");
  console.log(`Operaciones únicas: ${entries.length}`);
  console.log(`  Con NCM validado (→ catálogo): ${concretados.length}`);
  console.log(`  Solo cotización (sin importar): ${soloCotizacion.length}`);
  console.log("\nProductos con NCM validado:");
  for (const e of concretados) {
    console.log(`  OP ${String(e.op).padStart(3)}  ${e.ncm}  ${e.producto}`);
  }
  console.log(`\n✔ Escrito: ${path.relative(process.cwd(), outFile)}`);
}

main();
