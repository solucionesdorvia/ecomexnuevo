import "dotenv/config";

import type { QuoteCard } from "@/lib/quote/calcImportQuote";
import { openaiJson } from "@/lib/ai/openaiClient";
import fs from "node:fs";
import path from "node:path";

type QuoteLike = {
  id: string;
  createdAt: Date;
  userText: string;
  productJson: any;
  quoteJson: any;
  totalMinUsd: number | null;
  totalMaxUsd: number | null;
  mode: string;
};

function fmtMonthYear(d: Date) {
  try {
    return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" })
      .format(d)
      .replace(/^\w/, (c) => c.toUpperCase());
  } catch {
    return d.toISOString().slice(0, 7);
  }
}

function fmtUsdEs(n: number) {
  // "USD 18.919,12"
  const s = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `USD ${s}`;
}

function safeStr(x: unknown) {
  return String(x ?? "").trim();
}

let cachedUnusualTrafficDataUrl: string | null = null;
function unusualTrafficDataUrl() {
  if (cachedUnusualTrafficDataUrl != null) return cachedUnusualTrafficDataUrl;
  try {
    const p = path.join(process.cwd(), "public", "unusual-traffic.png");
    const bytes = fs.readFileSync(p);
    cachedUnusualTrafficDataUrl = `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    cachedUnusualTrafficDataUrl = "";
  }
  return cachedUnusualTrafficDataUrl;
}

function cleanLabel(s: unknown, maxLen: number) {
  const t = String(s ?? "")
    .replace(/\s+/g, " ")
    .replace(/https?:\/\/\S+/gi, "")
    .trim();
  if (!t) return "";
  const out = t.length <= maxLen ? t : `${t.slice(0, maxLen - 1).trim()}…`;
  return out;
}

async function ensurePdfDisplayFields(quote: QuoteLike): Promise<QuoteLike> {
  const p: any = quote.productJson ?? {};
  const hasTitle = typeof p?.displayTitle === "string" && p.displayTitle.trim();
  const hasCat = typeof p?.displayCategory === "string" && p.displayCategory.trim();
  if (hasTitle && hasCat) return quote;
  if (!process.env.OPENAI_API_KEY) return quote;

  // Only analyze for PDF display; never change numeric fields/calc.
  const url = typeof p?.url === "string" ? p.url : "";
  const title = safeStr(p?.title);
  const description = safeStr(p?.description);
  const categoryRaw = safeStr(p?.category);
  const userText = safeStr(quote.userText);

  const system = [
    "Sos un analista de productos para importación.",
    "Devuelve SOLO JSON válido.",
    "",
    "Objetivo:",
    "- Elegir un nombre corto y limpio para el PDF (displayTitle) y un rubro (displayCategory).",
    "",
    "Reglas críticas:",
    "- NO inventes: si no se infiere con evidencia del título/descripción/categoría/texto, devolvé null.",
    "- No uses IDs, 'product detail', '.html', ni texto de tracking.",
    "- displayTitle: máx 64 caracteres.",
    "- displayCategory: máx 40 caracteres, en español, rubro general (ej: 'Elevadores', 'Maquinaria', 'Electrónica').",
  ].join("\n");

  const user = [
    url ? `URL: ${url}` : "",
    title ? `TITLE: ${title}` : "",
    description ? `DESCRIPTION: ${description}` : "",
    categoryRaw ? `CATEGORY_RAW: ${categoryRaw}` : "",
    userText ? `USER_TEXT: ${userText}` : "",
    "",
    "Respondé JSON con keys: displayTitle, displayCategory.",
  ]
    .filter(Boolean)
    .join("\n");

  const out = await openaiJson<{ displayTitle?: string | null; displayCategory?: string | null }>({
    system,
    user,
    timeoutMs: 8000,
  }).catch(() => null);

  if (!out) return quote;

  const displayTitle = cleanLabel(out.displayTitle, 64);
  const displayCategory = cleanLabel(out.displayCategory, 40);
  if (!displayTitle && !displayCategory) return quote;

  const nextProduct: any = { ...p };
  if (displayTitle && !hasTitle) nextProduct.displayTitle = displayTitle;
  if (displayCategory && !hasCat) nextProduct.displayCategory = displayCategory;

  return { ...quote, productJson: nextProduct };
}

function htmlEscape(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function pickCards(quoteJson: any): QuoteCard[] {
  return Array.isArray(quoteJson?.cards) ? (quoteJson.cards as QuoteCard[]) : [];
}

function parseMoneyRangeUsd(value: string) {
  // "$13,500.00 – $16,500.00" or "Marítimo: 35–55 días"
  const t = String(value || "");
  const m = t.match(/\$([0-9,]+(?:\.[0-9]+)?)\s*[–-]\s*\$([0-9,]+(?:\.[0-9]+)?)/);
  if (!m) return null;
  const a = Number(m[1].replaceAll(",", ""));
  const b = Number(m[2].replaceAll(",", ""));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { min: a, max: b };
}

function deriveCostsFromQuote(quote: QuoteLike) {
  const product = quote.productJson ?? {};
  const qty = Math.max(1, Math.floor(Number(product?.quantity ?? 1) || 1));
  const fobUnit = Number(product?.fobUsd ?? 0) || null;
  const fobTotal = fobUnit != null ? fobUnit * qty : null;

  const cards = pickCards(quote.quoteJson);
  const fleteRange = cards.find((c) => c.label === "Flete internacional")?.value;
  const impuestosRange = cards.find((c) => c.label === "Impuestos argentinos")?.value;
  const gestionRange = cards.find((c) => c.label === "Gestión / despacho")?.value;
  const totalRange = cards.find((c) => c.label === "Total puesto en Argentina")?.value;

  const flete = fleteRange ? parseMoneyRangeUsd(fleteRange)?.min ?? null : null;
  const impuestos = impuestosRange ? parseMoneyRangeUsd(impuestosRange)?.min ?? null : null;
  const gestion = gestionRange ? parseMoneyRangeUsd(gestionRange)?.min ?? null : null;
  const total = totalRange ? parseMoneyRangeUsd(totalRange)?.min ?? null : null;

  const breakdown: any = (quote.quoteJson as any)?.breakdown ?? null;

  // Operator budgets may inject explicit fields (already in USD).
  const operatorTributosUsd =
    breakdown && typeof breakdown.tributosUsd === "number" ? breakdown.tributosUsd : null;
  const operatorIvaUsd =
    breakdown && typeof breakdown.ivaUsd === "number" ? breakdown.ivaUsd : null;
  const operatorTotalToPayUsd =
    breakdown && typeof breakdown.totalToPayUsd === "number" ? breakdown.totalToPayUsd : null;
  const operatorFobUsd = breakdown && typeof breakdown.fobUsd === "number" ? breakdown.fobUsd : null;
  const operatorFleteUsd =
    breakdown && typeof breakdown.fleteUsd === "number" ? breakdown.fleteUsd : null;
  const operatorSeguroUsd =
    breakdown && typeof breakdown.seguroUsd === "number" ? breakdown.seguroUsd : null;
  const operatorHonorariosUsd =
    breakdown && typeof breakdown.honorariosUsd === "number" ? breakdown.honorariosUsd : null;
  const operatorDepositoUsd =
    breakdown && typeof breakdown.depositoUsd === "number" ? breakdown.depositoUsd : null;
  const operatorTransporteNacUsd =
    breakdown && typeof breakdown.transporteNacionalUsd === "number"
      ? breakdown.transporteNacionalUsd
      : null;
  const operatorTransferenciaUsd =
    breakdown && typeof breakdown.transferenciaIntlUsd === "number"
      ? breakdown.transferenciaIntlUsd
      : null;
  const operatorArancelSimUsd =
    breakdown && typeof breakdown.arancelSimUsd === "number" ? breakdown.arancelSimUsd : null;
  const operatorTaxLines = Array.isArray(breakdown?.taxLines) ? breakdown.taxLines : null;

  // Prefer server-calculated breakdown (keeps PDF aligned with quote logic).
  const seguro =
    typeof breakdown?.seguroMinUsd === "number"
      ? breakdown.seguroMinUsd
      : fobTotal != null
        ? fobTotal * 0.01
        : null;

  // Split "gestión" into components to match the template layout.
  // (Best-effort; we keep the sum equal to gestión when available.)
  let honorarios = null as number | null;
  let deposito = null as number | null;
  let transporteNac = null as number | null;
  let transferencia = null as number | null;
  if (
    breakdown &&
    typeof breakdown.honorariosMinUsd === "number" &&
    typeof breakdown.depositoPortuarioMinUsd === "number" &&
    typeof breakdown.transporteNacionalMinUsd === "number" &&
    typeof breakdown.transferenciaIntlMinUsd === "number"
  ) {
    honorarios = breakdown.honorariosMinUsd;
    deposito = breakdown.depositoPortuarioMinUsd;
    transporteNac = breakdown.transporteNacionalMinUsd;
    transferencia = breakdown.transferenciaIntlMinUsd;
  } else if (gestion != null) {
    honorarios = Math.max(150, Math.min(gestion * 0.45, 700));
    deposito = Math.max(80, Math.min(gestion * 0.35, 1800));
    transporteNac = Math.max(50, Math.min(gestion * 0.15, 1000));
    transferencia = Math.max(30, gestion - honorarios - deposito - transporteNac);
  }

  return {
    qty,
    fobUnit,
    fobTotal: operatorFobUsd ?? fobTotal,
    flete: operatorFleteUsd ?? flete,
    seguro: operatorSeguroUsd ?? seguro,
    impuestos: operatorTributosUsd ?? impuestos,
    honorarios: operatorHonorariosUsd ?? honorarios,
    deposito: operatorDepositoUsd ?? deposito,
    transporteNac: operatorTransporteNacUsd ?? transporteNac,
    transferencia: operatorTransferenciaUsd ?? transferencia,
    total,
    iva: operatorIvaUsd,
    totalToPay: operatorTotalToPayUsd ?? total,
    items: Array.isArray(breakdown?.items) ? breakdown.items : null,
    arancelSimUsd: operatorArancelSimUsd,
    taxLines: operatorTaxLines,
  };
}

function renderProductImages(product: any) {
  const operatorImg = safeStr(product?.raw?.operatorImageDataUrl);
  if (operatorImg) {
    return `<img class="product-image product-image--large" src="${htmlEscape(
      operatorImg
    )}" alt="Imagen producto"/>`;
  }
  const imgs: string[] = Array.isArray(product?.images) ? product.images : [];
  const title = safeStr(product?.title) || "Producto";
  const blocked =
    Boolean(product?.raw?.urlAnalysis?.blocked) ||
    Boolean(product?.raw?.urlAnalysis?.fetchFailed) ||
    Boolean(product?.raw?.scrapeFailed);
  const placeholder = blocked ? unusualTrafficDataUrl() : "";
  const blocks = [imgs[0], imgs[1]].map((src, idx) => {
    const finalSrc = src || (idx === 0 ? placeholder : "");
    if (finalSrc) {
      return `<img class="product-image" src="${htmlEscape(finalSrc)}" alt="Imagen producto ${idx + 1}"/>`;
    }
    return `<div class="product-image-placeholder">[Imagen Producto ${idx + 1}]<br>${htmlEscape(
      title
    )}</div>`;
  });
  return blocks.join("\n");
}

