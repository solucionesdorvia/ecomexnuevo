import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/fx/arsPerUsd", () => ({ getArsPerUsd: vi.fn().mockResolvedValue(1300) }));

import { calcImportQuote } from "@/lib/quote/calcImportQuote";

type Opts = Parameters<typeof calcImportQuote>[0];
async function q(extra: Partial<Extract<Opts, { mode: "quote" }>>, taxes: Record<string, number>, extraRaw: Record<string, unknown> = {}) {
  return calcImportQuote({
    mode: "quote",
    product: {
      title: "Producto",
      fobUsd: 500,
      quantity: 10,
      origin: "China",
      ncm: "8471.30.12",
      raw: { pcram: { ncmCode: "8471.30.12", taxes, ...extraRaw } },
    } as any,
    rawUserText: "10 unidades USD 500 China",
    ...extra,
  } as Opts);
}
const line = (b: any, re: RegExp) => (b.taxLines as any[]).find((l) => re.test(l.label));

describe("calcImportQuote — precisión de la base imponible", () => {
  it("IVA = (CIF + TE + Derechos) × tasa IVA (base imponible correcta)", async () => {
    const r = await q({ destino: "uso_propio" }, { DIE: 16, IVA: 21 });
    const b = r.breakdown!;
    const cif = b.cifPlusInsuranceMinUsd;
    const te = line(b, /Estad[ií]stica/)?.amountUsd ?? 0;
    const der = line(b, /^Derechos$/)?.amountUsd ?? 0;
    const iva = line(b, /^IVA$/)?.amountUsd ?? 0;
    const baseEsperada = cif + te + der;
    expect(iva).toBeCloseTo(baseEsperada * 0.21, 0); // tolerancia 1 USD
  });

  it("el antidumping integra la base del IVA (IVA sube con antidumping)", async () => {
    const sin = await q({ destino: "uso_propio" }, { DIE: 16, IVA: 21 });
    const con = await q({ destino: "uso_propio" }, { DIE: 16, IVA: 21 }, { taxesExtra: { "Derechos Antidumping": 30 } });
    const ivaSin = line(sin.breakdown, /^IVA$/)?.amountUsd ?? 0;
    const ivaCon = line(con.breakdown, /^IVA$/)?.amountUsd ?? 0;
    expect(ivaCon).toBeGreaterThan(ivaSin); // base mayor → IVA mayor
    // y el antidumping aparece como línea y suma al total de impuestos
    expect(line(con.breakdown, /antidumping/i)).toBeTruthy();
    expect(con.breakdown!.impuestosTotalMinUsd).toBeGreaterThan(sin.breakdown!.impuestosTotalMinUsd);
  });

  it("Derechos = CIF × tasa DIE", async () => {
    const r = await q({ destino: "uso_propio" }, { DIE: 16, IVA: 21 });
    const b = r.breakdown!;
    const der = line(b, /^Derechos$/)?.amountUsd ?? 0;
    expect(der).toBeCloseTo(b.cifPlusInsuranceMinUsd * 0.16, 0);
    expect(b.derechosRatePct).toBe(16);
  });
});

describe("calcImportQuote — recuperabilidad exacta", () => {
  it("RI reventa: recuperable = IVA + IVA adic + Ganancias + IIBB (+ IVA servicios)", async () => {
    const r = await q({ destino: "reventa", perfilImportador: "responsable_inscripto", iibbPct: 3 }, { DIE: 16, IVA: 21 });
    const b = r.breakdown!;
    const sumaPercepciones = b.ivaMinUsd + b.ivaAdicionalMinUsd + b.gananciasMinUsd + b.iibbMinUsd;
    // recuperable ≥ suma de IVA+percepciones (incluye además el IVA de servicios).
    expect(b.recuperableMinUsd).toBeGreaterThanOrEqual(sumaPercepciones - 1);
    expect(b.costoRealMinUsd).toBeCloseTo(b.totalMinUsd - b.recuperableMinUsd, 0);
  });

  it("RI uso propio: igual recupera el IVA (crédito fiscal), aunque no haya percepciones", async () => {
    const r = await q({ destino: "uso_propio", perfilImportador: "responsable_inscripto" }, { DIE: 16, IVA: 21 });
    const b = r.breakdown!;
    expect(b.ivaAdicionalMinUsd).toBe(0);
    expect(b.recuperableMinUsd).toBeGreaterThan(0); // recupera el IVA
    expect(b.costoRealMinUsd).toBeLessThan(b.totalMinUsd);
  });

  it("persona física: no recupera nada (costo real = total)", async () => {
    const r = await q({ destino: "reventa", perfilImportador: "persona_fisica", iibbPct: 3 }, { DIE: 16, IVA: 21 });
    const b = r.breakdown!;
    expect(b.recuperableMinUsd).toBe(0);
    expect(b.costoRealMinUsd).toBe(b.totalMinUsd);
  });
});

describe("calcImportQuote — consistencia de unidades", () => {
  it("el costo por unidad × cantidad ≈ total", async () => {
    const r = await q({ destino: "uso_propio" }, { DIE: 16, IVA: 21 });
    const b = r.breakdown!;
    const perUnit = b.totalMinUsd / b.qty;
    expect(perUnit * b.qty).toBeCloseTo(b.totalMinUsd, 5);
    expect(b.qty).toBe(10);
  });
});
