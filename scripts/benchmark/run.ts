/**
 * Benchmark E-COMEX vs Arancely (referencia: base oficial vigente de arancely.com,
 * 10.330 productos, actualizada 2026-03-13). Descargar antes:
 *   curl -s "https://www.arancely.com/api/ncm?v=1" -o /tmp/bench/arancely.json
 *
 * Parte A — Impuestos: compara el DIE del índice offline de E-COMEX contra el DI de
 *   Arancely para todas las posiciones presentes en ambos. Mide cuán desactualizado
 *   está el índice offline.
 * Parte B — Clasificación: corre ~110 productos por el motor de evidencia de E-COMEX
 *   (buildNcmKnowledgeEvidence, determinístico) y compara el NCM elegido contra el de
 *   Arancely (match exacto / partida / capítulo / miss).
 */
import fs from "fs";
import { buildNcmKnowledgeEvidence } from "../../src/lib/ncm/knowledge/ncmKnowledgeEvidence";
import { getOfficialTariff } from "../../src/lib/ncm/tariffRates";

type AranProd = {
  id: number; name: string; ncm: string; di: number; iva: number;
  ivaAd: number; ganancias: number; iibb: number; te: number; category: string;
  officialName?: string; interventions?: string[]; _featured?: boolean;
};
const aran = JSON.parse(fs.readFileSync("/tmp/bench/arancely.json", "utf8")) as {
  products: AranProd[];
};
const dig8 = (s: string) => s.replace(/\D/g, "").slice(0, 8);
const byNcm = new Map<string, AranProd>();
for (const p of aran.products) if (!byNcm.has(dig8(p.ncm))) byNcm.set(dig8(p.ncm), p);

// ── Parte A: impuestos offline vs arancely (DIE) ─────────────────────────────
function partA() {
  let both = 0, dieMatch = 0, dieOff = 0;
  const ej: string[] = [];
  for (const p of aran.products) {
    const off = getOfficialTariff(p.ncm);
    if (!off || off.diePct == null) continue;
    both++;
    if (Math.abs(off.diePct - p.di) < 0.6) dieMatch++;
    else {
      dieOff++;
      if (ej.length < 14) ej.push(`  ${p.ncm} ${p.name.slice(0, 32).padEnd(32)} offline ${off.diePct}% vs arancely ${p.di}%`);
    }
  }
  console.log(`\n=== PARTE A — Impuestos (DIE offline E-COMEX vs Arancely vigente) ===`);
  console.log(`Posiciones en ambos: ${both} · DIE coincide: ${dieMatch} (${((dieMatch / both) * 100).toFixed(1)}%) · difiere: ${dieOff}`);
  console.log(`Ejemplos de divergencia (índice offline pre-2022 vs arancely 2026):`);
  console.log(ej.join("\n"));
}

