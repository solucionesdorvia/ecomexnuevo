import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/fx/arsPerUsd", () => ({ getArsPerUsd: vi.fn().mockResolvedValue(1300) }));

import { calcImportQuote } from "@/lib/quote/calcImportQuote";

// Producto con tasas PCRAM en vivo → impuestos determinísticos para aserciones exactas.
const pcramProduct = {
  title: "Notebook",
  fobUsd: 800,
  quantity: 10,
  origin: "China",
  ncm: "8471.30.12",
  raw: { pcram: { ncmCode: "8471.30.12", taxes: { DIE: 16, IVA: 21 } } },
};

type Opts = Parameters<typeof calcImportQuote>[0];
async function quote(extra: Partial<Extract<Opts, { mode: "quote" }>>) {
  return calcImportQuote({
    mode: "quote",
    product: pcramProduct as any,
    rawUserText: "10 notebooks USD 800 China",
    ...extra,
  } as Opts);
}

function assertSane(b: NonNullable<Awaited<ReturnType<typeof calcImportQuote>>["breakdown"]>) {
  const nums = [
    b.fobTotalUsd, b.fleteMinUsd, b.seguroMinUsd, b.cifPlusInsuranceMinUsd,
    b.impuestosTotalMinUsd, b.gestionMinUsd, b.totalMinUsd, b.totalMaxUsd,
    b.recuperableMinUsd, b.costoRealMinUsd,
  ];
  for (const n of nums) {
    expect(Number.isFinite(n)).toBe(true);
    expect(n as number).toBeGreaterThanOrEqual(0);
  }
  // Coherencia contable: total = CIF(+seguro) + impuestos + gestión (tolerancia de redondeo).
  const sum = b.cifPlusInsuranceMinUsd + b.impuestosTotalMinUsd + b.gestionMinUsd;
  expect(Math.abs(sum - b.totalMinUsd)).toBeLessThanOrEqual(2);
  // El total siempre supera la mercadería sola.
  expect(b.totalMinUsd).toBeGreaterThan(b.fobTotalUsd);
  // min ≤ max en todo.
  expect(b.totalMinUsd).toBeLessThanOrEqual(b.totalMaxUsd);
}

describe("calcImportQuote — matriz fiscal (perfil × destino × bien de capital)", () => {
  it("RESPONSABLE INSCRIPTO + reventa: aplica percepciones y RECUPERA", async () => {
    const r = await quote({ destino: "reventa", perfilImportador: "responsable_inscripto", iibbPct: 3 });
    const b = r.breakdown!;
    assertSane(b);
    expect(b.esReventa).toBe(true);
    expect(b.esResponsableInscripto).toBe(true);
    expect(b.gananciasMinUsd).toBeGreaterThan(0);
    expect(b.iibbMinUsd).toBeGreaterThan(0);
    expect(b.ivaAdicionalMinUsd).toBeGreaterThan(0);
    expect(b.recuperableMinUsd).toBeGreaterThan(0);
    expect(b.costoRealMinUsd).toBeLessThan(b.totalMinUsd); // recupera → costo real menor
  });

  it("MONOTRIBUTO + reventa: aplica percepciones pero NO recupera", async () => {
    const r = await quote({ destino: "reventa", perfilImportador: "monotributo", iibbPct: 3 });
    const b = r.breakdown!;
    assertSane(b);
    expect(b.gananciasMinUsd).toBeGreaterThan(0);
    expect(b.recuperableMinUsd).toBe(0);
    expect(b.costoRealMinUsd).toBe(b.totalMinUsd); // no recupera → costo real = total
  });

  it("USO PROPIO: sin percepciones (IVA adic, Ganancias, IIBB = 0)", async () => {
    const r = await quote({ destino: "uso_propio", perfilImportador: "responsable_inscripto", iibbPct: 3 });
    const b = r.breakdown!;
    assertSane(b);
    expect(b.esReventa).toBe(false);
    expect(b.ivaAdicionalMinUsd).toBe(0);
    expect(b.gananciasMinUsd).toBe(0);
    expect(b.iibbMinUsd).toBe(0);
    // Uso propio cuesta menos que reventa (sin percepciones).
    const reventa = await quote({ destino: "reventa", perfilImportador: "responsable_inscripto", iibbPct: 3 });
    expect(b.totalMinUsd).toBeLessThan(reventa.breakdown!.totalMinUsd);
  });

  it("BIEN DE CAPITAL: IVA 10,5% en vez de 21%", async () => {
    const r = await quote({ destino: "uso_propio", bienDeCapital: true });
    expect(r.breakdown!.ivaRatePct).toBeCloseTo(10.5, 1);
    const normal = await quote({ destino: "uso_propio", bienDeCapital: false });
    expect(normal.breakdown!.ivaRatePct).toBeCloseTo(21, 1);
  });

  it("EXENTO TE: tasa estadística 0%", async () => {
    const r = await quote({ exentoTasaEstadistica: true });
    expect(r.breakdown!.teRatePct).toBe(0);
  });

  it("coherencia contable en las 4 combinaciones de perfil/destino", async () => {
    for (const destino of ["reventa", "uso_propio"] as const) {
      for (const perfil of ["responsable_inscripto", "monotributo"] as const) {
        const r = await quote({ destino, perfilImportador: perfil, iibbPct: 3 });
        assertSane(r.breakdown!);
      }
    }
  });
});

