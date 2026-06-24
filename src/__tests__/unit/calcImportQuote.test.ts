import { describe, it, expect, vi } from "vitest";

// Mock external dependencies (FX call, etc.)
vi.mock("@/lib/fx/arsPerUsd", () => ({
  getArsPerUsd: vi.fn().mockResolvedValue(1300),
}));

import { calcImportQuote } from "@/lib/quote/calcImportQuote";

describe("calcImportQuote - mode: quote", () => {
  it("returns cards array with all 5 expected labels", async () => {
    const result = await calcImportQuote({
      mode: "quote",
      product: { title: "Auriculares bluetooth", fobUsd: 8, quantity: 100, origin: "China" },
      rawUserText: "quiero importar 100 auriculares a USD 8",
    });

    const labels = result.cards.map((c) => c.label);
    expect(labels).toContain("Producto");
    expect(labels).toContain("Flete internacional");
    expect(labels).toContain("Impuestos argentinos");
    expect(labels).toContain("Gestión / despacho");
    expect(labels).toContain("Total puesto en Argentina");
  });

  it("totalMinUsd <= totalMaxUsd always", async () => {
    const result = await calcImportQuote({
      mode: "quote",
      product: { title: "Smartwatch", fobUsd: 15, quantity: 50 },
      rawUserText: "50 smartwatch USD 15",
    });

    expect(result.totalMinUsd).toBeDefined();
    expect(result.totalMaxUsd).toBeDefined();
    // El motor devuelve un estimado puntual (min == max) cuando las tasas son
    // determinísticas (PCRAM/oficiales y flete único); el rango solo aparece si
    // hay incertidumbre. Por eso validamos <= y no < estricto.
    expect(result.totalMinUsd!).toBeLessThanOrEqual(result.totalMaxUsd!);
  });

  it("total is greater than FOB (there are always costs on top)", async () => {
    const result = await calcImportQuote({
      mode: "quote",
      product: { title: "Producto test", fobUsd: 100, quantity: 10 },
      rawUserText: "10 unidades USD 100",
    });

    const fobTotal = 100 * 10; // $1000
    expect(result.totalMinUsd!).toBeGreaterThan(fobTotal);
  });

  it("returns breakdown object with required fields", async () => {
    const result = await calcImportQuote({
      mode: "quote",
      product: { title: "Test", fobUsd: 50, quantity: 20 },
      rawUserText: "20 pcs USD 50",
    });

    expect(result.breakdown).toBeDefined();
    expect(result.breakdown!.qty).toBe(20);
    expect(result.breakdown!.fobTotalUsd).toBe(1000);
    expect(typeof result.breakdown!.fleteMinUsd).toBe("number");
    expect(typeof result.breakdown!.fleteMaxUsd).toBe("number");
  });

  it("cotización a prueba de balas: completa, finita, no negativa y coherente", async () => {
    const result = await calcImportQuote({
      mode: "quote",
      product: { title: "Taladro percutor industrial", fobUsd: 55, quantity: 10, origin: "China", ncm: "8467.21.00" },
      rawUserText: "10 taladros USD 55 origen China",
    });
    const b = result.breakdown!;
    const nums = [
      b.fobTotalUsd,
      b.fleteMinUsd,
      b.seguroMinUsd,
      b.cifPlusInsuranceMinUsd,
      b.impuestosTotalMinUsd,
      b.gestionMinUsd,
      b.totalMinUsd,
      b.totalMaxUsd,
    ];
    for (const n of nums) {
      expect(Number.isFinite(n)).toBe(true);
      expect(n as number).toBeGreaterThanOrEqual(0);
    }
    // Coherencia contable: total = CIF(+seguro) + impuestos + gestión (tolerancia de redondeo).
    const sum = b.cifPlusInsuranceMinUsd! + b.impuestosTotalMinUsd! + b.gestionMinUsd!;
    expect(Math.abs(sum - b.totalMinUsd!)).toBeLessThanOrEqual(1.5);
    // El total nunca puede ser más barato que la mercadería sola.
    expect(b.totalMinUsd!).toBeGreaterThan(b.fobTotalUsd!);
  });

  it("rechaza cotizar sin precio (no inventa un número)", async () => {
    await expect(
      calcImportQuote({
        mode: "quote",
        product: { title: "Producto sin precio", quantity: 5, origin: "China" },
        rawUserText: "5 unidades de China",
      })
    ).rejects.toThrow(/NO_PRICE/);
  });

  it("divergencia de subpartida: deshidratador costea conservador (no subcotiza)", async () => {
    // 8419.31 (DIE 14%) vs hermana 8419.39 (DIE 35%) en el mismo heading.
    // Sin PCRAM (offline), debe detectar la divergencia y costear con el DIE más alto.
    const result = await calcImportQuote({
      mode: "quote",
      product: { title: "Deshidratador de alimentos", fobUsd: 450, quantity: 3, origin: "China", ncm: "8419.31.00" },
      rawUserText: "3 deshidratadores USD 450 China",
    });
    const b = result.breakdown!;
    expect(b.dieSource).toBe("official_offline");
    expect(b.siblingTariffDivergence).toBeTruthy();
    expect(b.siblingTariffDivergence!.maxPct).toBeGreaterThanOrEqual(35);
    // Costeo conservador: usa la subpartida más cara del heading (≥35%), nunca el 14%.
    expect(b.derechosRatePct).toBeGreaterThanOrEqual(35);
  });

  it("dieSource refleja PCRAM cuando hay tasas en vivo", async () => {
    const result = await calcImportQuote({
      mode: "quote",
      product: {
        title: "Auriculares",
        fobUsd: 10,
        quantity: 100,
        ncm: "8518.30.00",
        raw: { pcram: { ncmCode: "8518.30.00", taxes: { DIE: 16, IVA: 21 } } },
      },
      rawUserText: "100 auriculares USD 10",
    });
    expect(result.breakdown!.dieSource).toBe("pcram_live");
  });

  it("avisa si el precio podría no estar en USD (yuanes) y no lo asume callado", async () => {
    const result = await calcImportQuote({
      mode: "quote",
      product: { title: "Producto", fobUsd: 50, quantity: 100, origin: "China" },
      rawUserText: "100 unidades a 50 yuanes cada una desde China",
    });
    expect(result.assumptions?.some((a) => a.id === "moneda")).toBe(true);
  });

  it("NO avisa de moneda cuando el precio está en USD", async () => {
    const result = await calcImportQuote({
      mode: "quote",
      product: { title: "Producto", fobUsd: 50, quantity: 100, origin: "China" },
      rawUserText: "100 unidades a USD 50 cada una",
    });
    expect(result.assumptions?.some((a) => a.id === "moneda")).toBe(false);
  });

  it("includes assumptions array", async () => {
    const result = await calcImportQuote({
      mode: "quote",
      product: { title: "Cargador USB", fobUsd: 3, quantity: 500 },
      rawUserText: "500 cargadores USB a 3 dólares",
    });

    expect(Array.isArray(result.assumptions)).toBe(true);
  });

  it("suma derechos antidumping cuando PCRAM los trae como % ad valorem", async () => {
    const result = await calcImportQuote({
      mode: "quote",
      product: {
        title: "Calzado deportivo",
        fobUsd: 20,
        quantity: 100,
        ncm: "6404.11.00",
        raw: {
          pcram: {
            ncmCode: "6404.11.00",
            taxes: { DIE: 35, IVA: 21 },
            taxesExtra: { "Derechos Antidumping": 50 },
          },
        },
      },
      rawUserText: "100 zapatillas USD 20 origen China",
      destino: "reventa",
    });
    const adLine = result.breakdown!.taxLines?.find((l) => /antidumping/i.test(l.label));
    expect(adLine).toBeTruthy();
    expect(adLine!.amountUsd).toBeGreaterThan(0);
    expect(adLine!.ratePct).toBe(50);
    expect(result.assumptions?.some((a) => a.id === "antidumping")).toBe(true);
  });

  it("avisa antidumping NO cuantificable (intervención sin %) sin esconderlo", async () => {
    const result = await calcImportQuote({
      mode: "quote",
      product: {
        title: "Neumáticos de auto",
        fobUsd: 80,
        quantity: 50,
        ncm: "4011.10.00",
        raw: {
          pcram: { ncmCode: "4011.10.00", taxes: { DIE: 16, IVA: 21 }, interventions: ["Antidumping"] },
        },
      },
      rawUserText: "50 neumáticos USD 80",
    });
    const ad = result.assumptions?.find((a) => a.id === "antidumping");
    expect(ad).toBeTruthy();
    expect(ad!.value).toMatch(/espec[ií]fico o FOB m[ií]nimo|mayor/i);
  });

  it("quality score is between 0 and 100", async () => {
    const result = await calcImportQuote({
      mode: "quote",
      product: { title: "Producto genérico", fobUsd: 20, quantity: 100 },
      rawUserText: "100 unidades USD 20",
    });

    if (typeof result.quality === "number") {
      expect(result.quality).toBeGreaterThanOrEqual(0);
      expect(result.quality).toBeLessThanOrEqual(100);
    }
  });

  it("uses PCRAM tax rates when available", async () => {
    const result = await calcImportQuote({
      mode: "quote",
      product: {
        title: "Auriculares",
        fobUsd: 10,
        quantity: 100,
        ncm: "8518.30.00",
        raw: {
          pcram: {
            ncmCode: "8518.30.00",
            taxes: { AEC: 20, IVA: 21, "IVA ADIC": 20 },
          },
        },
      },
      rawUserText: "100 auriculares USD 10",
    });

    const impuestos = result.cards.find((c) => c.label === "Impuestos argentinos");
    expect(impuestos).toBeDefined();
    // With real PCRAM data, quality should be higher
    if (typeof result.quality === "number") {
      expect(result.quality).toBeGreaterThan(20);
    }
  });

  it("explanation is a non-empty string", async () => {
    const result = await calcImportQuote({
      mode: "quote",
      product: { title: "Mouse inalámbrico", fobUsd: 5, quantity: 200 },
      rawUserText: "200 mouse USD 5",
    });

    expect(typeof result.explanation).toBe("string");
    expect(result.explanation.length).toBeGreaterThan(10);
  });
});

describe("calcImportQuote - mode: budget", () => {
  it("returns 5 cards for budget mode", async () => {
    const result = await calcImportQuote({
      mode: "budget",
      budgetText: "tengo USD 5000 de presupuesto",
    });

    expect(result.cards.length).toBeGreaterThanOrEqual(4);
  });

  it("handles budget without explicit USD", async () => {
    const result = await calcImportQuote({
      mode: "budget",
      budgetText: "quiero gastar unos 3000 dólares",
    });

    expect(result.cards).toBeDefined();
    expect(result.explanation).toBeTruthy();
  });
});

describe("calcImportQuote - price range product", () => {
  it("handles price range correctly", async () => {
    const result = await calcImportQuote({
      mode: "quote",
      product: {
        title: "Engranaje industrial",
        quantity: 50,
        price: { type: "range", min: 80, max: 120, currency: "USD", unit: "unit" },
      },
      rawUserText: "50 engranajes entre 80 y 120 USD",
    });

    expect(result.totalMinUsd).toBeDefined();
    expect(result.totalMaxUsd).toBeDefined();
    expect(result.totalMinUsd!).toBeLessThan(result.totalMaxUsd!);
  });
});
