/**
 * Genera SQL idempotente (UPSERT) para cargar el catálogo de despachos en la
 * tabla ProductNcm de producción, para pegar en el editor SQL de Neon (evita el
 * bloqueo del puerto 5432). Reversible: volver a correrlo actualiza, no duplica.
 *
 * Uso: npx tsx scripts/ncm/despachos/gen-sql.ts
 * Salida: data/ncm/despachos/despachos-upsert.sql
 */
import fs from "fs";
import path from "path";

type Entry = {
  op: string; producto: string; keywords?: string[]; ncm: string | null;
  ncmSim?: string | null; ncmDescripcion?: string | null; origen?: string | null;
  estado?: string | null; fobUsd?: number | null; fecha?: string | null; nota?: string;
};

const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);

const q = (v: string | null | undefined): string =>
  v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;

const CATALOG = path.join(process.cwd(), "data", "ncm", "despachos", "catalog.json");
const OUT = path.join(process.cwd(), "data", "ncm", "despachos", "despachos-upsert.sql");

function notes(e: Entry): string {
  return [
    `Despacho OP ${e.op}`, e.origen ? `origen ${e.origen}` : null,
    e.estado ? e.estado.toLowerCase() : null, e.fecha,
    typeof e.fobUsd === "number" ? `FOB USD ${e.fobUsd}` : null,
    e.ncmSim ? `SIM ${e.ncmSim}` : null,
  ].filter(Boolean).join(" · ").slice(0, 500);
}

function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8")) as { concretados?: Entry[] };
  const all = (catalog.concretados ?? []).filter((e) => e.ncm && norm(e.producto).length >= 3);

  // Dedup por key normalizada: Postgres falla si un INSERT..ON CONFLICT trae dos
  // filas con la misma clave (ej. op 04 y 22 = "botellas termos de acero inoxidable").
  const byKey = new Map<string, Entry>();
  for (const e of all) byKey.set(norm(e.producto), e);
  const rows = [...byKey.values()];

  const values = rows.map((e) => {
    const key = norm(e.producto);
    const dubious = /valid|atenci[oó]n|revisar/i.test(e.nota ?? "");
    return `  (gen_random_uuid()::text, ${q(key)}, ${q(e.producto.slice(0, 200))}, ${q((e.keywords ?? []).join(", ").slice(0, 500) || null)}, ${q(e.ncm)}, ${q(e.ncmDescripcion?.slice(0, 500) ?? null)}, 1, 'manual', ${q(notes(e))}, ${dubious ? "false" : "true"}, now())`;
  });

  const sql = `-- Catálogo verificado producto→NCM desde despachos reales de E-COMEX (oficializados por AFIP).
-- ${rows.length} filas. Idempotente (ON CONFLICT (key) DO UPDATE). Pegar en el editor SQL de Neon.
-- Generado desde data/ncm/despachos/catalog.json — regenerar: npx tsx scripts/ncm/despachos/gen-sql.ts

INSERT INTO "ProductNcm"
  ("id", "key", "name", "keywords", "ncm", "ncmDescription", "confidence", "source", "notes", "verified", "updatedAt")
VALUES
${values.join(",\n")}
ON CONFLICT ("key") DO UPDATE SET
  "ncm" = EXCLUDED."ncm",
  "ncmDescription" = EXCLUDED."ncmDescription",
  "keywords" = EXCLUDED."keywords",
  "confidence" = EXCLUDED."confidence",
  "source" = EXCLUDED."source",
  "notes" = EXCLUDED."notes",
  "verified" = EXCLUDED."verified",
  "updatedAt" = now();
`;

  fs.writeFileSync(OUT, sql);
  console.log(`✔ ${rows.length} UPSERTs escritos en ${path.relative(process.cwd(), OUT)}`);
}

main();