describe("calcImportQuote — edge cases que no deben romper", () => {
  it("cantidad enorme (50.000 u) sigue finito y coherente", async () => {
    const r = await calcImportQuote({
      mode: "quote",
      product: { title: "Tornillo", fobUsd: 0.05, quantity: 50000, origin: "China", ncm: "7318.15.00" } as any,
      rawUserText: "50000 tornillos",
    });
    assertSane(r.breakdown!);
  });

  it("FOB muy chico (USD 0,10) no genera total negativo ni cero", async () => {
    const r = await calcImportQuote({
      mode: "quote",
      product: { title: "Sticker", fobUsd: 0.1, quantity: 100, origin: "China" } as any,
      rawUserText: "100 stickers USD 0.10",
    });
    expect(r.breakdown!.totalMinUsd).toBeGreaterThan(0);
    assertSane(r.breakdown!);
  });

  it("rango de precio: min < max y coherente", async () => {
    const r = await calcImportQuote({
      mode: "quote",
      product: { title: "Engranaje", quantity: 50, price: { type: "range", min: 80, max: 120, currency: "USD", unit: "unit" } } as any,
      rawUserText: "50 engranajes entre 80 y 120",
    });
    expect(r.breakdown!.totalMinUsd).toBeLessThan(r.breakdown!.totalMaxUsd);
    assertSane(r.breakdown!);
  });

  it("sin NCM (arancel genérico) sigue dando un número coherente", async () => {
    const r = await calcImportQuote({
      mode: "quote",
      product: { title: "Producto genérico", fobUsd: 100, quantity: 20, origin: "China" } as any,
      rawUserText: "20 unidades USD 100",
    });
    expect(r.breakdown!.dieSource).toBeDefined();
    assertSane(r.breakdown!);
  });

  it("distintos orígenes (China/USA/Europa) producen flete válido", async () => {
    for (const origin of ["China", "Estados Unidos", "Italia", "Brasil"]) {
      const r = await calcImportQuote({
        mode: "quote",
        product: { title: "Máquina", fobUsd: 5000, quantity: 1, origin, ncm: "8479.89.00" } as any,
        rawUserText: `1 máquina USD 5000 ${origin}`,
      });
      expect(Number.isFinite(r.breakdown!.fleteMinUsd)).toBe(true);
      expect(r.breakdown!.fleteMinUsd).toBeGreaterThan(0);
    }
  });

  it("auto (RORO) cotiza completo y coherente", async () => {
    const r = await calcImportQuote({
      mode: "quote",
      product: { title: "Automóvil sedán", fobUsd: 18000, quantity: 1, origin: "Alemania", ncm: "8703.23.10" } as any,
      rawUserText: "1 auto USD 18000 Alemania",
    });
    assertSane(r.breakdown!);
  });
});
