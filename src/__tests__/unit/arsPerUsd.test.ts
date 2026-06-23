import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getArsPerUsd, getArsPerUsdCacheSnapshot } from "@/lib/fx/arsPerUsd";

// El FX usa una cache global + fetch real. Reseteamos ambos entre tests.
function resetFxCache() {
  (globalThis as unknown as { __ecomex_fx_cache?: unknown }).__ecomex_fx_cache = undefined;
}

describe("getArsPerUsd - FX robusto (Fase 1.5)", () => {
  beforeEach(() => {
    resetFxCache();
    delete process.env.FX_ARS_PER_USD;
    delete process.env.FX_ADUANA_TIPO;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    resetFxCache();
  });

  it("usa la venta real de dolarapi cuando responde", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ venta: 1450 }) }))
    );
    const v = await getArsPerUsd();
    expect(v).toBe(1450);
    expect(getArsPerUsdCacheSnapshot()?.source).toBe("dolarapi");
  });

  it("si la cotización primaria falla, cae a la otra casa real (no al fallback fijo)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/blue")) return { ok: false } as unknown;
        if (url.includes("/oficial")) return { ok: true, json: async () => ({ venta: 1010 }) } as unknown;
        return { ok: false } as unknown;
      })
    );
    const v = await getArsPerUsd();
    expect(v).toBe(1010); // blue falló → oficial real
    expect(getArsPerUsdCacheSnapshot()?.source).toBe("dolarapi");
  });

  it("si ambas casas fallan, usa FX_ARS_PER_USD del env", async () => {
    process.env.FX_ARS_PER_USD = "1234";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false }))
    );
    const v = await getArsPerUsd();
    expect(v).toBe(1234);
    expect(getArsPerUsdCacheSnapshot()?.source).toBe("env");
  });

  it("último recurso: nunca rompe el cálculo, pero marca source=fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false }))
    );
    const v = await getArsPerUsd();
    expect(v).toBeGreaterThan(0);
    expect(getArsPerUsdCacheSnapshot()?.source).toBe("fallback");
  });
});
