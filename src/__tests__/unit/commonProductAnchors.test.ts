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

/**
 * Regresión de VEHÍCULOS (cap. 87). El motor devolvía candidatos de otro
 * capítulo para vehículos (caucho 4009 cap.40, chapa 7210 cap.72). Estas anclas
 * + el override de capítulo garantizan que un vehículo SIEMPRE caiga en cap. 87.
 * Bloqueamos también los falsos positivos que casi rompen (autoelevador → 8427).
 */
describe("commonProductAnchors — vehículos y falsos positivos peligrosos", () => {
  const chapter = (t: string) => matchProductAnchor(t)?.ncm.replace(/\D/g, "").slice(0, 2) ?? null;
  const heading = (t: string) => matchProductAnchor(t)?.ncm.replace(/\D/g, "").slice(0, 4) ?? null;

  it("clasifica cada tipo de vehículo en su partida de cap. 87", () => {
    expect(heading("un auto nuevo Toyota nafta")).toBe("8703"); // automóvil de turismo
    expect(heading("autos sedán para pasajeros")).toBe("8703");
    expect(heading("SUV Volkswagen 4x4")).toBe("8703");
    expect(heading("camioneta pick-up Toyota Tacoma")).toBe("8704"); // transporte de mercancías
    expect(heading("pickup Ford Ranger diesel")).toBe("8704");
    expect(heading("camión Scania para carga pesada")).toBe("8704");
    expect(heading("ómnibus para transporte de pasajeros")).toBe("8702"); // con acento (bug real)
    expect(heading("colectivo urbano diesel")).toBe("8702");
    expect(heading("motocicleta 150cc")).toBe("8711");
    // Todos en el capítulo de vehículos, nunca caucho (40) ni acero (72):
    for (const v of ["un auto", "camioneta pickup", "camión", "ómnibus"]) {
      expect(chapter(v)).toBe("87");
    }
  });

  it("NO clasifica un autoelevador como auto (va 8427, no cap. 87)", () => {
    // Producto que E-COMEX importa de verdad: NUNCA debe caer como automóvil.
    expect(matchProductAnchor("autoelevador Toyota 2.5 toneladas")).toBeNull();
    expect(matchProductAnchor("un autoelevador eléctrico para depósito")).toBeNull();
  });

  it("NO confunde palabras que empiezan con 'auto' con un vehículo", () => {
    expect(matchProductAnchor("autopartes de caucho para vehículos")).toBeNull();
    expect(matchProductAnchor("autopista peaje")).toBeNull();
    expect(matchProductAnchor("software de autoservicio")).toBeNull();
    expect(matchProductAnchor("mi business plan")).toBeNull(); // no confundir "bus" con ómnibus
  });

  it("NO ancla repuestos/partes de vehículo al vehículo entero", () => {
    expect(matchProductAnchor("cubierta de camioneta")).toBeNull();
    expect(matchProductAnchor("repuesto de camión")).toBeNull();
  });
});
