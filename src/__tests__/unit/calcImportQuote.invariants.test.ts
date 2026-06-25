/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/fx/arsPerUsd", () => ({ getArsPerUsd: vi.fn().mockResolvedValue(1300) }));

import { calcImportQuote } from "@/lib/quote/calcImportQuote";

// Barrido amplio: ninguna combinación de inputs razonables debe romper las invariantes
// del motor (finito, no negativo, coherente, min≤max, total>FOB, costoReal≤total).
const FOBS = [0.2, 5, 80, 1500, 25000];
const QTYS = [1, 12, 350, 5000];
const ORIGINS = ["China", "Estados Unidos", "Alemania", "Brasil", "Vietnam"];
const NCMS = ["8471.30.12", "6404.11.00", "8703.23.10", "9503.00.99", "7323.93.00", undefined];
const DESTINOS = ["reventa", "uso_propio"] as const;
const PERFILES = ["responsable_inscripto", "monotributo", "persona_fisica"] as const;

function checkInvariants(label: string, b: any) {
  const nums: Array<[string, number]> = [
    ["fob", b.fobTotalUsd], ["flete", b.fleteMinUsd], ["seguro", b.seguroMinUsd],
    ["cif", b.cifPlusInsuranceMinUsd], ["impuestos", b.impuestosTotalMinUsd],
    ["gestion", b.gestionMinUsd], ["totalMin", b.totalMinUsd], ["totalMax", b.totalMaxUsd],
    ["recuperable", b.recuperableMinUsd], ["costoReal", b.costoRealMinUsd],
  ];
  for (const [k, n] of nums) {
    expect(Number.isFinite(n), `${label}: ${k} no finito (${n})`).toBe(true);
    expect(n >= 0, `${label}: ${k} negativo (${n})`).toBe(true);
  }
  expect(b.totalMinUsd <= b.totalMaxUsd, `${label}: min>max`).toBe(true);
  expect(b.totalMinUsd > b.fobTotalUsd, `${label}: total≤FOB`).toBe(true);
  expect(b.costoRealMinUsd <= b.totalMinUsd + 0.01, `${label}: costoReal>total`).toBe(true);
  const sum = b.cifPlusInsuranceMinUsd + b.impuestosTotalMinUsd + b.gestionMinUsd;
  expect(Math.abs(sum - b.totalMinUsd) <= 2, `${label}: incoherente (sum ${sum.toFixed(1)} vs total ${b.totalMinUsd.toFixed(1)})`).toBe(true);
}

describe("calcImportQuote — barrido de invariantes (no debe haber fallos)", () => {
  // Combinatoria controlada (muestreo determinístico, ~60 casos) para mantener el test rápido.
  const combos: Array<{ fob: number; qty: number; origin: string; ncm?: string; destino: any; perfil: any }> = [];
  let i = 0;
  for (const fob of FOBS)
    for (const qty of QTYS) {
      const origin = ORIGINS[i % ORIGINS.length];
      const ncm = NCMS[i % NCMS.length];
      const destino = DESTINOS[i % DESTINOS.length];
      const perfil = PERFILES[i % PERFILES.length];
      combos.push({ fob, qty, origin, ncm, destino, perfil });
      i++;
    }

  it(`mantiene las invariantes en ${combos.length} combinaciones`, async () => {
    for (const c of combos) {
      const r = await calcImportQuote({
        mode: "quote",
        product: { title: "Producto de prueba", fobUsd: c.fob, quantity: c.qty, origin: c.origin, ncm: c.ncm } as any,
        rawUserText: `${c.qty} unidades USD ${c.fob} ${c.origin}`,
        destino: c.destino,
        perfilImportador: c.perfil,
        iibbPct: 3,
      });
      const label = `fob=${c.fob} qty=${c.qty} ${c.origin} ncm=${c.ncm ?? "—"} ${c.destino}/${c.perfil}`;
      expect(r.breakdown, `${label}: sin breakdown`).toBeTruthy();
      checkInvariants(label, r.breakdown);
      // Calidad siempre 0..100.
      if (typeof r.quality === "number") {
        expect(r.quality).toBeGreaterThanOrEqual(0);
        expect(r.quality).toBeLessThanOrEqual(100);
      }
    }
  });
});
