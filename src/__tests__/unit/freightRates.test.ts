import { describe, it, expect } from "vitest";
import {
  planContainers,
  calcFreightCost,
  estimateUnitDimensions,
  USABLE_M3_20,
  USABLE_M3_40,
} from "@/lib/quote/freightRates";

describe("estimateUnitDimensions — fallback por capítulo (no asumir 1 kg en cosas densas)", () => {
  it("metales (cap. 72-83) pesan más que el genérico de 1 kg", () => {
    expect(estimateUnitDimensions("7308.90.00").kg).toBeGreaterThan(1);
  });
  it("piedra/cerámica/vidrio (cap. 68-70) son densos", () => {
    expect(estimateUnitDimensions("6907.21.00").kg).toBeGreaterThanOrEqual(10);
  });
  it("caucho/neumáticos (cap. 40) no caen a 1 kg", () => {
    expect(estimateUnitDimensions("4011.10.00").kg).toBeGreaterThan(1);
  });
  it("un producto realmente desconocido mantiene el genérico", () => {
    expect(estimateUnitDimensions(undefined, "cosa rara sin pista").kg).toBe(1);
  });
  it("un auto (por título, sin NCM) pesa ~1,5 t y tiene volumen real, no 1 kg", () => {
    // Bug reportado: "Auto 0km" caía a 1 kg → flete absurdo. Debe estimarse como vehículo.
    const auto = estimateUnitDimensions(undefined, "Auto 0km");
    expect(auto.kg).toBeGreaterThanOrEqual(1000);
    expect(auto.m3).toBeGreaterThanOrEqual(8);
    expect(estimateUnitDimensions("8703.23.90").kg).toBeGreaterThanOrEqual(1000);
  });
});

describe("planContainers (FCL 20'/40'/múltiple)", () => {
  it("hasta 28 m³ → un 20'", () => {
    expect(planContainers(10)).toMatchObject({ c20: 1, c40: 0 });
    expect(planContainers(USABLE_M3_20)).toMatchObject({ c20: 1, c40: 0 });
  });
  it("28–56 m³ → un 40'", () => {
    expect(planContainers(40)).toMatchObject({ c20: 0, c40: 1 });
    expect(planContainers(USABLE_M3_40)).toMatchObject({ c20: 0, c40: 1 });
  });
  it("resto chico → 40' + 20'; resto grande → otro 40'", () => {
    expect(planContainers(70)).toMatchObject({ c40: 1, c20: 1 }); // 56 + 14
    expect(planContainers(120)).toMatchObject({ c40: 2, c20: 1 }); // 112 + 8
    expect(planContainers(56 + 40)).toMatchObject({ c40: 2, c20: 0 }); // resto 40 > 28 → otro 40'
  });
});

describe("calcFreightCost FCL — escala con el volumen (antes cobraba siempre un 20')", () => {
  it("un envío de 40 m³ usa 40' y cuesta MÁS que uno de 18 m³ (20')", () => {
    const chico = calcFreightCost("CHINA", 18 * 200, 18, "fcl20_china");
    const grande = calcFreightCost("CHINA", 40 * 200, 40, "fcl20_china");
    expect(grande.totalUsd).toBeGreaterThan(chico.totalUsd);
    expect(grande.detail).toContain("40'");
  });
  it("un envío de 70 m³ (40'+20') cuesta MÁS que uno de 40 m³ (un 40')", () => {
    const c40 = calcFreightCost("CHINA", 40 * 200, 40, "fcl20_china");
    const c70 = calcFreightCost("CHINA", 70 * 200, 70, "fcl20_china");
    expect(c70.totalUsd).toBeGreaterThan(c40.totalUsd);
  });
});

describe("calcFreightCost LCL — revenue ton (m³ vs tonelada), no tarifa plana", () => {
  it("envío chico paga el mínimo", () => {
    const r = calcFreightCost("CHINA", 200, 2, "lcl_china");
    expect(r.detail).toContain("mínimo");
  });
  it("envío grande escala por encima del mínimo", () => {
    const chico = calcFreightCost("CHINA", 200, 2, "lcl_china");
    const grande = calcFreightCost("CHINA", 14000, 14, "lcl_china");
    expect(grande.totalUsd).toBeGreaterThanOrEqual(chico.totalUsd);
  });
  it("el peso pesado manda sobre el volumen (revenue ton = max)", () => {
    // 3 m³ pero 9 toneladas → cobra por las 9 ton, no por 3 m³.
    const r = calcFreightCost("CHINA", 9000, 3, "lcl_china");
    expect(r.estimatedKg).toBe(9000);
  });
});
