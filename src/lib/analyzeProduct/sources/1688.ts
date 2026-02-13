import type { ExtractedPriceCandidate, ExtractedText } from "@/lib/analyzeProduct/types";
import { loadDoc, listFromSelectors, textFromSelectors, extractJsonLd, extractImgUrls, firstNonEmpty } from "./shared";

export function extract1688(html: string, contentText: string) {
  const $ = loadDoc(html);

  const title = firstNonEmpty(
    $("h1").first().text(),
    $("meta[property='og:title']").attr("content"),
    $("title").text()
  )
    .replace(/\s+/g, " ")
    .trim();

  const bullets = listFromSelectors($, [
    "[class*='offer'] [class*='feature'] li",
    "[class*='detail'] li",
    "ul li",
  ])
    .filter((x) => x.length <= 200)
    .slice(0, 20);

  const description = textFromSelectors($, [
    "[id*='desc']",
    "[class*='desc']",
    "[class*='detail']",
    "[class*='description']",
  ]);

  const specs: Array<{ label: string; value: string }> = [];
  $("table tr").each((_, tr) => {
    const tds = $(tr).find("td,th");
    if (tds.length < 2) return;
    const k = $(tds[0]).text().replace(/\s+/g, " ").trim();
    const v = $(tds[1]).text().replace(/\s+/g, " ").trim();
    if (k && v && k.length <= 80 && v.length <= 220) specs.push({ label: k, value: v });
  });

  const images = [
    $("meta[property='og:image']").attr("content"),
    ...extractImgUrls(html),
  ].filter(Boolean) as string[];

  const jsonld = extractJsonLd(html);
  const priceCandidates: ExtractedPriceCandidate[] = [];
  for (const node of jsonld) {
    const walk = (n: any, depth = 0) => {
      if (!n || depth > 6) return;
      if (Array.isArray(n)) return n.forEach((x) => walk(x, depth + 1));
      if (typeof n !== "object") return;
      if (n.offers) walk(n.offers, depth + 1);
      if (n.price != null || n.lowPrice != null || n.highPrice != null) {
        if (n.price != null) {
          priceCandidates.push({
            text: String(n.price),
            hintCurrency: typeof n.priceCurrency === "string" ? n.priceCurrency : undefined,
            source: "jsonld",
          });
        }
        if (n.lowPrice != null || n.highPrice != null) {
          priceCandidates.push({
            text: `${n.lowPrice ?? n.price} - ${n.highPrice ?? n.price}`,
            hintCurrency: typeof n.priceCurrency === "string" ? n.priceCurrency : undefined,
            source: "jsonld",
          });
        }
      }
      for (const k of Object.keys(n)) {
        if (k === "@context" || k === "@type") continue;
        walk(n[k], depth + 1);
      }
    };
    walk(node);
  }

  // 1688 often shows prices in RMB/CNY; scan for patterns like "¥12.00" or "12.00元"
  const scan = [description, contentText].filter(Boolean).join("\n").slice(0, 20_000);
  for (const m of scan.matchAll(/(?:¥|RMB|CNY)\s*([0-9][0-9.,]{0,14})(?:\s*(?:-|~|to)\s*([0-9][0-9.,]{0,14}))?/gi)) {
    const a = m[1];
    const b = m[2];
    priceCandidates.push({
      text: b ? `${a} - ${b}` : `${a}`,
      hintCurrency: "CNY",
      source: "regex",
    });
    if (priceCandidates.length >= 10) break;
  }

  const text: ExtractedText = {
    title: title || undefined,
    rawDescription: description || contentText || "",
    bullets: bullets.length ? bullets : undefined,
    specs: specs.length ? specs.slice(0, 60) : undefined,
  };

  return { text, images, priceCandidates };
}

