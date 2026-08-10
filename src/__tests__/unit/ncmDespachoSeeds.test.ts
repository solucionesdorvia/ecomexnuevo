import { describe, it, expect } from "vitest";
import { despachoSeedCandidates } from "@/lib/ncm/knowledge/despachoSeeds";
import { buildNcmKnowledgeEvidence } from "@/lib/ncm/knowledge/ncmKnowledgeEvidence";

/**
 * Fase 2: las semillas derivadas de despachos reales (despachoSeeds.generated.ts)
 * deben hacer que frases variadas de cliente aterricen en el NCM correcto, aunque
 * el nombre no coincida con el texto del nomenclador y el match no sea exacto.
 */
const seedHeadings = (q: string) =>
  despachoSeedCandidates(q).map((c) => c.ncm_code.replace(/\D/g, "").slice(0, 4));
const seedCodes8 = (q: string) =>
  despachoSeedCandidates(q).map((c) => c.ncm_code.replace(/\D/g, "").slice(0, 8));
const evidenceHeadings = (q: string) =>
  (buildNcmKnowledgeEvidence(q)?.candidates ?? []).map((c) => c.ncm_code.replace(/\D/g, "").slice(0, 4));

describe("semillas de despachos — frases de cliente → NCM histórico", () => {
  const cases: Array<[string, string]> = [
    ["torno CNC para metal", "8458"],
    ["liofilizador de alimentos", "8419"],
    ["cargador para auto eléctrico", "8504"],
    ["kimono de mujer", "6211"],
    ["sensor de rayos X para odontología", "9022"],
    ["máquina de chocolate", "8438"],
    ["pantalla LED gigante", "8528"],
    ["separadora de huevos", "8438"],
    ["alineadora de ruedas 3D", "9031"],
    ["minadora de criptomonedas", "8543"],
    ["film para polarizar vidrios de autos", "3919"],
    ["ionizador para piscina", "8421"],
  ];
  it.each(cases)("'%s' inyecta la partida %s", (q, heading) => {
    expect(seedHeadings(q)).toContain(heading);
  });

  it("una palabra genérica no dispara la semilla equivocada (auto ≠ automático)", () => {
    // "automatico" NO debe traer el auto (8703) por la keyword 'auto'.
    expect(seedCodes8("proceso automatico de control")).not.toContain("87032310");
  });

  it("nunca devuelve más de 6 candidatos (evita diluir)", () => {
    expect(despachoSeedCandidates("máquina torno chocolate placa cargador auriculares gafas").length).toBeLessThanOrEqual(6);
  });

  it("consulta sin relación no inyecta nada", () => {
    expect(despachoSeedCandidates("xyzzy qwerty foobar")).toHaveLength(0);
  });
});

describe("integración: buildNcmKnowledgeEvidence usa las semillas de despachos", () => {
  it("'liofilizador' aparece como candidato 8419 en la evidencia", () => {
    expect(evidenceHeadings("liofilizador freeze dryer para alimentos")).toContain("8419");
  });
  it("'kimono' aparece como candidato 6211 en la evidencia", () => {
    expect(evidenceHeadings("kimono de vestir para mujer")).toContain("6211");
  });
});
