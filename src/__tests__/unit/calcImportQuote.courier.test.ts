/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/fx/arsPerUsd", () => ({ getArsPerUsd: vi.fn().mockResolvedValue(1300) }));

import { calcImportQuote } from "@/lib/quote/calcImportQuote";
type Opts = Parameters<typeof calcImportQuote>[0];

const small = (raw: Record<string, unknown> = {}) => ({
  title: "Auriculares bluetooth",
  fobUsd: 100,
  quantity: 1,
  origin: "China",
  ncm: "8518.30.00",
  raw: { pcram: { ncmCode: "8518.30.00", taxes: { DIE: 16, IVA: 21 }, ...raw } },
});

describe("calcImportQuote — costeo Courier (puerta a puerta)", () => {
  it("courier: NO cobra despachante/terminal/depósito/SIM, pero SÍ flete + impuestos + honorarios", async () => {
    const r = await calcImportQuote({
      mode: "quote", product: small() as any, rawUserText: "1 auricular USD 100",
      destino: "reventa", perfilImportador: "monotributo",
    } as Opts);
    const b = r.breakdown!;
    expect(r.regime!.code).toBe("courier");
    expect(b.gastosImportacionUsd).toBe(0);
    expect(b.gastosImportacionLines.length).toBe(0);
    expect(b.arancelSimUsd).toBe(0);
    // pero sigue pagando lo que corresponde
    expect(b.fleteMinUsd).toBeGreaterThan(0);
    expect(b.impuestosTotalMinUsd).toBeGreaterThan(0);
    expect(b.honorariosMinUsd).toBeGreaterThan(0);
    // coherencia contable intacta
    const sum = b.cifPlusInsuranceMinUsd + b.impuestosTotalMinUsd + b.gestionMinUsd;
    expect(Math.abs(sum - b.totalMinUsd)).toBeLessThanOrEqual(2);
    expect(b.totalMinUsd).toBeGreaterThan(b.fobTotalUsd);
  });

  it("general (FOB alto) SÍ cobra los gastos de despacho", async () => {
    const r = await calcImportQuote({
      mode: "quote",
      product: { title: "Máquina", fobUsd: 5000, quantity: 1, origin: "China", ncm: "8479.89.00", raw: { pcram: { ncmCode: "8479.89.00", taxes: { DIE: 14, IVA: 21 } } } } as any,
      rawUserText: "1 máquina USD 5000", destino: "uso_propio",
    } as Opts);
    const b = r.breakdown!;
    expect(r.regime!.code).toBe("general"); // FOB 5000 > 3000
    expect(b.gastosImportacionUsd).toBeGreaterThan(0);
    expect(b.gastosImportacionLines.length).toBeGreaterThan(0);
  });

  it("el MISMO producto cuesta MENOS por courier que si fuera general (intervención lo fuerza)", async () => {
    const courier = await calcImportQuote({
      mode: "quote", product: small() as any, rawUserText: "1 auricular USD 100", destino: "uso_propio",
    } as Opts);
    const general = await calcImportQuote({
      mode: "quote", product: small({ interventions: ["ENACOM"] }) as any, rawUserText: "1 auricular USD 100", destino: "uso_propio",
    } as Opts);
    expect(courier.regime!.code).toBe("courier");
    expect(general.regime!.code).toBe("general"); // ENACOM bloquea courier
    // El courier no carga los ~miles de gastos de despacho → cuesta menos.
    expect(courier.breakdown!.totalMinUsd).toBeLessThan(general.breakdown!.totalMinUsd);
  });
});
