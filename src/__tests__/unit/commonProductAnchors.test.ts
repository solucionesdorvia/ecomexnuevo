import { describe, it, expect } from "vitest";
import { matchProductAnchor } from "@/lib/clasificar-ncm/commonProductAnchors";

describe("commonProductAnchors — red de seguridad para productos frecuentes", () => {
  it("ancla productos comunes a su posición canónica", () => {
    expect(matchProductAnchor("teléfono celular smartphone Samsung")?.ncm).toBe("8517.13.00");
    expect(matchProductAnchor("auriculares bluetooth in-ear")?.ncm).toBe("8518.30.00");
    expect(matchProductAnchor("notebook Lenovo 15")?.ncm).toBe("8471.30.12");
    expect(matchProductAnchor("heladera no frost 350L")?.ncm).toBe("8418.10.00");
    expect(matchProductAnchor("microondas 25 litros")?.ncm).toBe("8516.50.00");
    expect(matchProductAnchor("motocicleta calle 150cc")?.ncm).toBe("8711.20.20");
  });

  it("NO ancla accesorios al producto entero (evita falsos positivos)", () => {
    expect(matchProductAnchor("funda de celular")).toBeNull();
    expect(matchProductAnchor("cargador de smartphone")).toBeNull();
    expect(matchProductAnchor("cable para auriculares")).toBeNull();
  });

  it("devuelve null para algo sin ancla conocida", () => {
    expect(matchProductAnchor("una cosa rara sin pista")).toBeNull();
    expect(matchProductAnchor("")).toBeNull();
  });
});
