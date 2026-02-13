import { productFromTextPipeline, type TextPipelineResult } from "@/lib/scraper/productFromTextPipeline";
import { buildNormalizedDescription } from "@/lib/analyzeProduct/normalize";
import { normalizeAndFilterImages } from "@/lib/analyzeProduct/images";
import { chooseBestPrice } from "@/lib/analyzeProduct/price";
import { detectSource } from "@/lib/analyzeProduct/sourceDetect";
import { fetchPageWithPlaywright, metaFromHtml, withRetries } from "@/lib/analyzeProduct/playwright";
import { extractBySource } from "@/lib/analyzeProduct/sources";
import type { AnalyzeProductOutput, SupportedSource } from "@/lib/analyzeProduct/types";

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function safeText(s: unknown, max = 50_000) {
  const t = String(s ?? "").replace(/\u0000/g, "").trim();
  return t.length > max ? t.slice(0, max) : t;
}

export async function analyzeProductUrl(urlInput: string): Promise<AnalyzeProductOutput> {
  const source = detectSource(urlInput);
  if (!source) {
    throw new Error("Fuente no soportada. MVP soporta: Alibaba, 1688, Amazon.");
  }

  const loaded = await withRetries(
    () => fetchPageWithPlaywright(urlInput, { timeoutMs: 40_000 }),
    2
  );

  const url = loaded.finalUrl || urlInput;
  const html = loaded.html || "";
  const contentText = safeText(loaded.contentText || "", 60_000);

  const meta = html ? metaFromHtml(html) : undefined;

  const extracted = extractBySource(source as SupportedSource, html, contentText);
  const title =
    safeText(extracted.text.title || "", 500) ||
    safeText(meta?.ogTitle || meta?.twitterTitle || "", 500) ||
    "";

  const rawDesc =
    safeText(extracted.text.rawDescription || "", 60_000) ||
    safeText(meta?.ogDescription || meta?.description || "", 20_000) ||
    contentText ||
    "";

  const bullets = Array.isArray(extracted.text.bullets)
    ? extracted.text.bullets.map((x) => safeText(x, 400)).filter(Boolean).slice(0, 40)
    : [];
  const specs = Array.isArray(extracted.text.specs) ? extracted.text.specs.slice(0, 60) : [];

  const normalized_description = buildNormalizedDescription({
    title,
    rawDescription: rawDesc,
    bullets,
    specs,
  });

  // Images: prefer extracted images (source-specific), then OG image.
  const imageCandidates = [
    ...(Array.isArray(extracted.images) ? extracted.images : []),
    meta?.ogImage,
  ].filter(Boolean) as string[];

  const images = normalizeAndFilterImages(imageCandidates, url);

  // Price: candidates from extractor + meta tags.
  const priceCandidates = [
    ...(Array.isArray(extracted.priceCandidates) ? extracted.priceCandidates : []),
    ...(meta?.productPriceAmount
      ? [
          {
            text: meta.productPriceAmount,
            hintCurrency: meta.productPriceCurrency,
            source: "meta" as const,
          },
        ]
      : []),
  ];
  const price = chooseBestPrice(priceCandidates);

  // NCM classification integrates ONLY normalized text (no hardcoded NCMs).
  const cls: TextPipelineResult = normalized_description
    ? await productFromTextPipeline(normalized_description).catch(() => ({} as TextPipelineResult))
    : ({} as TextPipelineResult);

  const ncm = typeof cls.ncm === "string" ? cls.ncm : "";
  const metaConf = typeof cls.ncmMeta?.confidence === "number" ? cls.ncmMeta.confidence : 0;

  const cand: Array<{ ncmCode: string; title?: string }> = [];
  const add = (arr?: Array<{ ncmCode: string; title?: string }>) => {
    if (!Array.isArray(arr)) return;
    for (const c of arr) {
      const code = typeof c?.ncmCode === "string" ? c.ncmCode : "";
      if (!code) continue;
      cand.push({ ncmCode: code, title: c?.title });
      if (cand.length >= 10) break;
    }
  };
  add(cls.ncmMeta?.pcramCandidates);
  if (cand.length < 10) add(cls.ncmMeta?.localCandidates);

  const output: AnalyzeProductOutput = {
    source,
    url,
    product: {
      title: title || "",
      raw_description: rawDesc || "",
      normalized_description: normalized_description || "",
      price,
      images,
    },
    classification: {
      ncm: ncm || "",
      confidence: clamp01(metaConf),
      candidates: cand,
    },
  };

  return output;
}

