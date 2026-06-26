/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/fx/arsPerUsd", () => ({ getArsPerUsd: vi.fn().mockResolvedValue(1300) }));

import { calcImportQuote } from "@/lib/quote/calcImportQuote";
type Opts = Parameters<typeof calcImportQuote>[0];

describe("calcImportQuote — el número no debe engañar (confiabilidad del arancel)", () => {
  it("sin NCM ni PCRAM: avisa fuerte, marca arancel NO confiable y baja la calidad", async () => {
    const r = await calcImportQuote({
      mode: "quote",
      product: { title: "cosa rara sin pista clara", fobUsd: 5000, quantity: 1, origin: "China" } as any,
      rawUserText: "una cosa rara, USD 5000",
      destino: "reventa",
    } as Opts);
    expect(r.breakdown!.dieSource).toBe("generic_default");
    expect(r.breakdown!.arancelConfiable).toBe(false);
    expect(r.warnings && r.warnings.length).toBeGreaterThan(0);
    // El aviso tiene que hablar de no haber podido clasificar.
    expect(r.warnings!.join(" ")).toMatch(/posici[oó]n arancelaria|NCM|estimaci[oó]n/i);
    // Nunca proyectar alta confianza sobre una estimación.
    expect(r.quality!).toBeLessThanOrEqual(30);
  });

  it("con NCM + PCRAM: arancel confiable, sin avisos de clasificación", async () => {
    const r = await calcImportQuote({
      mode: "quote",
      product: {
        title: "Auriculares bluetooth",
        fobUsd: 100,
        quantity: 1,
        origin: "China",
        ncm: "8518.30.00",
        raw: { pcram: { ncmCode: "8518.30.00", taxes: { DIE: 16, IVA: 21 } } },
      } as any,
      rawUserText: "1 auricular USD 100",
      destino: "reventa",
    } as Opts);
    expect(r.breakdown!.dieSource).toBe("pcram_live");
    expect(r.breakdown!.arancelConfiable).toBe(true);
    expect(r.warnings ?? []).toEqual([]);
  });
});
