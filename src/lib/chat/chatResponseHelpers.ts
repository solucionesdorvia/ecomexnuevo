/**
 * Response-building helpers: productPreview and analysis objects for the chat API.
 */

import { cleanProductTitleFromMixedInput } from "./chatParsers";

type ProductLike = Record<string, unknown>;

export function buildProductPreview(product: ProductLike) {
  const imgs: string[] = Array.isArray(product?.images)
    ? product.images as string[]
    : Array.isArray((product?.raw as ProductLike | undefined)?.urlAnalysis &&
        ((product.raw as ProductLike).urlAnalysis as ProductLike)?.imageUrls)
      ? ((product.raw as ProductLike).urlAnalysis as ProductLike).imageUrls as string[]
      : [];
  const imageUrls = imgs.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 6);
  const blockedHint = String(
    (product?.raw as ProductLike | undefined)?.urlAnalysis
      ? ((product.raw as ProductLike).urlAnalysis as ProductLike)?.blockedHint
      : ""
  ).trim();
  const showTrafficPlaceholder =
    !imageUrls.length && (blockedHint === "unusual_traffic" || blockedHint === "fetch_failed");
  const sourceUrl =
    typeof product?.url === "string"
      ? product.url
      : typeof product?.sourceUrl === "string"
        ? product.sourceUrl
        : undefined;

  const priceObj = product?.price && typeof product.price === "object"
    ? product.price as ProductLike
    : null;

  return {
    title:
      typeof product?.displayTitle === "string"
        ? product.displayTitle
        : typeof product?.title === "string"
          ? product.title
          : undefined,
    imageUrl: showTrafficPlaceholder ? "/traffic-unusual.png" : imageUrls[0],
    imageUrls: showTrafficPlaceholder
      ? ["/traffic-unusual.png"]
      : imageUrls.length
        ? imageUrls
        : undefined,
    sourceUrl,
    fobUsd: typeof product?.fobUsd === "number" ? product.fobUsd : undefined,
    currency: typeof product?.currency === "string" ? product.currency : undefined,
    price: priceObj
      ? {
          type: String(priceObj.type ?? ""),
          min: typeof priceObj.min === "number" && Number.isFinite(priceObj.min) ? priceObj.min : null,
          max: typeof priceObj.max === "number" && Number.isFinite(priceObj.max) ? priceObj.max : null,
          currency: typeof priceObj.currency === "string" ? priceObj.currency : "",
          unit: typeof priceObj.unit === "string" ? priceObj.unit : "",
        }
      : undefined,
    quantity: typeof product?.quantity === "number" ? product.quantity : undefined,
    origin: typeof product?.origin === "string" ? product.origin : undefined,
    supplier: typeof product?.supplier === "string" ? product.supplier : undefined,
    category:
      typeof product?.displayCategory === "string"
        ? product.displayCategory
        : typeof product?.category === "string"
          ? product.category
          : undefined,
  };
}

export function buildAnalysis(product: ProductLike, userText: string, quoteLike?: ProductLike) {
  const meta = (product?.raw as ProductLike | undefined)?.ncmMeta as ProductLike | undefined;
  const pcram = (product?.raw as ProductLike | undefined)?.pcram as ProductLike | undefined;
  const normalizedTitle = cleanProductTitleFromMixedInput(
    typeof product?.displayTitle === "string" && (product.displayTitle as string).trim()
      ? product.displayTitle as string
      : typeof product?.title === "string" && (product.title as string).trim()
        ? product.title as string
        : userText
  );

  const interventions: string[] = Array.isArray(pcram?.interventions)
    ? (pcram!.interventions as unknown[]).map((x) => String(x || "").trim()).filter(Boolean).slice(0, 18)
    : [];
  const reclassifications: Array<{ label: string; href: string }> = Array.isArray(pcram?.reclassifications)
    ? (pcram!.reclassifications as ProductLike[])
        .map((x) => ({ label: String(x?.label ?? "").trim(), href: String(x?.href ?? "").trim() }))
        .filter((x) => x.label && x.href)
        .slice(0, 12)
    : [];

  const ncmCode = typeof product?.ncm === "string" ? (product.ncm as string).trim() : "";
  const ncmMetaConfidence =
    typeof meta?.confidence === "number" && Number.isFinite(meta.confidence)
      ? meta.confidence as number
      : null;

  const flags: string[] = [];
  if (!ncmCode || ncmCode === "9999.99.99") flags.push("ncm_missing");
  if (meta?.ambiguous === true) flags.push("ncm_ambiguous");
  if ((product?.raw as ProductLike | undefined)?.pcramError === true) flags.push("pcram_unavailable");
  if (!interventions.length) flags.push("requirements_unknown");

  const totalMinUsd =
    typeof (quoteLike?.breakdown as ProductLike | undefined)?.totalMinUsd === "number"
      ? (quoteLike!.breakdown as ProductLike).totalMinUsd as number
      : null;
  const totalMaxUsd =
    typeof (quoteLike?.breakdown as ProductLike | undefined)?.totalMaxUsd === "number"
      ? (quoteLike!.breakdown as ProductLike).totalMaxUsd as number
      : null;

  return {
    stage: "quoted",
    normalizedTitle: normalizedTitle || undefined,
    ncm: ncmCode && ncmCode !== "9999.99.99" ? ncmCode : undefined,
    ncmMeta: {
      source: typeof meta?.source === "string" ? meta.source : undefined,
      confidence: ncmMetaConfidence,
      ambiguous: meta?.ambiguous === true ? true : undefined,
    },
    pcram: pcram
      ? {
          title: typeof pcram?.title === "string" ? pcram.title : undefined,
          breadcrumbs: Array.isArray(pcram?.breadcrumbs)
            ? (pcram.breadcrumbs as unknown[]).map(String).filter(Boolean).slice(0, 10)
            : undefined,
          unit: typeof pcram?.unit === "string" ? pcram.unit : undefined,
          interventions,
          reclassifications,
        }
      : undefined,
    timing: { route: "maritime", minDays: 35, maxDays: 55 },
    totals: totalMinUsd != null && totalMaxUsd != null ? { totalMinUsd, totalMaxUsd } : undefined,
    flags: flags.length ? flags : undefined,
    quality:
      typeof quoteLike?.quality === "number" && Number.isFinite(quoteLike.quality)
        ? quoteLike.quality as number
        : undefined,
  };
}
