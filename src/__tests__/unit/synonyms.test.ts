import { describe, it, expect } from "vitest";
import { expandQueryWithSynonyms } from "@/lib/ncm/knowledge/synonyms";
import { searchNcm } from "@/lib/ncm/knowledge/searchNcm";

describe("expandQueryWithSynonyms (Fase 3.1)", () => {
  it("agrega el término formal y preserva la query original (aditivo)", () => {
    const r = expandQueryWithSynonyms("heladera con freezer");
    expect(r).toContain("heladera"); // original intacta
    expect(r).toContain("refrigerador"); // sinónimo formal agregado
  });

  it("no modifica queries sin sinónimo conocido", () => {
    expect(expandQueryWithSynonyms("engranaje helicoidal de acero")).toBe("engranaje helicoidal de acero");
  });
});

describe("searchNcm con sinónimos llega al capítulo correcto (sin falsos amigos)", () => {
  // El término común no matchea el nomenclador, pero el sinónimo formal sí.
  const CASES: Array<[string, string]> = [
    ["heladera con freezer", "84"],
    ["parlante bluetooth", "85"],
    ["auriculares inalambricos", "85"],
    ["anteojos de sol", "90"],
    ["mochila escolar", "42"],
    ["cartera de cuero", "42"],
    ["campera rompeviento", "61"],
    ["perfume importado", "33"],
    ["juguete didactico", "95"],
  ];
  for (const [q, chap] of CASES) {
    it(`${q} → capítulo ${chap}`, () => {
      const hits = searchNcm(q, { limit: 3, applyCoherence: false });
      expect(hits[0]?.chapter.startsWith(chap)).toBe(true);
    });
  }
});
