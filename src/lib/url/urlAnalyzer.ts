import { chromium } from "playwright";

export type ExtractedPrice = {
  amount?: number;
  currency?: string;
  formatted?: string;
};

export type UrlAnalysis = {
  fetchFailed: boolean;
  blockedHint?: string;
  html?: string;
  text?: string;
  imageUrls: string[];
  url: string;
  urlHints?: {
    domain: string;
    path: string;
    year?: number;
    tokens: string[];
  };
};

function detectBlockedHint(html: string | undefined) {
  const t = String(html ?? "").toLowerCase();
  if (!t) return undefined;
  // Common anti-bot / access restriction signals across ecommerce sites.
  if (
    t.includes("unusual traffic") ||
    t.includes("traffic from your computer network") ||
    t.includes("verify you are a human") ||
    t.includes("are you a robot") ||
    t.includes("captcha") ||
    t.includes("security verification") ||
    t.includes("access denied") ||
    t.includes("request blocked") ||
    t.includes("temporarily blocked") ||
    t.includes("robot check") ||
    t.includes("安全验证") ||
    t.includes("验证码") ||
    t.includes("访问受限") ||
    t.includes("验证") && t.includes("安全")
  ) {
    return "unusual_traffic";
  }
  return undefined;
}

function stripScriptsAndStyles(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
}

function htmlToText(html: string) {
  const cleaned = stripScriptsAndStyles(html)
    .replace(/<\/(p|div|br|li|h1|h2|h3|h4|h5|h6)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned;
}

function normalizeUrl(u: string) {
  try {
    const url = new URL(u);
    return url.toString();
  } catch {
    return u;
  }
}

function isLikelyAsset(url: string) {
  // Allow gif/webp/jpg/png as possible product media. Block typical page assets.
  return /\.(svg|ico|css|js)(\?|#|$)/i.test(url);
}

function isLikelyLogo(url: string) {
  return /(logo|sprite|icon|avatar|badge|favicon)/i.test(url);
}

export function extractImageUrls(html: string, baseUrl: string) {
  // Preserve priority order:
  // 1) og:image
  // 2) img src
  // 3) data-src/data-original/etc (lazy loaders)
  // 4) srcset candidates
  const ordered: string[] = [];
  const seen = new Set<string>();
  const push = (v: string | undefined) => {
    const s = String(v ?? "").trim();
    if (!s) return;
    if (seen.has(s)) return;
    seen.add(s);
    ordered.push(s);
  };

  for (const m of html.matchAll(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/gi
  )) {
    push(m[1]);
  }
  for (const m of html.matchAll(
    /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["'][^>]*>/gi
  )) {
    push(m[1]);
  }
  for (const m of html.matchAll(
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/gi
  )) {
    push(m[1]);
  }
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)) {
    push(m[1]);
  }
  // Lazy-loading attributes (Alibaba/Amazon commonly use these)
  for (const m of html.matchAll(
    /<(?:img|source)[^>]+(?:data-src|data-original|data-lazy-src|data-lazyload|data-ks-lazyload|data-img|data-image|data-zoom-image)=["']([^"']+)["'][^>]*>/gi
  )) {
    push(m[1]);
  }
  for (const m of html.matchAll(/srcset=["']([^"']+)["']/gi)) {
    const srcset = m[1] ?? "";
    for (const part of srcset.split(",")) {
      push(part.trim().split(/\s+/)[0]);
    }
  }
  for (const m of html.matchAll(/data-srcset=["']([^"']+)["']/gi)) {
    const srcset = m[1] ?? "";
    for (const part of srcset.split(",")) {
      push(part.trim().split(/\s+/)[0]);
    }
  }

  // Fallback: scan for image URLs embedded in JSON/CSS (common in modern ecommerce pages)
  for (const m of html.matchAll(
    /((?:https?:)?\/\/[^\s"'()\\]+?\.(?:jpe?g|png|webp|gif)(?:\?[^\s"'()\\]+)?)\b/gi
  )) {
    push(m[1]);
    if (ordered.length >= 40) break;
  }
  for (const m of html.matchAll(/url\((['"]?)([^'")]+)\1\)/gi)) {
    const u = String(m[2] ?? "").trim();
    if (!u) continue;
    if (!/\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(u)) continue;
    push(u);
    if (ordered.length >= 50) break;
  }

  const abs: string[] = [];
  for (const u of ordered) {
    try {
      const a = new URL(u, baseUrl).toString();
      if (!/\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(a)) continue;
      if (isLikelyAsset(a) || isLikelyLogo(a)) continue;
      abs.push(a);
    } catch {
      // ignore
    }
  }

  return abs.slice(0, 10);
}

function chromeLikeHeaders(url: string) {
  // Matches the prompt's "imitate Chrome" headers as closely as possible.
  // Note: some headers may be ignored/overridden by undici/fetch.
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Sec-Ch-Ua": "\"Chromium\";v=\"122\", \"Not(A:Brand\";v=\"24\", \"Google Chrome\";v=\"122\"",
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": "\"Windows\"",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    Referer: url,
  } as Record<string, string>;
}

function getUrlHints(url: string) {
  try {
    const u = new URL(url);
    const domain = u.hostname.replace(/^www\./, "");
    const path = decodeURIComponent(u.pathname || "/");
    const rawTokens = path
      .split("/")
      .flatMap((p) => p.split(/[-_]+/g))
      .map((t) => t.trim())
      .filter(Boolean);
    const tokens = rawTokens.slice(0, 32);
    const year =
      tokens
        .map((t) => Number(t))
        .find((n) => Number.isFinite(n) && n >= 1990 && n <= 2035) ?? undefined;
    return { domain, path, year, tokens };
  } catch {
    return undefined;
  }
}

async function fetchHtml(url: string) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: chromeLikeHeaders(url),
  });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  return await res.text();
}

async function fetchHtmlWithPlaywright(url: string) {
  // Ensure Playwright can find installed browsers in local dev/runtime.
  process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "0";
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: chromeLikeHeaders(url)["User-Agent"],
      viewport: { width: 1920, height: 1080 },
      extraHTTPHeaders: {
        Accept: chromeLikeHeaders(url).Accept,
        "Accept-Language": chromeLikeHeaders(url)["Accept-Language"],
      },
    });
    const page = await context.newPage();
    // Speed: we only need HTML + image URLs from attributes, not the actual image bytes.
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (type === "image" || type === "font" || type === "media") return route.abort();
      return route.continue();
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    // allow dynamic hydration
    await page.waitForTimeout(1200);
    const html = await page.content();
    await page.close();
    await context.close();
    return html;
  } finally {
    await browser.close();
  }
}

export async function analyzeUrl(urlInput: string): Promise<UrlAnalysis> {
  const url = normalizeUrl(urlInput);
  const urlHints = getUrlHints(url);

  let html: string | undefined;
  let fetchFailed = false;
  try {
    html = await fetchHtml(url);
  } catch {
    try {
      html = await fetchHtmlWithPlaywright(url);
    } catch {
      fetchFailed = true;
      html = undefined;
    }
  }

  const imageUrls = html ? extractImageUrls(html, url) : [];
  const text = html ? htmlToText(html).slice(0, 15_000) : undefined;
  const blockedHint = fetchFailed ? "fetch_failed" : detectBlockedHint(html);

  return {
    fetchFailed,
    blockedHint,
    html,
    text,
    imageUrls,
    url,
    urlHints,
  };
}

