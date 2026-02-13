type ScrapedProduct = {
  title?: string;
  description?: string;
  origin?: string;
  category?: string;
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

export async function scrapeProductFromUrl(
  url: string,
  opts?: { hintText?: string }
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

  const scraped = await productFromUrlPipeline(url, { hintText: opts?.hintText });
  return {
    ...scraped,
    supplier: host,
    url,
    raw: { ...(scraped.raw ?? {}), supplierHost: host },
  };
}

