/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/fx/arsPerUsd", () => ({ getArsPerUsd: vi.fn().mockResolvedValue(1300) }));

import { calcImportQuote } from "@/lib/quote/calcImportQuote";

type Opts = Parameters<typeof calcImportQuote>[0];
const line = (b: any, re: RegExp) => (b.taxLines as any[]).find((l) => re.test(l.label));

describe("calcImportQuote — IVA adicional según uso/perfil", () => {
  it("reventa general → IVA adicional 20%", async () => {
    const r = await calcImportQuote({
      mode: "quote",
      product: { title: "Auriculares", fobUsd: 10, quantity: 200, origin: "China", ncm: "8518.30.00", raw: { pcram: { ncmCode: "8518.30.00", taxes: { DIE: 16, IVA: 21 } } } } as any,
      rawUserText: "200 auriculares", destino: "reventa", perfilImportador: "monotributo", iibbPct: 3,
    } as Opts);
    expect(r.breakdown!.ivaAdicRatePct).toBe(20);
  });

  it("bien de capital reventa → IVA adicional 10% (acompaña al IVA reducido)", async () => {
    const r = await calcImportQuote({
      mode: "quote",
      product: { title: "Torno CNC", fobUsd: 8000, quantity: 1, origin: "China", ncm: "8458.11.00", raw: { pcram: { ncmCode: "8458.11.00", taxes: { DIE: 14, IVA: 21 } } } } as any,
      rawUserText: "1 torno CNC", destino: "reventa", perfilImportador: "responsable_inscripto", bienDeCapital: true, iibbPct: 3,
    } as Opts);
    expect(r.breakdown!.ivaRatePct).toBeCloseTo(10.5, 1);
    expect(r.breakdown!.ivaAdicRatePct).toBe(10);
  });

  it("uso propio → IVA adicional 0%", async () => {
    const r = await calcImportQuote({
      mode: "quote",
      product: { title: "Notebook", fobUsd: 800, quantity: 2, origin: "China", ncm: "8471.30.12", raw: { pcram: { ncmCode: "8471.30.12", taxes: { DIE: 16, IVA: 21 } } } } as any,
      rawUserText: "2 notebooks", destino: "uso_propio",
    } as Opts);
    expect(r.breakdown!.ivaAdicRatePct).toBe(0);
    expect(r.breakdown!.ivaAdicionalMinUsd).toBe(0);
  });
});

describe("calcImportQuote — DIE desde AEC cuando PCRAM no trae DIE", () => {
  it("usa AEC como derecho si falta DIE", async () => {
    const r = await calcImportQuote({
      mode: "quote",
      product: { title: "Producto", fobUsd: 100, quantity: 10, origin: "China", ncm: "8538.90.90", raw: { pcram: { ncmCode: "8538.90.90", taxes: { AEC: 18, IVA: 21 } } } } as any,
      rawUserText: "10 unidades", destino: "uso_propio",
    } as Opts);
    expect(r.breakdown!.derechosRatePct).toBe(18);
    expect(line(r.breakdown, /Derechos/)?.amountUsd).toBeCloseTo(r.breakdown!.cifPlusInsuranceMinUsd * 0.18, 0);
  });
});

describe("calcImportQuote — flete marítimo por contenedor (carga voluminosa)", () => {
  it("200 sillas (~volumen alto) usa modo marítimo FCL, no aéreo", async () => {
    const r = await calcImportQuote({
      mode: "quote",
      product: { title: "Silla de oficina", fobUsd: 50, quantity: 200, origin: "China", ncm: "9401.30.00" } as any,
      rawUserText: "200 sillas de oficina USD 50 China",
    } as Opts);
    const b = r.breakdown!;
    expect(b.fleteMode?.startsWith("fcl")).toBe(true);
    expect(b.fleteMinUsd).toBeGreaterThan(0);
    expect(Number.isFinite(b.totalMinUsd)).toBe(true);
  });

  it("1 producto liviano y caro → aéreo o LCL, flete finito", async () => {
    const r = await calcImportQuote({
      mode: "quote",
      product: { title: "Reloj", fobUsd: 300, quantity: 5, origin: "China", ncm: "9102.19.00" } as any,
      rawUserText: "5 relojes USD 300 China",
    } as Opts);
    expect(Number.isFinite(r.breakdown!.fleteMinUsd)).toBe(true);
    expect(r.breakdown!.fleteMinUsd).toBeGreaterThan(0);
  });
});
