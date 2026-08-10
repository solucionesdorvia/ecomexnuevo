/**
 * Genera semillas de dominio para el clasificador a partir del catálogo de
 * despachos reales (data/ncm/despachos/catalog.json → concretados).
 *
 * Salida: src/lib/ncm/knowledge/despachoSeeds.generated.ts
 *   export const DESPACHO_SEEDS: DespachoSeed[] = [...]
 *
 * Cada producto histórico (con NCM oficializado por AFIP) se vuelve una semilla:
 * si la consulta del cliente contiene una de sus keywords, se inyecta ese NCM
 * como candidato. Complementa domainSeedCandidates (no lo reemplaza).
 *
 * Uso: npx tsx scripts/ncm/despachos/gen-seeds.ts   (correr después de merge.ts)
 */
import fs from "fs";
import path from "path";

type Entry = { op: string; producto: string; keywords?: string[]; ncm: string | null; ncmDescripcion?: string | null };

const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Palabras demasiado genéricas: como keyword de una sola palabra generan ruido. */
const STOP = new Set([
  "repuesto", "repuestos", "parte", "partes", "accesorio", "accesorios", "insumo", "insumos",
  "muestra", "muestras", "cliente", "maquina", "equipo", "equipos", "industrial", "kit", "varios",
  "modelo", "producto", "para", "con", "los", "las", "del", "una", "uno", "tipo", "marca",
  // materiales y atributos (no describen el producto: contaminan como en la búsqueda léxica)
  "acero", "metal", "plastico", "aluminio", "vidrio", "caucho", "goma", "inox", "inoxidable",
  "diesel", "gasoil", "nafta", "electrico", "electrica", "nuevo", "nueva", "usado", "sin",
  // términos ambiguos que matchean de más
  "auto", "moto", "pila", "agua", "aire",
]);

const CATALOG = path.join(process.cwd(), "data", "ncm", "despachos", "catalog.json");
const OUT = path.join(process.cwd(), "src", "lib", "ncm", "knowledge", "despachoSeeds.generated.ts");

function keepKeyword(nk: string): boolean {
  if (!nk) return false;
  if (nk.includes(" ")) return nk.length >= 5; // frases: siempre útiles
  return nk.length >= 4 && !STOP.has(nk); // palabra suelta: específica y no genérica
}

function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8")) as { concretados?: Entry[] };
  const rows = (catalog.concretados ?? []).filter((e) => e.ncm);

  // Agrupar por NCM (8 díg): un producto que se repite (varios despachos) = una semilla.
  const byNcm = new Map<string, { ncm: string; chapter: string; keywords: Set<string>; producto: string }>();

  for (const e of rows) {
    const ncm = e.ncm!.trim();
    const chapter = ncm.replace(/\D/g, "").slice(0, 2);
    const prod = e.producto.replace(/\s*\([^)]*\)/g, "").replace(/\s{2,}/g, " ").trim();

    const kws = new Set<string>();
    for (const kw of e.keywords ?? []) {
      const nk = norm(kw);
      if (keepKeyword(nk)) kws.add(nk);
    }
    // también sembramos palabras específicas del propio nombre de producto
    for (const w of norm(prod).split(" ")) {
      if (keepKeyword(w)) kws.add(w);
    }
    if (kws.size === 0) continue;

    const prev = byNcm.get(ncm);
    if (prev) {
      kws.forEach((k) => prev.keywords.add(k));
      if (prod.length < prev.producto.length) prev.producto = prod;
    } else {
      byNcm.set(ncm, { ncm, chapter, keywords: kws, producto: prod });
    }
  }

  const seeds = [...byNcm.values()]
    .sort((a, b) => a.ncm.localeCompare(b.ncm))
    .map((s) => ({
      ncm: s.ncm,
      title: `[Cap. ${s.chapter}] ${s.producto} (histórico despachos E-COMEX)`.slice(0, 110),
      keywords: [...s.keywords].sort(),
    }));

  const header = `// GENERADO por scripts/ncm/despachos/gen-seeds.ts — NO editar a mano.
// Semillas de dominio derivadas de ${rows.length} despachos reales oficializados por AFIP.
// Regenerar: npx tsx scripts/ncm/despachos/gen-seeds.ts

export type DespachoSeed = { ncm: string; title: string; keywords: string[] };

export const DESPACHO_SEEDS: DespachoSeed[] = ${JSON.stringify(seeds, null, 2)};
`;

  fs.writeFileSync(OUT, header);
  console.log(`✔ ${seeds.length} semillas escritas en ${path.relative(process.cwd(), OUT)}`);
  console.log(`  (de ${rows.length} despachos con NCM, agrupados por posición)`);
}

main();
