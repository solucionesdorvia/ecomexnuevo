import type { ExtractedPriceCandidate, ExtractedText } from "@/lib/analyzeProduct/types";
import { loadDoc, listFromSelectors, textFromSelectors, extractJsonLd, extractImgUrls } from "./shared";

function parseAmazonDynamicImages(html: string) {
  const urls: Array<{ url: string; area: number }> = [];

  // data-a-dynamic-image is embedded in the landing image element.
  // Format: {"https://...jpg":[500,500],"https://...jpg":[1500,1500]}
  const dynMatches = [...html.matchAll(/data-a-dynamic-image=["']([^"']+)["']/gi)].map(
    (m) => m[1]
  );
  for (const raw of dynMatches.slice(0, 4)) {
    const unescaped = String(raw).replace(/&quot;/g, '"');
    try {
      const obj = JSON.parse(unescaped);
      if (obj && typeof obj === "object") {
        for (const [k, v] of Object.entries(obj)) {
          const arr = Array.isArray(v) ? v : [];
          const w = Number(arr[0]);
          const h = Number(arr[1]);
          const area = Number.isFinite(w) && Number.isFinite(h) ? w * h : 0;
          urls.push({ url: k, area });
        }
      }
    } catch {
      // ignore
    }
  }

  // data-old-hires is often present.
  for (const m of html.matchAll(/\bdata-old-hires=["']([^"']+)["']/gi)) {
    const u = String(m[1] ?? "").trim();
    if (u) urls.push({ url: u, area: 2_000_000 });
  }

  // Deduplicate, prefer larger area first.
  const seen = new Set<string>();
  return urls
    .sort((a, b) => b.area - a.area)
    .map((x) => x.url)
    .filter((u) => {
      const k = u.split("?")[0] ?? u;
      if (!k) return false;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

export function extractAmazon(html: string, contentText: string) {
  const $ = loadDoc(html);

  const title = $("#productTitle").text().replace(/\s+/g, " ").trim() || "";

  const bullets = listFromSelectors($, ["#feature-bullets li span.a-list-item"]).filter(
    (x) => !/select\s+to\s+learn\s+more/i.test(x)
  );

  const description = textFromSelectors($, [
    "#productDescription",
    "#aplus",
    "#importantInformation",
    "#detailBullets_feature_div",
  ]);

  const specs: Array<{ label: string; value: string }> = [];

  const pushRow = (k: string, v: string) => {
    const label = String(k || "").replace(/\s+/g, " ").trim();
    const value = String(v || "").replace(/\s+/g, " ").trim();
    if (!label || !value) return;
    if (label.length > 80 || value.length > 200) return;
    specs.push({ label, value });
  };

  $("#productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr").each(
    (_, tr) => {
      const k = $(tr).find("th").first().text();
      const v = $(tr).find("td").first().text();
      pushRow(k, v);
    }
  );

  // detail bullets "Label: Value"
  $("#detailBullets_feature_div li").each((_, li) => {
    const txt = $(li).text().replace(/\s+/g, " ").trim();
    const m = txt.match(/^([^:]{2,60}):\s*(.{2,160})$/);
    if (m?.[1] && m?.[2]) pushRow(m[1], m[2]);
  });

  const images = [
    ...parseAmazonDynamicImages(html),
    ...extractImgUrls(html),
  ];

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
          const a = n.lowPrice ?? n.price;
          const b = n.highPrice ?? n.price;
          priceCandidates.push({
            text: `${a} - ${b}`,
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

  // DOM price areas.
  const corePrice = $("#corePriceDisplay_desktop_feature_div span.a-price").first();
  const coreOffscreen = corePrice.find("span.a-offscreen").first().text().trim();

  // Fallback: split whole/fraction INSIDE the same a-price element.
  const whole = corePrice.find("span.a-price-whole").first().text().trim().replace(/[^\d]/g, "");
  const frac = corePrice.find("span.a-price-fraction").first().text().trim().replace(/[^\d]/g, "");
  const coreJoined =
    whole && frac && /^\d+$/.test(whole) && /^\d{1,2}$/.test(frac) ? `$${whole}.${frac}` : "";

  const buyboxPrice =
    $("#priceblock_ourprice").first().text().trim() ||
    $("#priceblock_dealprice").first().text().trim() ||
    $("#price_inside_buybox").first().text().trim() ||
    "";

  for (const s of [coreOffscreen, coreJoined, buyboxPrice]) {
    const v = String(s || "").trim();
    if (!v) continue;
    priceCandidates.push({ text: v, source: "dom" });
  }

  // IMPORTANT: avoid scanning full page text for "$123" patterns on Amazon.
  // It often contains unrelated numbers (ASIN/ISBN, model numbers, etc.) which harms data quality.

  const text: ExtractedText = {
    title: title || undefined,
    bullets,
    rawDescription: description || contentText || "",
    specs: specs.length ? specs.slice(0, 60) : undefined,
  };

  return { text, images, priceCandidates };
}

