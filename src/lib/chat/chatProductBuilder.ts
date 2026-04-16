/**
 * Standalone product-building and PCRAM-enrichment functions.
 * These are extracted from the chat route to keep the POST handler lean.
 */

import { scrapeProductFromUrl } from "@/lib/scraper/scrapeProductFromUrl";
import {
  extractUrl,
  stripUrlFromText,
  cleanProductTitleFromMixedInput,
} from "./chatParsers";
import {
  isValidNcmCode,
  originFromPurchaseUrl,
  maybeAutoResolveKnownVehicle,
  withTimeout,
} from "./chatInference";
import {
  extractVehicleInferenceFromText,
  vehicleInferenceToHintsText,
} from "@/lib/ai/vehicleExtractor";

type ProductLike = Record<string, unknown>;

export async function buildProductFromInput(inputText: string): Promise<ProductLike> {
  const url = extractUrl(inputText);

  if (url) {
    const hintText = stripUrlFromText(inputText, url);
    const p = await scrapeProductFromUrl(url, { hintText, timeoutMs: 45_000 }) as ProductLike;

    const meta = (p?.raw as ProductLike | undefined)?.ncmMeta as ProductLike | undefined;
    const cands: Array<{ ncmCode: string; title?: string }> = Array.isArray(meta?.pcramCandidates)
      ? meta!.pcramCandidates as Array<{ ncmCode: string; title?: string }>
      : [];

    if (!p?.ncm && cands.length) {
      const pick = cands.find((c) => isValidNcmCode(c?.ncmCode));
      if (pick) {
        p.ncm = pick.ncmCode;
        if ((p.raw as ProductLike | undefined)?.ncmMeta) {
          ((p.raw as ProductLike).ncmMeta as ProductLike).ambiguous = true;
        }
      }
    }

    const inferredOrigin = originFromPurchaseUrl(url);
    if (
      inferredOrigin &&
      (!String(p?.origin ?? "").trim() ||
        /^origen a confirmar$/i.test(String(p?.origin ?? "").trim()))
    ) {
      p.origin = inferredOrigin;
    }

    if (!Number.isFinite(p?.quantity as number) || Number(p?.quantity) <= 0) {
      p.quantity = 1;
    }

    return p;
  }

  const base: ProductLike = { title: cleanProductTitleFromMixedInput(inputText) };

  const vehicleInf = await extractVehicleInferenceFromText(inputText).catch(() => null);
  if (vehicleInf && vehicleInf.kind !== "desconocido") {
    base.raw = { ...((base.raw as ProductLike) ?? {}), vehicleInference: vehicleInf };
  }

  const enrichedText =
    vehicleInf && vehicleInf.confidence >= 0.6
      ? `${inputText}\n\n[HINTS]\n${vehicleInferenceToHintsText(vehicleInf)}`
      : inputText;

  const useNcmMotorInBuild = process.env.NCM_CHAT_USE_MOTOR_IN_BUILD_PRODUCT === "1";

  if (useNcmMotorInBuild) {
    const { runNcmMotor } = await import("@/lib/clasificar-ncm/runNcmMotor");
    const motor = await runNcmMotor({
      text: enrichedText,
      snapshot: { productType: "unknown", status: "idle" },
      prevSnapshot: { productType: "unknown", status: "idle" },
      messages: [],
    }).catch(() => null);

    if (motor) {
      const rawNext: ProductLike = { ...((base.raw as ProductLike) ?? {}) };
      if (motor.engine.mode === "full") {
        const pl = motor.engine.pipeline;
        if (pl.ncmMeta) rawNext.ncmMeta = pl.ncmMeta;
        if (pl.pcram) rawNext.pcram = pl.pcram;
      }
      rawNext.ncmMotor = {
        confidence: motor.confidence,
        alternatives: motor.alternatives,
        ambiguity: motor.ambiguity ?? null,
      };
      base.raw = rawNext;
      if (motor.ncm_code) base.ncm = motor.ncm_code;
    } else {
      const { productFromTextPipeline } = await import("@/lib/scraper/productFromTextPipeline");
      const extra = (await productFromTextPipeline(enrichedText).catch(() => ({}))) as ProductLike;
      if (extra.ncm) base.ncm = extra.ncm;
      if (extra.pcram) base.raw = { ...((base.raw as ProductLike) ?? {}), pcram: extra.pcram };
      if (extra.ncmMeta) base.raw = { ...((base.raw as ProductLike) ?? {}), ncmMeta: extra.ncmMeta };
    }
  } else {
    const { productFromTextPipeline } = await import("@/lib/scraper/productFromTextPipeline");
    const extra = (await productFromTextPipeline(enrichedText).catch(() => ({}))) as ProductLike;
    if (extra.ncm) base.ncm = extra.ncm;
    if (extra.pcram) base.raw = { ...((base.raw as ProductLike) ?? {}), pcram: extra.pcram };
    if (extra.ncmMeta) base.raw = { ...((base.raw as ProductLike) ?? {}), ncmMeta: extra.ncmMeta };
  }

  if (!base.ncm) {
    const meta = (base?.raw as ProductLike | undefined)?.ncmMeta as ProductLike | undefined;
    const cands: Array<{ ncmCode: string; title?: string }> = Array.isArray(meta?.pcramCandidates)
      ? meta!.pcramCandidates as Array<{ ncmCode: string; title?: string }>
      : [];
    const pick = cands.find((c) => isValidNcmCode(c?.ncmCode));
    if (pick) {
      base.ncm = pick.ncmCode;
      if ((base.raw as ProductLike | undefined)?.ncmMeta) {
        ((base.raw as ProductLike).ncmMeta as ProductLike).ambiguous = true;
      }
    }
  }

  maybeAutoResolveKnownVehicle(base);
  return base;
}

export async function ensurePcram(product: ProductLike): Promise<ProductLike> {
  if ((product?.raw as ProductLike | undefined)?.pcram) return product;
  if (!product?.ncm) return product;
  if (!(process.env.PCRAM_USER && process.env.PCRAM_PASS)) return product;

  const { PcramClient } = await import("@/lib/pcram/pcramClient");
  const client = new PcramClient();
  const pcramTimeoutMs = Number(process.env.PCRAM_CALL_TIMEOUT_MS ?? "45000");

  const pcram = await withTimeout(
    client.getDetail(String(product.ncm)),
    pcramTimeoutMs
  ).catch(() => undefined);

  if (pcram) {
    product.raw = { ...((product.raw as ProductLike) ?? {}), pcram };
    if (typeof (pcram as ProductLike)?.ncmCode === "string" && String((pcram as ProductLike).ncmCode).trim()) {
      product.ncm = String((pcram as ProductLike).ncmCode).trim();
    }
  } else {
    product.raw = { ...((product.raw as ProductLike) ?? {}), pcramError: true };
    const ncmMeta = (product.raw as ProductLike)?.ncmMeta as ProductLike | undefined;
    if (ncmMeta) ncmMeta.ambiguous = true;
  }

  return product;
}
