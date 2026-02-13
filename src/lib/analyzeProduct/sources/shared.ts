import * as cheerio from "cheerio";

export function loadDoc(html: string) {
  return cheerio.load(html);
}

export function textFromSelectors(
  $: cheerio.CheerioAPI,
  selectors: string[],
  opts?: { maxLen?: number }
) {
  const maxLen = opts?.maxLen ?? 40_000;
  for (const sel of selectors) {
    const t = $(sel)
      .map((_, el) => $(el).text())
      .get()
      .join("\n")
      .replace(/\s+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (t && t.length >= 40) return t.slice(0, maxLen);
  }
  return "";
}

export function listFromSelectors(
  $: cheerio.CheerioAPI,
  selectors: string[],
  opts?: { maxItems?: number }
) {
  const maxItems = opts?.maxItems ?? 60;
  for (const sel of selectors) {
    const items = $(sel)
      .map((_, el) => $(el).text())
      .get()
      .map((s) => String(s || "").replace(/\s+/g, " ").trim())
      .filter((s) => s.length >= 3)
      .slice(0, maxItems);
    if (items.length) return items;
  }
  return [];
}

export function firstNonEmpty(...xs: Array<string | undefined | null>) {
  for (const x of xs) {
    const s = String(x ?? "").trim();
    if (s) return s;
  }
  return "";
}

export function extractJsonLd(html: string) {
  const out: any[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    const raw = String(m[1] ?? "").trim();
    if (!raw) continue;
    try {
      out.push(JSON.parse(raw));
    } catch {
      // ignore
    }
    if (out.length >= 8) break;
  }
  return out;
}

export function extractImgUrls(html: string) {
  const urls: string[] = [];
  const re = /<img[^>]+>/gi;
  for (const m of html.matchAll(re)) {
    const tag = m[0] ?? "";
    const src =
      tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ??
      tag.match(/\bdata-src=["']([^"']+)["']/i)?.[1] ??
      tag.match(/\bdata-lazyload=["']([^"']+)["']/i)?.[1] ??
      tag.match(/\bdata-zoom-image=["']([^"']+)["']/i)?.[1] ??
      undefined;
    if (src) urls.push(src);
    const srcset = tag.match(/\bsrcset=["']([^"']+)["']/i)?.[1];
    if (srcset) {
      for (const part of srcset.split(",")) {
        const u = part.trim().split(/\s+/)[0];
        if (u) urls.push(u);
      }
    }
    if (urls.length >= 80) break;
  }
  return urls;
}