// ── Parte B (v2): iterar productos de Arancely directo (expected sin ambigüedad) ──
// Query = primer alias del nombre de Arancely; expected = su NCM. Cero matching difuso.
// Set curado de ~100 productos de consumo reales (query natural → NCM esperado de
// Arancely). Reemplaza el barrido del nomenclador (que traía sublíneas industriales).
const CURATED: Array<[string, string]> = [
  // Electrónica
  ["celular smartphone", "8517.13.00"], ["notebook laptop", "8471.30.19"], ["tablet ipad", "8471.30.12"],
  ["monitor para pc", "8528.52.00"], ["televisor smart tv", "8528.72.00"], ["auriculares bluetooth", "8518.30.00"],
  ["parlante bluetooth", "8518.22.00"], ["mouse inalambrico", "8471.60.53"], ["teclado usb", "8471.60.52"],
  ["disco ssd externo", "8471.70.40"], ["pendrive usb", "8523.51.00"], ["cargador de celular", "8504.40.10"],
  ["camara de fotos", "8525.89.00"], ["drone con camara", "8806.10.00"], ["consola de videojuegos", "9504.50.00"],
  ["impresora multifuncion", "8443.31.00"], ["router wifi", "8517.62.59"],
  // Electrodomésticos
  ["heladera con freezer", "8418.10.00"], ["lavarropas automatico", "8450.11.00"], ["aire acondicionado split", "8415.10.11"],
  ["microondas", "8516.50.00"], ["tostadora de pan", "8516.72.00"], ["cafetera electrica", "8516.71.00"],
  ["licuadora", "8509.40.10"], ["secador de pelo", "8516.31.00"], ["plancha de ropa", "8516.40.00"],
  ["ventilador de pie", "8414.51.90"], ["aspiradora", "8508.11.00"], ["pava electrica", "8516.79.00"],
  // Herramientas / maquinaria
  ["taladro percutor", "8467.21.00"], ["amoladora angular", "8467.29.00"], ["soldadora inverter", "8515.31.00"],
  ["compresor de aire", "8414.40.20"], ["motosierra", "8467.81.00"], ["hidrolavadora", "8424.30.10"],
  ["excavadora hidraulica", "8429.52.00"], ["autoelevador", "8427.20.00"], ["generador electrico", "8502.11.00"],
  // Vehículos / repuestos
  ["automovil sedan", "8703.23.10"], ["motocicleta 150cc", "8711.20.00"], ["bicicleta rodado 29", "8712.00.10"],
  ["neumatico de auto", "4011.10.00"], ["casco para moto", "6506.10.00"], ["bateria de auto", "8507.10.00"],
  // Indumentaria / calzado
  ["zapatillas deportivas", "6404.11.00"], ["zapatos de cuero", "6403.99.90"], ["remera de algodon", "6109.10.00"],
  ["buzo hoodie", "6110.20.00"], ["campera rompeviento", "6201.40.00"], ["pantalon jean", "6203.42.00"],
  ["vestido de mujer", "6204.43.00"], ["camisa de hombre", "6205.20.00"], ["ropa interior", "6107.11.00"],
  ["corpino", "6212.10.00"], ["medias", "6115.95.00"], ["traje de baño", "6211.11.00"], ["gorra", "6505.00.90"],
  // Marroquinería / accesorios
  ["mochila", "4202.92.00"], ["cartera de cuero", "4202.21.00"], ["valija", "4202.12.10"],
  ["anteojos de sol", "9004.10.00"], ["reloj de pulsera", "9102.19.00"],
  // Belleza / salud
  ["perfume", "3303.00.10"], ["maquillaje facial", "3304.91.00"], ["crema facial", "3304.99.10"],
  ["shampoo", "3305.10.00"], ["protector solar", "3304.99.90"], ["dentifrico pasta dental", "3306.10.00"],
  // Juguetes / deportes
  ["juguete", "9503.00.99"], ["muñeca barbie", "9503.00.21"], ["peluche", "9503.00.40"],
  ["lego bloques", "9503.00.97"], ["pelota de futbol", "9506.62.00"], ["rompecabezas puzzle", "9503.00.70"],
  // Hogar / muebles
  ["silla de oficina", "9401.30.00"], ["colchon", "9404.21.00"], ["sabanas", "6302.31.00"], ["toalla", "6302.60.00"],
  ["luminaria led", "9405.40.00"], ["olla de acero", "7323.93.00"], ["vajilla de ceramica", "6911.10.00"],
  // Bebidas
  ["vino", "2204.21.00"], ["cerveza", "2203.00.00"], ["aceite de oliva", "1509.40.00"], ["cafe en grano", "0901.21.00"],
  // Industria / construcción
  ["panel solar", "8541.43.00"], ["motor electrico", "8501.52.00"], ["bomba de agua", "8413.70.10"],
  ["ceramico para piso", "6907.21.00"], ["pintura latex", "3209.10.00"], ["taladro a bateria", "8467.21.00"],
];

function partB2() {
  console.log(`\n=== PARTE B — Clasificación NCM (E-COMEX vs Arancely), ${CURATED.length} productos de consumo ===`);
  let exact = 0, heading = 0, chapter = 0, miss = 0;
  const fails: string[] = [];
  for (const [q, exp] of CURATED) {
    const ec = buildNcmKnowledgeEvidence(q)?.candidates?.[0]?.ncm_code ?? "";
    const ecd = dig8(ec), ad = dig8(exp);
    if (ecd === ad) exact++;
    else if (ecd.slice(0, 4) === ad.slice(0, 4)) heading++;
    else if (ecd.slice(0, 2) === ad.slice(0, 2)) { chapter++; fails.push(`  [cap] "${q}" → ${ec || "—"} vs ${exp}`); }
    else { miss++; fails.push(`  [MISS] "${q}" → E-COMEX ${ec || "—"} vs Arancely ${exp}`); }
  }
  const tot = CURATED.length;
  console.log(`  Exacto (8 díg): ${exact} (${((exact / tot) * 100).toFixed(0)}%) · misma partida (4): ${heading} · mismo cap: ${chapter} · MISS: ${miss}`);
  console.log(`  Partida correcta o mejor: ${exact + heading} (${(((exact + heading) / tot) * 100).toFixed(0)}%)`);
  console.log(`\nDivergencias (capítulo errado o distinto a Arancely):`);
  console.log(fails.join("\n"));
}

partA();
partB2();
