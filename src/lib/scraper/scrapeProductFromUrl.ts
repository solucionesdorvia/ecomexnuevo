type ScrapedProduct = {
  title?: string;
  displayTitle?: string;
  description?: string;
  origin?: string;
  category?: string;
  displayCategory?: string;
  ncm?: string;
  fobUsd?: number;
  currency?: string;
  price?: {
    type: "single" | "range" | "unknown";
    min: number | null;
    max: number | null;
    currency: string;
    unit: string;
  };
  supplier?: string;
  url?: string;
  images?: string[];
  raw?: Record<string, unknown>;
};

function domainFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

function titleFromUrl(url: string) {
  try {
    const u = new URL(url);
    const last = decodeURIComponent(u.pathname || "/")
      .split("/")
      .filter(Boolean)
      .slice(-1)[0];
    const base = String(last || "")
      .replace(/\.(html?|php)$/i, "")
      .replace(/\d{8,}/g, " ")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (base.length >= 8) return base.slice(0, 120);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "Producto";
  }
}

function withTimeout<T>(p: Promise<T>, timeoutMs: number): Promise<T> {
  const ms = Math.max(1000, Math.floor(timeoutMs));
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

export async function scrapeProductFromUrl(
  url: string,
  opts?: { hintText?: string; timeoutMs?: number }
): Promise<ScrapedProduct> {
  // IMPORTANT:
  // - Prefer real scraping by default (unauthenticated HTML + Playwright fallback).
  // - Set SCRAPER_STUB=true to force stub mode (useful for offline dev).
  const host = domainFromUrl(url);

  const stub = (process.env.SCRAPER_STUB ?? "false").toLowerCase() === "true";
  if (stub) {
    return {
      title: `Producto desde ${host}`,
      origin: "China (estimado)",
      category: "A clasificar",
      supplier: host,
      url,
      raw: { stub: true },
    };
  }

  const { productFromUrlPipeline } = await import(
    "@/lib/scraper/productFromUrlPipeline"
  );

  const timeoutMs =
    typeof opts?.timeoutMs === "number" && Number.isFinite(opts.timeoutMs)
      ? Math.max(3000, Math.min(45_000, opts.timeoutMs))
      : 18_000;

  const scraped = await withTimeout(
    productFromUrlPipeline(url, { hintText: opts?.hintText }),
    timeoutMs
  ).catch(() => null);

  if (!scraped) {
    return {
      title: titleFromUrl(url),
      displayTitle: titleFromUrl(url),
      category: "A clasificar",
      supplier: host,
      url,
      raw: { scrapeFailed: true },
    };
  }
  return {
    ...scraped,
    supplier: host,
    url,
    raw: { ...(scraped.raw ?? {}), supplierHost: host },
  };
}

