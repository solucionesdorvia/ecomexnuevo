type DolarApiBlue = {
  compra?: number | string;
  venta?: number | string;
  casa?: string;
  nombre?: string;
  moneda?: string;
  fechaActualizacion?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __ecomex_fx_cache:
    | {
        arsPerUsd: number;
        expiresAt: number;
      lastUpdatedAt?: number;
      source?: "dolarapi" | "env" | "fallback";
        inFlight?: Promise<number | null>;
      }
    | undefined;
}

function toNumber(v: unknown) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replaceAll(".", "").replace(",", ".").trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

async function fetchBlueVentaArsPerUsd(): Promise<number | null> {
  const res = await fetch("https://dolarapi.com/v1/dolares/blue", {
    headers: { accept: "application/json" },
    // Avoid any cached intermediaries; we handle caching ourselves.
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as DolarApiBlue | null;
  const venta = toNumber(json?.venta);
  if (!venta || venta <= 0) return null;
  return venta;
}

/**
 * ARS per USD used for evaluating ARS thresholds (e.g., PCRAM Impuestos Internos).
 * Priority:
 * - dolarapi blue "venta" (cached)
 * - env FX_ARS_PER_USD (fallback)
 */
export async function getArsPerUsd(opts?: { ttlMs?: number }): Promise<number> {
  const ttlMs = typeof opts?.ttlMs === "number" && opts.ttlMs > 0 ? opts.ttlMs : 10 * 60 * 1000;
  const now = Date.now();

  const cache = (globalThis.__ecomex_fx_cache ??= {
    arsPerUsd: 0,
    expiresAt: 0,
  });

  if (cache.arsPerUsd > 0 && cache.expiresAt > now) {
    // Backfill metadata for older cache objects.
    if (!cache.source) {
      const envFx = Number(process.env.FX_ARS_PER_USD ?? "0");
      cache.source =
        Number.isFinite(envFx) && envFx > 0 && Math.abs(envFx - cache.arsPerUsd) < 0.0001
          ? "env"
          : "dolarapi";
    }
    if (!cache.lastUpdatedAt) cache.lastUpdatedAt = now;
    return cache.arsPerUsd;
  }

  cache.inFlight ??= (async () => {
    const live = await fetchBlueVentaArsPerUsd().catch(() => null);
    return live;
  })();

  const live = await cache.inFlight.catch(() => null);
  cache.inFlight = undefined;

  if (typeof live === "number" && Number.isFinite(live) && live > 0) {
    cache.arsPerUsd = live;
    cache.expiresAt = now + ttlMs;
    cache.lastUpdatedAt = now;
    cache.source = "dolarapi";
    return live;
  }

  const envFx = Number(process.env.FX_ARS_PER_USD ?? "0");
  if (Number.isFinite(envFx) && envFx > 0) {
    cache.arsPerUsd = envFx;
    cache.expiresAt = now + ttlMs;
    cache.lastUpdatedAt = now;
    cache.source = "env";
    return envFx;
  }

  // Last-resort fallback to avoid breaking calculations.
  cache.arsPerUsd = 1000;
  cache.expiresAt = now + ttlMs;
  cache.lastUpdatedAt = now;
  cache.source = "fallback";
  return 1000;
}

export function getArsPerUsdCacheSnapshot() {
  const c = globalThis.__ecomex_fx_cache;
  if (!c) return null;
  return {
    arsPerUsd: c.arsPerUsd,
    expiresAt: c.expiresAt,
    lastUpdatedAt: c.lastUpdatedAt ?? null,
    source: c.source ?? null,
  };
}

