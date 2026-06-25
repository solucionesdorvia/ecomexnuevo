import { describe, it, expect } from "vitest";
import { assessImportRegime, COURIER_MAX_FOB_USD, COURIER_MAX_WEIGHT_KG } from "@/lib/quote/regime";

describe("assessImportRegime — Courier vs General", () => {
  it("envío chico sin intervenciones → Courier", () => {
    const a = assessImportRegime({ fobTotalUsd: 500, totalWeightKg: 10 });
    expect(a.code).toBe("courier");
    expect(a.courierEligible).toBe(true);
    expect(a.blockers).toHaveLength(0);
  });

  it("FOB sobre el límite → General (con motivo)", () => {
    const a = assessImportRegime({ fobTotalUsd: COURIER_MAX_FOB_USD + 1, totalWeightKg: 10 });
    expect(a.code).toBe("general");
    expect(a.blockers.some((b) => /FOB/.test(b))).toBe(true);
  });

  it("peso sobre el límite → General", () => {
    const a = assessImportRegime({ fobTotalUsd: 500, totalWeightKg: COURIER_MAX_WEIGHT_KG + 1 });
    expect(a.code).toBe("general");
    expect(a.blockers.some((b) => /[Pp]eso/.test(b))).toBe(true);
  });

  it("con intervención (ANMAT) → General aunque sea chico", () => {
    const a = assessImportRegime({ fobTotalUsd: 500, totalWeightKg: 10, interventions: ["ANMAT"] });
    expect(a.code).toBe("general");
    expect(a.blockers.some((b) => /ANMAT/.test(b))).toBe(true);
  });

  it("justo en el límite (3000 / 50kg) sigue siendo Courier", () => {
    const a = assessImportRegime({ fobTotalUsd: COURIER_MAX_FOB_USD, totalWeightKg: COURIER_MAX_WEIGHT_KG });
    expect(a.code).toBe("courier");
  });
});
