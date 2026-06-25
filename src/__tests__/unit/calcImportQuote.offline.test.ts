/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/fx/arsPerUsd", () => ({ getArsPerUsd: vi.fn().mockResolvedValue(1300) }));

import { calcImportQuote } from "@/lib/quote/calcImportQuote";

type Opts = Parameters<typeof calcImportQuote>[0];
// SIN raw.pcram → fuerza el camino offline/genérico (fallback).
async function offline(extra: Partial<Extract<Opts, { mode: "quote" }>>) {
  return calcImportQuote({
    mode: "quote",
    product: { title: "Taladro", fobUsd: 60, quantity: 10, origin: "China", ncm: "8467.21.00" } as any,
    rawUserText: "10 taladros USD 60 China",
    ...extra,
  } as Opts);
}
const line = (b: any, re: RegExp) => (b.taxLines as any[]).find((l) => re.test(l.label));

describe("calcImportQuote — camino offline (sin PCRAM) también es correcto", () => {
  it("bien de capital → IVA 10,5% también en offline", async () => {
    const r = await offline({ destino: "uso_propio", bienDeCapital: true });
    expect(r.breakdown!.ivaRatePct).toBeCloseTo(10.5, 1);
  });

  it("uso propio → sin percepciones en offline", async () => {
    const r = await offline({ destino: "uso_propio", perfilImportador: "responsable_inscripto" });
    const b = r.breakdown!;
    expect(b.ivaAdicionalMinUsd).toBe(0);
    expect(b.gananciasMinUsd).toBe(0);
    expect(b.iibbMinUsd).toBe(0);
  });

  it("reventa → percepciones aplicadas en offline", async () => {
    const r = await offline({ destino: "reventa", perfilImportador: "monotributo", iibbPct: 3 });
    expect(r.breakdown!.gananciasMinUsd).toBeGreaterThan(0);
  });

  it("exento TE → 0% también en offline", async () => {
    const r = await offline({ exentoTasaEstadistica: true });
    expect(r.breakdown!.teRatePct).toBe(0);
  });

  it("IVA = (CIF + TE + Derechos) × tasa también en offline", async () => {
    const r = await offline({ destino: "uso_propio" });
    const b = r.breakdown!;
    const cif = b.cifPlusInsuranceMinUsd;
    const te = line(b, /Estad[ií]stica/)?.amountUsd ?? 0;
    const der = line(b, /Derechos/)?.amountUsd ?? 0;
    const iva = line(b, /^IVA$/)?.amountUsd ?? 0;
    expect(iva).toBeCloseTo((cif + te + der) * 0.21, 0);
  });

  it("dieSource es official_offline o generic_default (no pcram_live) sin PCRAM", async () => {
    const r = await offline({ destino: "uso_propio" });
    expect(["official_offline", "generic_default"]).toContain(r.breakdown!.dieSource);
  });
});

describe("calcImportQuote — modo budget (presupuesto por monto)", () => {
  it("devuelve tarjetas y explicación coherentes", async () => {
    const r = await calcImportQuote({ mode: "budget", budgetText: "tengo USD 5000 para importar" });
    expect(r.cards.length).toBeGreaterThanOrEqual(4);
    expect(typeof r.explanation).toBe("string");
    expect(r.explanation.length).toBeGreaterThan(10);
  });
});
