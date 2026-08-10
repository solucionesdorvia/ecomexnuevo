import { describe, it, expect } from "vitest";
import { buildNcmKnowledgeEvidence } from "@/lib/ncm/knowledge/ncmKnowledgeEvidence";

/**
 * Regresión del bug "camioneta clasificada como chapa de acero (7210)".
 * Causa: (A) faltaban semillas de vehículos de carga en cap. 87, y (B) la línea
 * de MATERIALES que extrae el analista ("acero, aluminio…") contaminaba la
 * búsqueda léxica y traía códigos de materia prima que tapaban al producto.
 * Estos tests fallan el build si cualquiera de los dos vuelve a romperse.
 */
const techText = (denom: string, func: string, materiales: string, extra = "") =>
  [
    `Denominación comercial / producto: ${denom}`,
    `Función principal: ${func}`,
    `Materiales / composición: ${materiales}`,
    extra,
  ]
    .filter(Boolean)
    .join("\n");

const cap = (q: string, i = 0) =>
  (buildNcmKnowledgeEvidence(q)?.candidates?.[i]?.ncm_code ?? "").replace(/\D/g, "").slice(0, 2);
const heading = (q: string, i = 0) =>
  (buildNcmKnowledgeEvidence(q)?.candidates?.[i]?.ncm_code ?? "").replace(/\D/g, "").slice(0, 4);

describe("evidencia NCM — vehículos de carga (cap. 87)", () => {
  it("camioneta / pick-up con materiales → cap. 87 (8704), nunca chapa (72)", () => {
    const q = techText("camioneta pick-up Toyota Tundra", "transporte de carga", "acero, aluminio, caucho, vidrio, plástico", "Alimentación / energía: motor nafta");
    expect(cap(q)).toBe("87");
    expect(heading(q)).toBe("8704");
  });
  it("camión con materiales → cap. 87 (8704)", () => {
    expect(heading(techText("camión Scania", "transporte de carga pesada", "acero, aluminio, caucho", "Alimentación / energía: diésel"))).toBe("8704");
  });
  it("ómnibus / colectivo con materiales → cap. 87 (8702)", () => {
    expect(heading(techText("ómnibus para pasajeros", "transporte de personas", "acero, aluminio, vidrio", "Alimentación / energía: diésel"))).toBe("8702");
  });
});

describe("evidencia NCM — guard de materiales (long tail)", () => {
  it("un producto SIN semilla no se va a su materia prima por listar materiales", () => {
    // Mueble de oficina hecho de acero/aluminio → muebles (cap. 94), NUNCA acero (72).
    const q = techText("mueble organizador modular para oficina", "guardar y ordenar documentos", "acero, melamina, aluminio");
    expect(cap(q)).not.toBe("72");
    expect(cap(q)).toBe("94");
  });
});

describe("evidencia NCM — controles que ya funcionaban", () => {
  it("automóvil de pasajeros sigue en cap. 87 (8703)", () => {
    expect(heading(techText("automóvil sedán", "transporte de personas", "acero, aluminio, caucho, vidrio"))).toBe("8703");
  });
  it("auriculares siguen presentes en cap. 85 (8518) entre los candidatos", () => {
    const q = techText("auriculares bluetooth", "reproducción de audio", "plástico, cobre, silicona, imanes");
    const headings = (buildNcmKnowledgeEvidence(q)?.candidates ?? []).map((c) => c.ncm_code.replace(/\D/g, "").slice(0, 4));
    expect(headings).toContain("8518");
  });
});