function looksSpecificRubro(s: string) {
  const t = safeStr(s);
  if (!t) return false;
  const low = t.toLowerCase();
  if (
    low === "general" ||
    low === "presupuesto" ||
    low.includes("a clasificar") ||
    low.includes("a confirmar") ||
    low.startsWith("producto desde")
  ) {
    return false;
  }
  // Avoid tiny/meaningless categories.
  if (t.length < 4) return false;
  // Must contain at least one letter.
  if (!/[a-záéíóúñ]/i.test(t)) return false;
  return true;
}

function shortLine(s: string, max = 80) {
  const t = safeStr(s).replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max - 1).trim()}…`;
}

function deriveProductoAndRubro(quote: QuoteLike) {
  const product = quote.productJson ?? {};
  const urlAnalysis = product?.raw?.urlAnalysis;
  const scrapeOk = urlAnalysis && urlAnalysis.fetchFailed === false;

  const producto =
    shortLine(
      safeStr(product?.displayTitle) || safeStr(product?.title) || safeStr(quote.userText) || "Producto",
      64
    ) ||
    "Producto";

  const displayCategory = safeStr(product?.displayCategory);
  if (looksSpecificRubro(displayCategory)) {
    return { producto, rubro: shortLine(displayCategory, 42) };
  }

  // Rubro must be truthful: only show if it comes from reliable scraped/official signals.
  // Priority:
  // 1) Scraped category (only if the URL fetch didn't fail)
  // 2) PCRAM ramo/breadcrumbs when classification is not ambiguous and confidence is decent
  // 3) A confirmar
  const category = safeStr(product?.category);
  if (scrapeOk && looksSpecificRubro(category)) {
    return { producto, rubro: shortLine(category, 42) };
  }

  const pcram = product?.raw?.pcram;
  const ncmMeta = product?.raw?.ncmMeta;
  const conf = typeof ncmMeta?.confidence === "number" ? ncmMeta.confidence : null;
  const ambiguous = Boolean(ncmMeta?.ambiguous);
  const confident = conf != null ? conf >= 0.75 : false;

  if (!ambiguous && confident) {
    const ramo = safeStr(pcram?.ramo);
    if (looksSpecificRubro(ramo)) return { producto, rubro: shortLine(ramo, 42) };
    const crumbs: string[] = Array.isArray(pcram?.breadcrumbs) ? pcram.breadcrumbs : [];
    const crumb0 = safeStr(crumbs[0]);
    if (looksSpecificRubro(crumb0)) return { producto, rubro: shortLine(crumb0, 42) };
  }

  return { producto, rubro: quote.mode === "budget" ? "Presupuesto" : "General" };
}

export function renderQuotePdfHtml(quote: QuoteLike) {
  const product = quote.productJson ?? {};
  const derived = deriveProductoAndRubro(quote);
  const title = derived.producto;
  const rubro = derived.rubro;
  const productos = title;

  const costs = deriveCostsFromQuote(quote);

  const date = fmtMonthYear(quote.createdAt);

  const totalToShow = costs.total ?? quote.totalMinUsd ?? null;
  const totalToPay = (costs as any).totalToPay ?? totalToShow;
  const ivaToShow = (costs as any).iva ?? null;
  const fobLabel = quote.mode === "budget" ? "EXW" : "FOB";

  // Código NCM real (se muestra en la plantilla como "9506.91.00.139W").
  const productRaw = (quote.productJson ?? {}) as {
    ncm?: unknown;
    raw?: { ncm?: unknown; pcram?: { title?: unknown } };
  };
  const rawNcm = safeStr(productRaw?.ncm) || safeStr(productRaw?.raw?.ncm);
  const classificationDesc =
    safeStr(productRaw?.raw?.pcram?.title) ||
    "Clasificación aduanera estimada internamente. Se valida con datos técnicos, origen, uso y requisitos antes de operar.";
  const classificationCode = rawNcm && rawNcm !== "9999.99.99" ? rawNcm : "—";

  const items: any[] = Array.isArray((costs as any).items) ? ((costs as any).items as any[]) : [];
  const hasItems = items.length > 0;
  const fmtMaybe = (n: any) => (typeof n === "number" && Number.isFinite(n) ? fmtUsdEs(n) : "—");
  const taxLines: Array<{ label: string; amountUsd: number }> = Array.isArray((costs as any).taxLines)
    ? ((costs as any).taxLines as any[])
    : [];
  const taxMap = new Map<string, number>();
  for (const tl of taxLines) {
    const label = safeStr((tl as any)?.label);
    const amt = (tl as any)?.amountUsd;
    if (label && typeof amt === "number" && Number.isFinite(amt)) taxMap.set(label, amt);
  }
  const showTax = (label: string) => {
    const amt = taxMap.get(label);
    return amt != null ? fmtUsdEs(amt) : "Incluido";
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cotización E-Comex</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --ecomex-blue: #1B3464;
      --ecomex-light-blue: #264D8C;
      --ecomex-gray: #D8DCE3;
      --ecomex-red: #e53e3e;
      --text-dark: #1a202c;
      --text-light: #718096;
    }
    body { font-family: 'Montserrat', sans-serif; color: var(--ecomex-blue); background: #f0f0f0; }
    .page {
      width: 297mm;
      height: 210mm;
      padding: 15mm 20mm;
      position: relative;
      page-break-after: always;
      background: white;
      margin: 20px auto;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .page:last-child { page-break-after: auto; }
    .page-cover { display:flex; flex-direction:column; justify-content:center; align-items:center; position:relative; overflow:hidden; background:#fff; }

    /* ── Left geometric decoration (grey background + navy arrow) ── */
    .cover-left-deco { position:absolute; left:0; top:0; width:42%; height:100%; overflow:hidden; pointer-events:none; }
    .cover-left-deco .grey-layer {
      position:absolute; left:-50px; top:-5%; width:100%; height:110%;
      background:#DDE1E8;
      clip-path: polygon(0 0, 78% 0, 90% 100%, 0 100%);
    }
    .cover-left-deco .navy-layer {
      position:absolute; left:12px; top:17%; width:84%; height:66%;
      background: var(--ecomex-blue);
      clip-path: polygon(0 0, 58% 0, 100% 50%, 58% 100%, 0 100%);
    }

    /* ── Right capsule decoration ── */
    .cover-decoration { position:absolute; top:0; right:0; width:48%; height:100%; overflow:hidden; pointer-events:none; }
    .cover-decoration .shape { position:absolute; background: var(--ecomex-gray); opacity: 0.55; border-radius: 50px; }
    .cover-decoration .shape-1 { width: 155px; height: 44px; top: 38px; right: 270px; }
    .cover-decoration .shape-2 { width: 100px; height: 44px; top: 38px; right: 95px; }
    .cover-decoration .shape-3 { width: 75px; height: 36px; top: 100px; right: 195px; }
    .cover-decoration .shape-4 { width: 130px; height: 40px; top: 100px; right: 35px; }
    .cover-decoration .shape-5 { width: 175px; height: 48px; top: 162px; right: 215px; }
    .cover-decoration .shape-6 { width: 85px; height: 42px; top: 162px; right: 22px; }
    .cover-decoration .shape-7 { width: 110px; height: 44px; top: 224px; right: 130px; }
    .cover-decoration .shape-8 { width: 60px; height: 38px; top: 286px; right: 80px; }

    .cover-content { text-align:center; z-index:10; margin-left: 50px; }
    .cover-content h1 { font-size: 44px; font-weight: 700; color: var(--ecomex-blue); margin-bottom: 14px; }
    .cover-content h2 { font-size: 28px; font-weight: 500; color: var(--ecomex-blue); margin-bottom: 54px; }
    .cover-content .date { font-size: 17px; font-weight: 600; color: var(--ecomex-blue); }
    .cover-logo { position:absolute; bottom: 22mm; right: 26mm; z-index:10; }
    .logo { display:flex; align-items:center; gap:10px; }
    .logo-icon { display:flex; flex-direction:column; gap:5px; }
    .logo-icon span { height:5px; background: var(--ecomex-blue); border-radius:3px; display:block; }
    .logo-icon span:nth-child(1){ width:32px; } .logo-icon span:nth-child(2){ width:26px; } .logo-icon span:nth-child(3){ width:32px; }
    .logo-text { font-size: 34px; font-weight: 700; color: var(--ecomex-blue); letter-spacing: 0.5px; }
    .cover-footer { position:absolute; bottom:0; left:0; right:0; background: var(--ecomex-blue); color:white; padding: 11px 22mm; display:flex; justify-content:space-between; align-items:center; font-size: 11px; z-index:20; }
    .cover-footer-item { display:flex; align-items:center; gap:7px; }

    .page-detail { display:flex; flex-direction:column; }
    .detail-header { display:flex; justify-content:space-between; align-items:center; border-bottom: 2px dashed #BFC5D0; padding-bottom: 10px; margin-bottom: 14px; }
    .detail-header-left { display:flex; gap:55px; }
    .detail-header .rubro { font-size: 14px; font-weight: 600; }
    .detail-header .rubro strong { color: var(--ecomex-blue); }
    .detail-header .rubro em { font-style: normal; font-weight: 400; color: var(--ecomex-light-blue); }
    .header-logo { display:flex; align-items:center; gap:7px; }
    .header-logo .logo-icon span { height: 4px; display:block; background: var(--ecomex-blue); border-radius:2px; }
    .header-logo .logo-icon span:nth-child(1){ width:22px; } .header-logo .logo-icon span:nth-child(2){ width:17px; } .header-logo .logo-icon span:nth-child(3){ width:22px; }
    .header-logo .logo-icon { display:flex; flex-direction:column; gap:4px; }
    .header-logo .logo-text { font-size: 23px; font-weight: 700; color: var(--ecomex-blue); }

    .detail-body { display:flex; gap:25px; flex:1; }
    .detail-images { flex:0.9; display:flex; flex-direction:column; gap:15px; }
    .product-image { width:100%; max-width:260px; height:180px; object-fit:contain; border:1px solid var(--ecomex-gray); border-radius:8px; padding:10px; background:#fafafa; }
    .product-image--large { max-width:260px; height:375px; object-fit:contain; }
    .product-image-placeholder { width:100%; max-width:260px; height:180px; border:2px dashed var(--ecomex-gray); border-radius:8px; display:flex; align-items:center; justify-content:center; color: var(--text-light); font-size:12px; background:#fafafa; text-align:center; padding: 8px; }
    .image-disclaimer { font-size: 10px; color: var(--text-light); font-style: italic; margin-top: 10px; max-width: 260px; }

    .detail-info { flex: 1.1; border-left: 3px solid var(--ecomex-blue); padding-left: 22px; }
    .product-title { font-size: 18px; font-weight: 600; color: var(--ecomex-blue); margin-bottom: 10px; }
    .ncm-description { font-size: 10.5px; color: var(--text-light); margin-bottom: 6px; line-height: 1.55; }
    .ncm-code { font-size: 13px; font-weight: 700; color: var(--ecomex-blue); margin-bottom: 16px; }

    .cost-breakdown { font-size: 13px; }
    .cost-item { display:flex; justify-content:space-between; align-items:baseline; padding: 4px 0; }
    .cost-item.main { font-weight: 500; color: var(--ecomex-blue); }
    .cost-item.sub { padding-left: 14px; font-size: 11.5px; color: var(--ecomex-light-blue); }
    .cost-item.sub .label::before { content: "• "; color: var(--ecomex-blue); }
    .cost-item.iva-highlight { color: var(--ecomex-red); font-weight: 500; }
    .cost-item.total { font-weight: 700; font-size: 15px; border-top: 2px solid var(--ecomex-blue); margin-top: 10px; padding-top: 8px; color: var(--ecomex-blue); }
    .cost-item.iva-total { color: var(--ecomex-red); font-weight: 700; font-size: 14px; }
    .cost-item.grand-total { font-weight: 700; font-size: 15px; color: var(--ecomex-blue); }
    .cost-item .blue-mark { color: var(--ecomex-red); font-weight: 700; margin-left: 2px; }
    .blue-footnote { font-size: 10px; color: var(--text-light); margin-top: 10px; font-style: italic; }

    .page-items { display:flex; flex-direction:column; }
    .items-table { width:100%; border-collapse: collapse; font-size: 11px; margin-top: 15px; }
    .items-table th { background: var(--ecomex-blue); color:white; padding: 10px 12px; text-align:left; font-weight:600; font-size: 11px; }
    .items-table th:not(:first-child) { text-align:right; }
    .items-table td { padding: 8px 12px; border-bottom: 1px solid var(--ecomex-gray); }
    .items-table td:not(:first-child) { text-align:right; }
    .items-table tr:nth-child(even) { background: #f8fafc; }
    .items-table tr.total-row { background: var(--ecomex-blue); color:white; font-weight:700; }
    .items-table tr.total-row td { border-bottom:none; padding: 12px; }

    .page-observations { display:flex; flex-direction:column; }
    .observations-title { font-size: 16px; font-weight: 700; color: var(--ecomex-blue); text-decoration: underline; margin-bottom: 25px; margin-top: 50px; }
    .observations-content { font-size: 13px; line-height: 2; color: var(--text-dark); }
    .observations-content p { margin-bottom: 12px; }
    .observations-content strong { color: var(--ecomex-blue); }

    /* ==================== PRINT STYLES ==================== */
    @media print {
      body { background: white; }
      .page {
        margin: 0;
        box-shadow: none;
        page-break-after: always;
      }
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }

    @page { size: A4 landscape; margin: 0; }
  </style>
</head>
<body>
  <div class="page page-cover">
    <!-- Left geometric decoration -->
    <div class="cover-left-deco">
      <div class="grey-layer"></div>
      <div class="navy-layer"></div>
    </div>

    <!-- Right capsule decoration -->
    <div class="cover-decoration">
      <div class="shape shape-1"></div>
      <div class="shape shape-2"></div>
      <div class="shape shape-3"></div>
      <div class="shape shape-4"></div>
      <div class="shape shape-5"></div>
      <div class="shape shape-6"></div>
      <div class="shape shape-7"></div>
      <div class="shape shape-8"></div>
    </div>

    <div class="cover-content">
      <h1>Rubro: ${htmlEscape(rubro)}</h1>
      <h2>Producto: ${htmlEscape(productos)}</h2>
      <p class="date">${htmlEscape(date)}</p>
    </div>

    <div class="cover-logo">
      <div class="logo">
        <div class="logo-icon">
          <span></span><span></span><span></span>
        </div>
        <div class="logo-text">E-COMEX</div>
      </div>
    </div>

    <div class="cover-footer">
      <div class="cover-footer-item">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white" style="flex-shrink:0"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>
        <span>+54 9 11 5353 0536</span>
      </div>
      <div class="cover-footer-item">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="flex-shrink:0"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        <span>info@e-comex.com.ar</span>
      </div>
      <div class="cover-footer-item">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        <span>www.e-comex.com.ar</span>
      </div>
      <div class="cover-footer-item">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="flex-shrink:0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <span>Av. Pte. Julio A. Roca 771, 6° Piso — CABA</span>
      </div>
    </div>
  </div>

  <div class="page page-detail">
    <div class="detail-header">
      <div class="detail-header-left">
        <div class="rubro"><strong>Rubro:</strong> <em>${htmlEscape(rubro)}</em></div>
        <div class="rubro"><strong>Productos:</strong> <em>${htmlEscape(productos)}</em></div>
      </div>
      <div class="header-logo">
        <div class="logo-icon"><span></span><span></span><span></span></div>
        <div class="logo-text">E-COMEX</div>
      </div>
    </div>

    <div class="detail-body">
      <div class="detail-images">
        ${renderProductImages(product)}
        <p class="image-disclaimer">Las imágenes pueden diferir levemente respecto del producto final.</p>
      </div>

      <div class="detail-info">
        <h2 class="product-title">${htmlEscape(title)}</h2>

        <div class="ncm-description">${htmlEscape(classificationDesc)}</div>
        <div class="ncm-code">${htmlEscape(classificationCode)}</div>

        <div class="cost-breakdown">
          <div class="cost-item main"><span class="label">${htmlEscape(fobLabel)}<span class="blue-mark">*</span>:</span><span class="value">${costs.fobTotal != null ? fmtUsdEs(costs.fobTotal) : "—"}</span></div>
          <div class="cost-item main"><span class="label">Flete marítimo internacional:</span><span class="value">${costs.flete != null ? fmtUsdEs(costs.flete) : "—"}</span></div>
          <div class="cost-item main"><span class="label">Seguro internacional:</span><span class="value">${costs.seguro != null ? fmtUsdEs(costs.seguro) : "—"}</span></div>
          <div class="cost-item main"><span class="label">Tributos aduaneros a pagar:</span><span class="value">${costs.impuestos != null ? fmtUsdEs(costs.impuestos) : "—"}</span></div>
          <div class="cost-item sub"><span class="label">Derechos de importación (35%):</span><span class="value">${showTax("Derechos")}</span></div>
          <div class="cost-item sub"><span class="label">Tasa de Estadística (3%):</span><span class="value">${showTax("Tasa de Estadistica")}</span></div>
          <div class="cost-item sub iva-highlight"><span class="label">I.V.A. (21%):</span><span class="value">${showTax("IVA")}</span></div>
          <div class="cost-item sub"><span class="label">IVA Adicional:</span><span class="value">${showTax("IVA Adicional")}</span></div>
          <div class="cost-item sub"><span class="label">Impuesto a las Ganancias:</span><span class="value">${showTax("Impuesto a las Ganancias")}</span></div>
          <div class="cost-item sub"><span class="label">II.BB.:</span><span class="value">${showTax("IIBB")}</span></div>
          <div class="cost-item main"><span class="label">Arancel SIM:</span><span class="value">${
            (costs as any).arancelSimUsd != null ? fmtUsdEs((costs as any).arancelSimUsd) : showTax("Tasa SIM")
          }</span></div>
          <div class="cost-item main"><span class="label">Honorarios:</span><span class="value">${costs.honorarios != null ? fmtUsdEs(costs.honorarios) : "—"}</span></div>
          <div class="cost-item main"><span class="label">Gastos de depósito y portuarios:</span><span class="value">${costs.deposito != null ? fmtUsdEs(costs.deposito) : "—"}</span></div>
          <div class="cost-item main"><span class="label">Gastos transporte nacional:</span><span class="value">${costs.transporteNac != null ? fmtUsdEs(costs.transporteNac) : "—"}</span></div>
          <div class="cost-item main"><span class="label">Gastos transferencia intl<span class="blue-mark">*</span>:</span><span class="value">${costs.transferencia != null ? fmtUsdEs(costs.transferencia) : "—"}</span></div>
          <div class="cost-item total"><span class="label">TOTAL:</span><span class="value">${totalToShow != null ? fmtUsdEs(totalToShow) : "—"}</span></div>
          <div class="cost-item iva-total"><span class="label">IVA:</span><span class="value">${ivaToShow != null ? fmtUsdEs(ivaToShow) : "—"}</span></div>
          <div class="cost-item grand-total"><span class="label">TOTAL A PAGAR:</span><span class="value">${totalToPay != null ? fmtUsdEs(totalToPay) : "—"}</span></div>
        </div>
        <p class="blue-footnote"><span class="blue-mark">*</span> Ítems a tipo de cambio informal (blue).</p>
      </div>
    </div>
  </div>

  <div class="page page-items">
    <div class="detail-header">
      <div class="detail-header-left">
        <div class="rubro"><strong>Rubro:</strong> <em>${htmlEscape(rubro)}</em></div>
        <div class="rubro"><strong>Productos:</strong> <em>${htmlEscape(productos)}</em></div>
      </div>
      <div class="header-logo">
        <div class="logo-icon"><span></span><span></span><span></span></div>
        <div class="logo-text">E-COMEX</div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Ítem</th>
          <th>Cantidad (unidad)</th>
          <th>Precio FOB x ítem USD</th>
          <th>Costo final x ítem USD</th>
          <th>Costo final unitario USD x unidad</th>
        </tr>
      </thead>
      <tbody>
        ${
          hasItems
            ? items
                .slice(0, 50)
                .map(
                  (it) => `<tr>
          <td>${htmlEscape(safeStr(it?.item))}</td>
          <td>${it?.quantity != null ? htmlEscape(String(it.quantity)) : "—"}</td>
          <td>${fmtMaybe(it?.fobItemUsd)}</td>
          <td>${fmtMaybe(it?.costoFinalItemUsd)}</td>
          <td>${fmtMaybe(it?.costoUnitarioUsd)}</td>
        </tr>`
                )
                .join("\n")
            : `<tr>
          <td>ITEM-01</td>
          <td>${costs.qty}</td>
          <td>${costs.fobUnit != null ? fmtUsdEs(costs.fobUnit) : "—"}</td>
          <td>${totalToShow != null ? fmtUsdEs(totalToShow) : "—"}</td>
          <td>${totalToShow != null ? fmtUsdEs(totalToShow / Math.max(1, costs.qty)) : "—"}</td>
        </tr>`
        }
        <tr class="total-row">
          <td>TOTAL</td>
          <td>${hasItems ? htmlEscape(String(items.reduce((a, it) => a + (Number(it?.quantity) || 0), 0))) : costs.qty}</td>
          <td>${hasItems ? fmtMaybe(items.reduce((a, it) => a + (Number(it?.fobItemUsd) || 0), 0)) : costs.fobTotal != null ? fmtUsdEs(costs.fobTotal) : "—"}</td>
          <td>${hasItems ? fmtMaybe(items.reduce((a, it) => a + (Number(it?.costoFinalItemUsd) || 0), 0)) : totalToShow != null ? fmtUsdEs(totalToShow) : "—"}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="page page-observations">
    <div class="detail-header">
      <div class="detail-header-left">
        <div class="rubro"><strong>Rubro:</strong> <em>${htmlEscape(rubro)}</em></div>
        <div class="rubro"><strong>Productos:</strong> <em>${htmlEscape(productos)}</em></div>
      </div>
      <div class="header-logo">
        <div class="logo-icon"><span></span><span></span><span></span></div>
        <div class="logo-text">E-COMEX</div>
      </div>
    </div>

    <h3 class="observations-title">Observaciones</h3>
    <div class="observations-content">
      <p>• Todos los gastos son cotizados en dólares estadounidenses.</p>
      <p>Al momento del pago (1) se toma el tipo de cambio informal o blue para realizar el pago al proveedor en origen de forma anticipada.</p>
      <p>Al momento del pago (2) se toma el tipo de cambio oficial vendedor del banco Nación para realizar los pagos en pesos argentinos por transferencia bancaria.</p>
      <p><strong>• Los pagos se realizan en dos partes:</strong></p>
      <p>1. Se abona el precio del producto más los gastos bancarios. Este pago es inicial para poder transferir el monto al proveedor en origen.</p>
      <p>2. Una vez que la carga llega al país, se abona el resto según el análisis enviado.</p>
      <p><strong>Importante:</strong> este reporte es orientativo. La validación profesional (clasificación aduanera, requisitos/intervenciones y documentación) es el paso final antes de operar.</p>
    </div>
  </div>
</body>
</html>`;
}

