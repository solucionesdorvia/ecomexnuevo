import { describe, it, expect } from "vitest";
import { buildArancelaryJustification } from "@/lib/ncm/justification";

describe("buildArancelaryJustification (defendible ante ARCA)", () => {
  it("arma la justificación desde el clasificador persistido", () => {
    const productJson = {
      title: "Deshidratador de alimentos doméstico",
      ncm: "8419.39.00",
      raw: {
        classifier: {
          status: "resolved",
          confidence: 0.9,
          mainFunction: "secado/deshidratación de alimentos por aire caliente",
          materials: ["plástico", "acero"],
          use: "doméstico",
          productType: "electrodoméstico",
          candidates: [
            { code: "8419.39.00", description: "Los demás secadores", confidence: 0.9, rationale: "Por función de secado, RGI 1." },
            { code: "8419.31.00", description: "Secadores agrícolas", confidence: 0.3, rationale: "Industrial de campo." },
          ],
          discardedCandidates: [{ code: "8514.30.00", reason: "Horno industrial de metalurgia, otra naturaleza." }],
          mergedTechnicalDescription: "Deshidratador eléctrico de mesada para frutas y verduras.",
        },
      },
    };
    const j = buildArancelaryJustification(productJson)!;
    expect(j).toBeTruthy();
    expect(j.ncm).toBe("8419.39.00");
    expect(j.confidencePct).toBe(90);
    expect(j.product.mainFunction).toMatch(/secado/);
    expect(j.rgiApplied).toMatch(/RGI 1/);
    expect(j.discarded[0].code).toBe("8514.30.00");
    expect(j.alternatives.some((a) => a.code === "8419.31.00")).toBe(true);
  });

  it("devuelve null si no hay NCM resuelto", () => {
    expect(buildArancelaryJustification({ title: "X", ncm: "9999.99.99" })).toBeNull();
    expect(buildArancelaryJustification({ title: "X" })).toBeNull();
  });
});
