import { analyzeUrl } from "@/lib/url/urlAnalyzer";
import { openaiJson } from "@/lib/ai/openaiClient";
import { classifyWithAI } from "@/lib/ai/ncmClassifier";
import { PcramClient } from "@/lib/pcram/pcramClient";
import { LocalNomenclator } from "@/lib/nomenclator/localNomenclator";
import { getArsPerUsd } from "@/lib/fx/arsPerUsd";

export type ScrapedProduct = {
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

function num(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : Number(String(v ?? ""));
  return Number.isFinite(n) ? n : undefined;
}

function normalizeNumberLike(input: string) {
  // Accept "1.500,50" or "1,500.50" or "9,800" or "15.000" (thousands)
  const s = String(input || "").trim();
  if (!s) return "";
  const cleaned = s.replace(/[^\d.,]/g, "");
  if (!cleaned) return "";

  const hasDot = cleaned.includes(".");
  const hasComma = cleaned.includes(",");

  // Both separators present: decide thousands vs decimal by last occurrence.
  if (hasDot && hasComma) {
    const lastDot = cleaned.lastIndexOf(".");
    const lastComma = cleaned.lastIndexOf(",");
    const dotIsDecimal = lastDot > lastComma;
    if (dotIsDecimal) {
      // 1,234.56 → remove commas
      return cleaned.replace(/,/g, "");
    }
    // 1.234,56 → remove dots, comma decimal
    return cleaned.replace(/\./g, "").replace(/,/g, ".");
  }

  if (hasComma) {
    // If comma looks like thousands separator (9,800 or 1,234,567) → remove commas
    if (/^\d{1,3}(,\d{3})+$/.test(cleaned) || /^\d+(,\d{3})+$/.test(cleaned)) {
      return cleaned.replace(/,/g, "");
    }
    // If single comma with exactly 3 digits after → thousands
    const m = cleaned.match(/^(\d+),(\d{3})$/);
    if (m) return `${m[1]}${m[2]}`;
    // Else treat comma as decimal
    return cleaned.replace(/,/g, ".");
  }

  if (hasDot) {
    // If dot looks like thousands separator (15.000 or 1.234.567) → remove dots
    if (/^\d{1,3}(\.\d{3})+$/.test(cleaned) || /^\d+(\.\d{3})+$/.test(cleaned)) {
      return cleaned.replace(/\./g, "");
    }
    // If single dot with exactly 3 digits after → thousands
    const m = cleaned.match(/^(\d+)\.(\d{3})$/);
    if (m) return `${m[1]}${m[2]}`;
    // Else dot is decimal
    return cleaned;
  }

  return cleaned;
}

type PriceCandidate = {
  amount: number;
  currency?: string;
  formatted?: string;
  source: "jsonld" | "meta" | "openai" | "regex";
  confidence: number; // 0..1
};

type PriceRangeCandidate = {
  min: number;
  max: number;
  currency?: string;
  unit?: string;
  formatted?: string;
  source: "regex";
  confidence: number; // 0..1
};

function normalizeCurrency(cur?: string) {
  const c = String(cur ?? "").trim().toUpperCase();
  if (!c) return undefined;
  if (c === "US$" || c === "U$S") return "USD";
  if (c === "RMB") return "CNY";
  if (c === "YUAN") return "CNY";
  if (c === "CN¥") return "CNY";
  if (c === "AR$" || c === "ARS" || c === "PESO" || c === "PESOS") return "ARS";
  return c;
}

function extractMetaContent(html: string, attr: "property" | "name", key: string) {
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${key.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  return html.match(re)?.[1]?.trim() || undefined;
}

function extractTitleFromHtml(html?: string) {
  if (!html) return undefined;
  const og = extractMetaContent(html, "property", "og:title");
  if (og) return og;
  const tw = extractMetaContent(html, "name", "twitter:title");
  if (tw) return tw;
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const t = String(m ?? "").replace(/\s+/g, " ").trim();
  return t || undefined;
}

function extractDescriptionFromHtml(html?: string) {
  if (!html) return undefined;
  const og = extractMetaContent(html, "property", "og:description");
  if (og) return og;
  const d = extractMetaContent(html, "name", "description");
  if (d) return d;
  return undefined;
}

function fallbackTitleFromUrlAnalysis(analysis: { url: string; urlHints?: any }) {
  try {
    const u = new URL(analysis.url);
    const domain = String(analysis.urlHints?.domain ?? u.hostname ?? "")
      .replace(/^www\./, "")
      .trim();
    const tokens: string[] = Array.isArray(analysis.urlHints?.tokens)
      ? analysis.urlHints.tokens
      : [];
    const STOP = new Set([
      "product",
      "products",
      "detail",
      "details",
      "productdetail",
      "productdetails",
      "product-detail",
      "spanish",
      "alibaba",
      "amazon",
      "item",
      "dp",
      "html",
      "php",
    ]);
    const cleaned = tokens
      .map((t) => String(t || "").trim())
      .filter(Boolean)
      .filter((t) => !/^\d{4,}$/.test(t))
      .map((t) => t.replace(/\.(html?|php)$/i, ""))
      .filter((t) => !STOP.has(t.toLowerCase()))
      .slice(0, 12)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned && cleaned.length >= 8) return cleaned.slice(0, 120);
    if (domain) return `Producto desde ${domain}`;
    return "Producto";
  } catch {
    return "Producto";
  }
}

function extractJsonLdCandidates(html?: string): PriceCandidate[] {
  if (!html) return [];
  const out: PriceCandidate[] = [];

  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(
    (m) => m[1]
  );
  if (!scripts.length) return [];

  const pushOffer = (price: unknown, priceCurrency: unknown, conf: number) => {
    const amount = num(price);
    if (amount == null || amount <= 0) return;
    out.push({
      amount,
      currency: normalizeCurrency(typeof priceCurrency === "string" ? priceCurrency : undefined),
      source: "jsonld",
      confidence: conf,
    });
  };

  const walk = (node: any, depth = 0) => {
    if (!node || depth > 6) return;
    if (Array.isArray(node)) {
      for (const x of node) walk(x, depth + 1);
      return;
    }
    if (typeof node !== "object") return;

    // Common patterns: { offers: { price, priceCurrency } } or offers: []
    if (node.offers) walk(node.offers, depth + 1);

    if (node.price != null || node.lowPrice != null || node.highPrice != null) {
      const currency = node.priceCurrency ?? node.currency;
      if (node.price != null) pushOffer(node.price, currency, 0.9);
      if (node.lowPrice != null) pushOffer(node.lowPrice, currency, 0.75);
      if (node.highPrice != null) pushOffer(node.highPrice, currency, 0.65);
    }

    for (const k of Object.keys(node)) {
      if (k === "@context" || k === "@type") continue;
      walk(node[k], depth + 1);
    }
  };

  for (const raw of scripts.slice(0, 6)) {
    const trimmed = String(raw ?? "").trim();
    if (!trimmed) continue;
    try {
      const json = JSON.parse(trimmed);
      walk(json);
    } catch {
      // ignore
    }
  }

  return out;
}

function extractMetaCandidates(html?: string): PriceCandidate[] {
  if (!html) return [];
  const out: PriceCandidate[] = [];

  const amount =
    html.match(/property=["']product:price:amount["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
    html.match(/itemprop=["']price["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
    html.match(/name=["']price["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
    undefined;

  const currency =
    html.match(/property=["']product:price:currency["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
    html.match(/itemprop=["']priceCurrency["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
    undefined;

  const n = amount != null ? Number(normalizeNumberLike(amount)) : NaN;
  if (Number.isFinite(n) && n > 0) {
    out.push({
      amount: n,
      currency: normalizeCurrency(currency),
      source: "meta",
      confidence: 0.85,
    });
  }

  return out;
}

function extractRegexCandidates(text?: string): PriceCandidate[] {
  if (!text) return [];
  const t = text.slice(0, 15_000);
  const out: PriceCandidate[] = [];

  // Capture explicit currency codes/symbols
  for (const m of t.matchAll(/(?:\bUSD\b|US\$|U\$S|\$)\s*([0-9][0-9.,]{0,12})/gi)) {
    const n = Number(normalizeNumberLike(m[1] ?? ""));
    if (!Number.isFinite(n) || n <= 0) continue;
    out.push({ amount: n, currency: "USD", source: "regex", confidence: 0.55 });
  }

  for (const m of t.matchAll(/(?:\bCNY\b|\bRMB\b|¥)\s*([0-9][0-9.,]{0,12})/gi)) {
    const n = Number(normalizeNumberLike(m[1] ?? ""));
    if (!Number.isFinite(n) || n <= 0) continue;
    out.push({ amount: n, currency: "CNY", source: "regex", confidence: 0.5 });
  }

  for (const m of t.matchAll(/(?:\bARS\b|AR\$)\s*([0-9][0-9.,]{0,14})/gi)) {
    const n = Number(normalizeNumberLike(m[1] ?? ""));
    if (!Number.isFinite(n) || n <= 0) continue;
    out.push({ amount: n, currency: "ARS", source: "regex", confidence: 0.62 });
  }

  return out;
}

function extractRegexRangeCandidates(text?: string): PriceRangeCandidate[] {
  if (!text) return [];
  const t = text.slice(0, 25_000);
  const out: PriceRangeCandidate[] = [];

  const normCur = (raw: string) => {
    const s = String(raw || "").trim().toUpperCase();
    if (!s) return undefined;
    if (s === "US$" || s === "U$S" || s === "$" || s === "USD") return "USD";
    if (s === "RMB" || s === "CNY" || s === "¥") return "CNY";
    if (s === "€" || s === "EUR") return "EUR";
    return s;
  };

  const push = (aRaw: string, bRaw: string, curRaw?: string, unitRaw?: string, conf = 0.7) => {
    const a = Number(normalizeNumberLike(aRaw));
    const b = Number(normalizeNumberLike(bRaw));
    if (!Number.isFinite(a) || !Number.isFinite(b)) return;
    if (a <= 0 || b <= 0) return;
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    const cur = normCur(curRaw ?? "");
    // ARS amounts can be much larger than USD/CNY nominal values; keep a higher ceiling there.
    const maxAllowed = cur === "ARS" ? 1_000_000_000 : 5_000_000;
    if (min > maxAllowed || max > maxAllowed) return;
    out.push({
      min,
      max,
      currency: curRaw ? cur : undefined,
      unit: unitRaw ? String(unitRaw).trim() : undefined,
      source: "regex",
      confidence: conf,
    });
  };

  // Currency first: "USD 9,800 - 15,000 / set"
  for (const m of t.matchAll(
    /(?:\bUSD\b|US\$|U\$S|\bCNY\b|\bRMB\b|¥|€|\bARS\b|AR\$|\$)\s*([0-9][0-9.,]{0,14})\s*(?:-|–|—|~|to)\s*([0-9][0-9.,]{0,14})(?:\s*\/\s*([a-zA-Z]+))?/gi
  )) {
    const cur = m[0].match(/(?:\bUSD\b|US\$|U\$S|\bCNY\b|\bRMB\b|¥|€|\bARS\b|AR\$|\$)/i)?.[0];
    push(m[1] ?? "", m[2] ?? "", cur, m[3], cur ? 0.75 : 0.65);
    if (out.length >= 6) break;
  }

  // Currency after: "9,800 - 15,000 USD"
  for (const m of t.matchAll(
    /([0-9][0-9.,]{0,14})\s*(?:-|–|—|~|to)\s*([0-9][0-9.,]{0,14})\s*(?:\bUSD\b|US\$|U\$S|\bCNY\b|\bRMB\b|¥|€|\bARS\b|AR\$|\$)/gi
  )) {
    const cur = m[0].match(/(?:\bUSD\b|US\$|U\$S|\bCNY\b|\bRMB\b|¥|€|\bARS\b|AR\$|\$)/i)?.[0];
    push(m[1] ?? "", m[2] ?? "", cur, undefined, cur ? 0.7 : 0.6);
    if (out.length >= 6) break;
  }

  return out;
}

function chooseBestPrice(candidates: PriceCandidate[]): PriceCandidate | null {
  const filtered = candidates
    .filter((c) => {
      if (!Number.isFinite(c.amount) || c.amount <= 0) return false;
      const cur = normalizeCurrency(c.currency);
      const maxAllowed = cur === "ARS" ? 1_000_000_000 : 5_000_000;
      return c.amount < maxAllowed;
    })
    .map((c) => ({ ...c, currency: normalizeCurrency(c.currency) }));
  if (!filtered.length) return null;

  const score = (c: PriceCandidate) => {
    const curBoost = c.currency === "USD" ? 0.1 : c.currency === "CNY" ? 0.05 : 0;
    const srcBoost = c.source === "jsonld" ? 0.2 : c.source === "meta" ? 0.15 : c.source === "openai" ? 0.1 : 0;
    return c.confidence + curBoost + srcBoost;
  };

  return filtered.sort((a, b) => score(b) - score(a))[0] ?? null;
}

/** eBay (and similar) pages contain many $ amounts (fees, ads, seller stats). Regex/OpenAI often pick the wrong one. */
function marketplaceSoftCapUsd(url: string): number | null {
  try {
    const h = new URL(url).hostname.toLowerCase();
    if (h.includes("ebay.")) return 25_000;
    return null;
  } catch {
    return null;
  }
}

function roughUsdEquivalent(
  c: PriceCandidate,
  fxCnyPerUsd: number,
  fxArsPerUsd: number
): number {
  const cur = normalizeCurrency(c.currency);
  if (!cur || cur === "USD") return c.amount;
  if (cur === "CNY" && Number.isFinite(fxCnyPerUsd) && fxCnyPerUsd > 0) return c.amount / fxCnyPerUsd;
  if (cur === "ARS" && Number.isFinite(fxArsPerUsd) && fxArsPerUsd > 0) return c.amount / fxArsPerUsd;
  return c.amount;
}

function roughUsdForRangeMinMax(
  min: number,
  max: number,
  currency: string | undefined,
  fxCnyPerUsd: number,
  fxArsPerUsd: number
): { minUsd: number; maxUsd: number } {
  const cur = normalizeCurrency(currency);
  if (cur === "CNY" && Number.isFinite(fxCnyPerUsd) && fxCnyPerUsd > 0) {
    return { minUsd: min / fxCnyPerUsd, maxUsd: max / fxCnyPerUsd };
  }
  if (cur === "ARS" && Number.isFinite(fxArsPerUsd) && fxArsPerUsd > 0) {
    return { minUsd: min / fxArsPerUsd, maxUsd: max / fxArsPerUsd };
  }
  return { minUsd: min, maxUsd: max };
}

/**
 * Drops regex/openai prices above cap on noisy marketplaces. Keeps json-ld + meta (structured product data).
 */
function applyMarketplacePriceSanity(args: {
  url: string;
  priceCandidates: PriceCandidate[];
  rangeCandidates: PriceRangeCandidate[];
  fxCnyPerUsd: number;
}): { priceCandidates: PriceCandidate[]; rangeCandidates: PriceRangeCandidate[]; capUsd: number | null } {
  const cap = marketplaceSoftCapUsd(args.url);
  if (cap == null) {
    return { priceCandidates: args.priceCandidates, rangeCandidates: args.rangeCandidates, capUsd: null };
  }

  const fxArsPerUsd = Number(process.env.FX_ARS_PER_USD ?? "1000");
  const softCap = cap;

  const priceCandidates = args.priceCandidates.filter((c) => {
    if (c.source === "jsonld" || c.source === "meta") return true;
    if (c.source !== "regex" && c.source !== "openai") return true;
    const usd = roughUsdEquivalent(c, args.fxCnyPerUsd, fxArsPerUsd);
    return usd <= softCap;
  });

  const rangeCandidates = args.rangeCandidates.filter((r) => {
    const { minUsd, maxUsd } = roughUsdForRangeMinMax(
      r.min,
      r.max,
      r.currency,
      args.fxCnyPerUsd,
      fxArsPerUsd
    );
    const hi = Math.max(minUsd, maxUsd);
    return hi <= softCap;
  });

  return { priceCandidates, rangeCandidates, capUsd: softCap };
}

function hasOpenAiKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

const STOPWORDS = new Set([
  "de",
  "del",
  "la",
  "las",
  "el",
  "los",
  "y",
  "o",
  "para",
  "con",
  "sin",
  "por",
  "un",
  "una",
  "unos",
  "unas",
  "en",
  "al",
  "a",
]);

function uniqueStrings(items: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const v = String(it || "").trim();
    if (!v) continue;
    const key = normText(v);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function expandSearchQueries(input: string) {
  const t = normText(input);
  const queries: string[] = [input];

  if (/\bautoelevad/.test(t)) {
    queries.push("carretilla", "carretillas", "apilador");
  }
  if (/\bmontacarg/.test(t) && !/\bascensor/.test(t)) {
    queries.push("ascensor");
  }
  if (/\belevador\b/.test(t) && !/\bautoelevad/.test(t)) {
    queries.push("ascensor", "elevador vehiculos", "elevador de liquidos");
  }
  if (/\bapilador\b/.test(t)) {
    queries.push("carretilla elevadora", "autoelevador");
  }

  return uniqueStrings(queries).slice(0, 4);
}

const GENERIC_TOKENS = new Set(["elevador", "montacargas", "maquina", "equipo", "producto"]);

function normText(s: string) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokensFrom(s: string) {
  const t = normText(s);
  if (!t) return [];
  const toks = t
    .split(/\s+/g)
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => x.length >= 4)
    .filter((x) => !STOPWORDS.has(x));
  return [...new Set(toks)].slice(0, 12);
}

function tokenMatchesTitle(token: string, titleNorm: string) {
  const words = titleNorm.split(/\s+/g);
  return words.some((w) => w === token || w.startsWith(token) || token.startsWith(w));
}

function scoreCandidate(query: string, title?: string) {
  const qTokens = tokensFrom(query);
  const tNorm = normText(title ?? "");
  if (!qTokens.length || !tNorm) return { score: 0, qTokens };
  let hits = 0;
  for (const tok of qTokens) {
    if (tokenMatchesTitle(tok, tNorm)) hits++;
  }
  return { score: hits / qTokens.length, qTokens };
}

export async function productFromUrlPipeline(
  url: string,
  opts?: { hintText?: string }
): Promise<ScrapedProduct> {
  const analysis = await analyzeUrl(url);
  const hintText = typeof opts?.hintText === "string" ? opts.hintText.slice(0, 10_000) : "";

  // 1) Extract product fields (AI when possible)
  let extracted: any = null;
  if (hasOpenAiKey()) {
    const system = [
      "Eres un extractor experto de datos de páginas de productos.",
      "Devuelve SOLO JSON válido.",
      "Keys requeridas: title, description, category, origin, price, year, make, model, vin, specs.",
      "price debe ser { amount, currency, formatted } si existe.",
      "year debe ser un número (ej: 2024) cuando aplique.",
      "make/model/vin solo cuando aplique (vehículos/electrónica).",
      "No inventes datos si no aparecen; usa null/omitir.",
    ].join("\n");

    const hints = analysis.urlHints
      ? [
          `DOMAIN: ${analysis.urlHints.domain}`,
          `PATH: ${analysis.urlHints.path}`,
          analysis.urlHints.year ? `YEAR_HINT: ${analysis.urlHints.year}` : "",
          analysis.urlHints.tokens?.length
            ? `TOKENS: ${analysis.urlHints.tokens.slice(0, 24).join(" ")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "";

    const user = analysis.text
      ? [
          "Analiza el contenido de la página (texto limpiado) y extrae datos del producto.",
          `URL: ${analysis.url}`,
          hints ? `URL_HINTS:\n${hints}` : "",
          analysis.imageUrls?.length
            ? `IMAGE_URLS (para contexto, no inventes):\n${analysis.imageUrls.slice(0, 5).join("\n")}`
            : "",
          "CONTENT:",
          analysis.text,
        ].join("\n\n")
      : [
          "No se pudo obtener HTML. Inferí lo máximo posible SOLO desde el patrón de la URL.",
          `URL: ${analysis.url}`,
          hints ? `URL_HINTS:\n${hints}` : "",
        ].join("\n\n");

    const isEbay = (() => {
      try {
        return new URL(analysis.url).hostname.toLowerCase().includes("ebay.");
      } catch {
        return false;
      }
    })();

    extracted = await openaiJson<Record<string, any>>({
      system:
        system +
        (isEbay
          ? "\nSitio eBay: el precio debe ser SOLO el precio de compra del listado (Buy It Now o puja actual), en número real. No uses totales de ventas del vendedor, cargos, envíos agregados, IDs largos ni cifras de publicidad/similares si no son el precio del ítem."
          : ""),
      user,
      model: process.env.OPENAI_MODEL || "gpt-4o",
    }).catch(() => null);
  }

  const title =
    (extracted?.title as string | undefined) ??
    extractTitleFromHtml(analysis.html) ??
    undefined;

  const description =
    (extracted?.description as string | undefined) ??
    extractDescriptionFromHtml(analysis.html);
  const category = extracted?.category as string | undefined;
  const origin = extracted?.origin as string | undefined;
  const year = num(extracted?.year);
  const make = extracted?.make as string | undefined;
  const model = extracted?.model as string | undefined;
  const vin = extracted?.vin as string | undefined;

  const openAiAmount = num(extracted?.price?.amount);
  const openAiCurrency = normalizeCurrency((extracted?.price?.currency as string | undefined) ?? undefined);
  const openAiFormatted = extracted?.price?.formatted as string | undefined;

  const priceCandidates: PriceCandidate[] = [
    ...extractJsonLdCandidates(analysis.html),
    ...extractMetaCandidates(analysis.html),
    ...(openAiAmount != null
      ? [
          {
            amount: openAiAmount,
            currency: openAiCurrency,
            formatted: openAiFormatted,
            source: "openai" as const,
            confidence: 0.7,
          },
        ]
      : []),
    ...extractRegexCandidates(analysis.text),
    ...(hintText ? extractRegexCandidates(hintText) : []),
  ];

  const rangeCandidates: PriceRangeCandidate[] = [
    ...extractRegexRangeCandidates(analysis.text),
    ...(typeof openAiFormatted === "string" ? extractRegexRangeCandidates(openAiFormatted) : []),
    ...(hintText ? extractRegexRangeCandidates(hintText) : []),
  ];

  const fxCnyPerUsd = Number(process.env.FX_CNY_PER_USD ?? "7.2");
  const sanity = applyMarketplacePriceSanity({
    url: analysis.url,
    priceCandidates,
    rangeCandidates,
    fxCnyPerUsd,
  });
  const priceCandidatesSan = sanity.priceCandidates;
  const rangeCandidatesSan = sanity.rangeCandidates;

  const best = chooseBestPrice(priceCandidatesSan);

  let fobUsd: number | undefined = undefined;
  let currency: string | undefined = undefined;
  let price: ScrapedProduct["price"] | undefined = undefined;
  let priceMeta: any = undefined;

  // Prefer explicit ranges when present (Alibaba/1688 often show a min-max).
  const bestRange = (() => {
    const filtered = rangeCandidatesSan
      .filter((r) => Number.isFinite(r.min) && Number.isFinite(r.max) && r.min > 0 && r.max > 0)
      .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
    if (!filtered.length) return null;
    // If ARS range is explicitly present, prioritize it over weaker inferred currencies.
    const arsFirst = filtered.filter((r) => normalizeCurrency(r.currency) === "ARS");
    return (arsFirst[0] ?? filtered[0]) ?? null;
  })();

  if (bestRange) {
    const cur = normalizeCurrency(bestRange.currency);
    const unit = String(bestRange.unit ?? "").trim();
    if (cur === "USD" || cur == null) {
      price = {
        type: "range",
        min: Math.round(bestRange.min * 100) / 100,
        max: Math.round(bestRange.max * 100) / 100,
        currency: "USD",
        unit,
      };
      fobUsd = price.min ?? undefined;
      currency = "USD";
    } else if (cur === "CNY" && Number.isFinite(fxCnyPerUsd) && fxCnyPerUsd > 0) {
      const minUsd = Math.round((bestRange.min / fxCnyPerUsd) * 100) / 100;
      const maxUsd = Math.round((bestRange.max / fxCnyPerUsd) * 100) / 100;
      price = { type: "range", min: minUsd, max: maxUsd, currency: "USD", unit };
      fobUsd = minUsd;
      currency = "USD";
    } else if (cur === "ARS") {
      const fxArsPerUsd = await getArsPerUsd().catch(() => null);
      if (typeof fxArsPerUsd === "number" && Number.isFinite(fxArsPerUsd) && fxArsPerUsd > 0) {
        const minUsd = Math.round((bestRange.min / fxArsPerUsd) * 100) / 100;
        const maxUsd = Math.round((bestRange.max / fxArsPerUsd) * 100) / 100;
        price = { type: "range", min: minUsd, max: maxUsd, currency: "USD", unit };
        fobUsd = minUsd;
        currency = "USD";
      }
    }
    priceMeta = {
      rangeChosen: bestRange,
      rangeCandidates: rangeCandidatesSan.slice(0, 6),
      marketplaceSoftCapUsd: sanity.capUsd,
      fxCnyPerUsd: cur === "CNY" ? fxCnyPerUsd : undefined,
      fxArsPerUsd: cur === "ARS" ? await getArsPerUsd().catch(() => undefined) : undefined,
    };
  }

  // If we already have a range, do NOT override fobUsd with a single candidate.
  if (best && !(price && price.type === "range")) {
    if (best.currency === "USD" || best.currency == null) {
      fobUsd = best.amount;
      currency = "USD";
    } else if (best.currency === "CNY" && Number.isFinite(fxCnyPerUsd) && fxCnyPerUsd > 0) {
      fobUsd = Math.round((best.amount / fxCnyPerUsd) * 100) / 100;
      currency = "USD";
    } else if (best.currency === "ARS") {
      const fxArsPerUsd = await getArsPerUsd().catch(() => null);
      if (typeof fxArsPerUsd === "number" && Number.isFinite(fxArsPerUsd) && fxArsPerUsd > 0) {
        fobUsd = Math.round((best.amount / fxArsPerUsd) * 100) / 100;
        currency = "USD";
      }
    }

    priceMeta = {
      chosen: best,
      marketplaceSoftCapUsd: sanity.capUsd,
      fxCnyPerUsd: best.currency === "CNY" ? fxCnyPerUsd : undefined,
      fxArsPerUsd: best.currency === "ARS" ? await getArsPerUsd().catch(() => undefined) : undefined,
      usdEstimated: typeof fobUsd === "number" ? fobUsd : undefined,
      candidates: priceCandidatesSan.slice(0, 10),
    };
  } else if (best && priceMeta) {
    // keep chosen metadata for debugging without altering the decided range
    priceMeta = {
      ...priceMeta,
      chosen: best,
      marketplaceSoftCapUsd: sanity.capUsd,
      candidates: priceCandidatesSan.slice(0, 10),
    };
  }

  // Defensive guard: avoid placeholder prices (e.g. 0.99) from blocked/unavailable pages.
  // In those cases, prefer asking for real price instead of quoting with garbage data.
  const unavailableSignal = /product\s+not\s+available|out\s+of\s+stock|unavailable/i.test(
    `${title ?? ""} ${description ?? ""} ${String(analysis.text ?? "").slice(0, 2500)}`
  );
  const blockedHint = String((analysis as any)?.blockedHint ?? "").trim().toLowerCase();
  const blockedOrFailed = blockedHint === "unusual_traffic" || blockedHint === "fetch_failed";
  if (!bestRange && typeof fobUsd === "number" && fobUsd <= 5 && (unavailableSignal || blockedOrFailed)) {
    fobUsd = undefined;
    currency = undefined;
    price = undefined;
    priceMeta = { ...(priceMeta ?? {}), suspiciousPlaceholderDiscarded: true };
  }

  // If we only have a single price, expose it in a consistent shape too.
  if (!price) {
    if (typeof fobUsd === "number" && Number.isFinite(fobUsd) && fobUsd > 0) {
      price = { type: "single", min: fobUsd, max: null, currency: "USD", unit: "" };
    } else {
      price = { type: "unknown", min: null, max: null, currency: "", unit: "" };
    }
  }

  // 2) Classify NCM from extracted text
  const textForNcm = [
    title,
    category ? `Categoría: ${category}` : "",
    description,
    origin ? `Origen: ${origin}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const cls = textForNcm && hasOpenAiKey()
    ? await classifyWithAI(textForNcm).catch(() => null)
    : null;
  const ncm = cls?.ncm_code && cls.ncm_code !== "9999.99.99" ? cls.ncm_code : undefined;

  // Free "pro" candidates: local nomenclator index (auto-filled from PCRAM over time).
  let localCandidates: Array<{ ncmCode: string; title?: string }> | undefined;
  try {
    const nom = new LocalNomenclator();
    const query =
      (Array.isArray(cls?.search_terms) && cls?.search_terms?.[0]) ||
      title ||
      category ||
      description ||
      "";
    const hs = cls?.hs_heading;
    if (query) {
      const res = nom.search(String(query).slice(0, 180), { limit: 12, hsHeading: hs });
      localCandidates = res.map((r) => ({ ncmCode: r.ncmCode, title: r.title }));
    }
  } catch {
    // ignore
  }

  // 3) PCRAM detail (official taxes/interventions) when NCM available and creds exist
  let pcram: any = undefined;
  let ncmAdjusted: string | undefined = ncm;
  let ncmMeta:
    | {
        aiNcm?: string;
        hsHeading?: string;
        kind?: string;
        searchTerms?: string[];
        missingInfoQuestions?: string[];
        adjustedFrom?: string;
        adjustedTo?: string;
        pcramCandidates?: Array<{ ncmCode: string; title?: string }>;
        localCandidates?: Array<{ ncmCode: string; title?: string }>;
        confidence?: number;
        ambiguous?: boolean;
        discarded?: Array<{ ncm: string; reason: string }>;
      }
    | undefined = ncm
    ? {
        aiNcm: ncm,
        hsHeading: cls?.hs_heading,
        kind: cls?.kind,
        searchTerms: cls?.search_terms,
        localCandidates,
      }
    : undefined;

  if (process.env.PCRAM_USER && process.env.PCRAM_PASS) {
    const client = new PcramClient();
    const queryForSearch = (title || category || description || "").trim() || textForNcm || url;
    const queries = expandSearchQueries(queryForSearch);
    const merged: Array<{ ncmCode: string; title?: string; href?: string }> = [];
    const seen = new Set<string>();

    // Seed with local candidates first.
    if (Array.isArray(localCandidates) && localCandidates.length) {
      for (const c of localCandidates) {
        const ncmCode = String(c.ncmCode ?? "").trim();
        const key = ncmCode.replace(/\D/g, "");
        if (!key || key.length < 6 || seen.has(key)) continue;
        seen.add(key);
        merged.push({ ncmCode, title: c.title });
        if (merged.length >= 8) break;
      }
    }

    for (const q of queries) {
      const found = await client.searchNcm(q, { limit: 10 }).catch(() => []);
      for (const c of found) {
        const key = String(c.ncmCode).replace(/\D/g, "");
        if (!key || seen.has(key)) continue;
        seen.add(key);
        merged.push(c);
        if (merged.length >= 8) break;
      }
      if (merged.length >= 8) break;
    }
    const candidates = merged;
    if (candidates.length) {
      // Enrich missing titles by fetching PCRAM detail for top candidates.
      const needEnrich = candidates.every((c) => !c.title);
      const enriched = needEnrich
        ? await Promise.all(
            candidates.map(async (c, idx) => {
              if (c.title) return c;
              if (idx >= 5) return c;
              const d = await client.getDetail(c.ncmCode).catch(() => null);
              return { ...c, title: d?.title || c.title };
            })
          )
        : candidates;

      ncmMeta = ncmMeta ?? (ncmAdjusted ? { aiNcm: ncmAdjusted } : {});
      if (ncmMeta && localCandidates) ncmMeta.localCandidates = localCandidates;
      ncmMeta.pcramCandidates = enriched
        .slice(0, 8)
        .map((c) => ({ ncmCode: c.ncmCode, title: c.title }));

      // AI "research": choose NCM from the evidence candidate list (PCRAM + local).
      if (hasOpenAiKey()) {
        const evidenceNote = [
          "Elegí el NCM correcto usando SOLO los candidatos provistos.",
          "Priorizá coincidencia del título/descripción/origen extraídos de la URL.",
        ].join(" ");
        const aiPick = await classifyWithAI(textForNcm, {
          candidates: enriched.slice(0, 10).map((c) => ({ ncm_code: c.ncmCode, title: c.title })),
          evidenceNote,
        }).catch(() => null);
        if (aiPick && Array.isArray(aiPick.discarded) && aiPick.discarded.length && ncmMeta) {
          ncmMeta.discarded = aiPick.discarded;
        }
        const picked =
          aiPick?.ncm_code && aiPick.ncm_code !== "9999.99.99" ? aiPick.ncm_code : undefined;
        if (picked) {
          const prev = ncmAdjusted;
          ncmAdjusted = picked;
          if (prev && prev !== picked) {
            ncmMeta.adjustedFrom = prev;
            ncmMeta.adjustedTo = picked;
          }
          if (typeof aiPick?.confidence === "number") ncmMeta.confidence = aiPick.confidence;
          if (Array.isArray(aiPick?.missing_info_questions) && aiPick!.missing_info_questions!.length) {
            ncmMeta.missingInfoQuestions = aiPick!.missing_info_questions;
          }
          ncmMeta.ambiguous = Boolean(
            aiPick?.ambiguous === true ||
              (aiPick && aiPick.confidence != null && aiPick.confidence < 0.55)
          );
        } else {
          // Fallback: if AI cannot pick, default to the top PCRAM candidate.
          const top = enriched?.[0]?.ncmCode;
          if (!ncmAdjusted && top) {
            ncmAdjusted = top;
            ncmMeta.ambiguous = true;
          }
        }
      } else if (!ncmAdjusted) {
        // If OpenAI is unavailable, pick top evidence candidate as deterministic fallback.
        const top = enriched?.[0]?.ncmCode;
        if (top) {
          ncmAdjusted = top;
          if (ncmMeta) ncmMeta.ambiguous = true;
        }
      }
    }
    if (ncmAdjusted) {
      pcram = await client.getDetail(ncmAdjusted).catch(() => undefined);
      // Keep inferred NCM even if PCRAM detail is unavailable.
      // This allows quoting flows to continue with explicit "estimado" flags.
      if (!pcram) {
        if (ncmMeta) ncmMeta.ambiguous = true;
      } else if (typeof (pcram as any)?.ncmCode === "string" && (pcram as any).ncmCode.trim()) {
        // Persist authoritative format/value from PCRAM.
        ncmAdjusted = String((pcram as any).ncmCode).trim();
      }
    }
  }

  // Last fallback: use top local candidate if we still couldn't resolve ncm.
  if (!ncmAdjusted && Array.isArray(localCandidates) && localCandidates.length) {
    const topLocal = String(localCandidates[0]?.ncmCode ?? "").trim();
    if (topLocal) {
      ncmAdjusted = topLocal;
      ncmMeta = ncmMeta ?? { localCandidates };
      if (ncmMeta) ncmMeta.ambiguous = true;
    }
  }

  return {
    title: title || fallbackTitleFromUrlAnalysis(analysis),
    description,
    category,
    origin,
    ncm: ncmAdjusted,
    fobUsd,
    currency,
    price,
    url: analysis.url,
    images: analysis.imageUrls,
    raw: {
      urlAnalysis: {
        fetchFailed: analysis.fetchFailed,
        blockedHint: (analysis as any).blockedHint,
        imageUrls: analysis.imageUrls,
        urlHints: analysis.urlHints,
      },
      extracted,
      extractedMeta: {
        year,
        make,
        model,
        vin,
      },
      pcram,
      ncmMeta,
      priceMeta,
    },
  };
}