export async function generateQuotePdfViaHtml(quote: QuoteLike) {
  // Render with Playwright for pixel-perfect output.
  process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || "0";
  const { chromium } = await import("playwright");

  const browser = await chromium.launch({
    headless: true,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
    });
    const enriched = await ensurePdfDisplayFields(quote).catch(() => quote);
    const html = renderQuotePdfHtml(enriched);
    // Be resilient in production: external images/fonts can prevent "networkidle".
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    await page.emulateMedia({ media: "print" });
    // Wait for web fonts (best-effort).
    await page
      .evaluate(async () => {
        // @ts-ignore
        if (document.fonts?.ready) {
          // @ts-ignore
          await document.fonts.ready;
        }
      })
      .catch(() => null);
    // Best-effort: give images a short chance to render.
    await page
      .evaluate(async () => {
        const imgs = Array.from(document.images || []);
        const waitImg = (img: HTMLImageElement) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                const done = () => resolve();
                img.addEventListener("load", done, { once: true });
                img.addEventListener("error", done, { once: true });
              });
        await Promise.race([
          Promise.all(imgs.slice(0, 6).map(waitImg)),
          new Promise<void>((r) => setTimeout(r, 2000)),
        ]);
      })
      .catch(() => null);
    const pdf = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      preferCSSPageSize: true,
    });
    return pdf;
  } finally {
    await browser.close().catch(() => null);
  }
}

