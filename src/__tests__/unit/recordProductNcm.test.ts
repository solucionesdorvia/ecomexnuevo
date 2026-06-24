import { describe, it, expect, vi, beforeEach } from "vitest";

type Row = Record<string, unknown>;
const { store } = vi.hoisted(() => ({ store: new Map<string, Row>() }));

// Prisma en memoria (Map) para verificar la lógica de recordProductNcm sin DB real.
vi.mock("@/lib/db", () => ({
  prisma: {
    productNcm: {
      findUnique: async ({ where }: { where: { key: string } }) => store.get(where.key) ?? null,
      update: async ({ where, data }: { where: { key: string }; data: Record<string, unknown> }) => {
        const cur = store.get(where.key) ?? {};
        const next: Row = { ...cur };
        for (const [k, v] of Object.entries(data)) {
          if (k === "timesUsed" && v && typeof v === "object" && "increment" in (v as object)) {
            next.timesUsed = ((cur.timesUsed as number) ?? 0) + (v as { increment: number }).increment;
          } else {
            next[k] = v;
          }
        }
        store.set(where.key, next);
        return next;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        store.set(data.key as string, { ...data });
        return data;
      },
    },
  },
}));

import { recordProductNcm, normalizeProductKey } from "@/lib/ncm/productCatalog";

describe("recordProductNcm - verified (Fase 2.1)", () => {
  beforeEach(() => store.clear());

  it("crea una entrada verificada nueva (confianza 1, source manual)", async () => {
    await recordProductNcm({ name: "Deshidratador X", ncm: "8419.39.00", verified: true });
    const row = store.get(normalizeProductKey("Deshidratador X"))!;
    expect(row.verified).toBe(true);
    expect(row.ncm).toBe("8419.39.00");
    expect(row.source).toBe("manual");
  });

  it("una confirmación humana pisa una clasificación de IA previa", async () => {
    const key = normalizeProductKey("Producto Y");
    store.set(key, { key, ncm: "1111.11.11", verified: false, timesUsed: 1 });
    await recordProductNcm({ name: "Producto Y", ncm: "8517.12.00", verified: true });
    const row = store.get(key)!;
    expect(row.ncm).toBe("8517.12.00");
    expect(row.verified).toBe(true);
    expect(row.timesUsed).toBe(2);
  });

  it("una clasificación de IA NO pisa una entrada ya verificada (solo cuenta uso)", async () => {
    const key = normalizeProductKey("Producto Z");
    store.set(key, { key, ncm: "8419.39.00", verified: true, timesUsed: 3 });
    await recordProductNcm({ name: "Producto Z", ncm: "2222.22.22" }); // sin verified = IA
    const row = store.get(key)!;
    expect(row.ncm).toBe("8419.39.00"); // intacto
    expect(row.verified).toBe(true);
    expect(row.timesUsed).toBe(4);
  });

  it("no guarda clasificaciones sin resolver (9999.99.99)", async () => {
    await recordProductNcm({ name: "Cosa rara", ncm: "9999.99.99", verified: true });
    expect(store.get(normalizeProductKey("Cosa rara"))).toBeUndefined();
  });
});
