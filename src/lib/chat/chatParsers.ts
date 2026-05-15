/**
 * Pure parsing utilities for the chat/cotización flow.
 * No external dependencies beyond standard JS.
 */

export type IncomingMessage = { role: "user" | "assistant"; content: string };

export function normalizeNumberLike(input: string) {
  const s = String(input || "").trim();
  if (!s) return "";
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  const decSep = lastDot > lastComma ? "." : lastComma > lastDot ? "," : null;
  const cleaned = s.replace(/[^\d.,]/g, "");
  if (!decSep) return cleaned.replace(/[.,]/g, "");
  const parts = cleaned.split(decSep);
  const intPart = (parts[0] ?? "").replace(/[.,]/g, "");
  const fracPart = (parts[1] ?? "").replace(/[.,]/g, "");
  return fracPart ? `${intPart}.${fracPart}` : intPart;
}

export function hasQuantityHint(text: string) {
  const t = String(text || "").toLowerCase();
  return (
    /\b(unid|unidad|unidades|pcs|piezas)\b/i.test(t) ||
    /\bx\s*\d{1,6}\b/i.test(t) ||
    /\b(cant|cantidad)\b/i.test(t) ||
    /\b(\d{1,6})\s*u\b/i.test(t)
  );
}

export function parseUnitPriceUsdWithMode(
  text: string,
  opts: { allowBareNumber: boolean }
): number | null {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const t = raw.toLowerCase();

  const hasUsdSignal =
    /\b(usd|us\$|u\$s|u\$d|dolares|dólares|dls)\b/i.test(t) || /\$/.test(t);

  if (!hasUsdSignal && hasQuantityHint(t)) return null;

  const tagged =
    t.match(/(?:usd|us\$|u\$s|u\$d|\$)\s*([0-9][0-9.,]*)/i) ??
    t.match(/([0-9][0-9.,]*)\s*(?:usd|us\$|u\$s|u\$d|dolares|dólares|dls)\b/i);
  if (tagged?.[1]) {
    const n = Number(normalizeNumberLike(tagged[1]));
    if (Number.isFinite(n) && n > 0) return n;
  }

  if (!opts.allowBareNumber) return null;

  const bare = t.match(/\b([0-9][0-9.,]*)\b/);
  if (!bare?.[1]) return null;
  const n = Number(normalizeNumberLike(bare[1]));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function parseUnitPriceUsd(text: string): number | null {
  return parseUnitPriceUsdWithMode(text, { allowBareNumber: false });
}

export function userProvidedUnitPrice(text: string): boolean {
  return parseUnitPriceUsdWithMode(text, { allowBareNumber: false }) != null;
}

export function parseQuantityWithMode(
  text: string,
  opts: { allowBareNumber: boolean }
): number | null {
  const raw = String(text || "").trim().toLowerCase();
  if (!raw) return null;

  const hasPriceSignal = /(usd|\$)/i.test(raw);
  const hasQtyHint = hasQuantityHint(raw);

  if (hasPriceSignal && !hasQtyHint) return null;
  if (!hasQtyHint && !opts.allowBareNumber) return null;

  const mExplicit =
    raw.match(/\b(?:cant|cantidad)\b\s*[:=]?\s*(\d{1,6})\b/i) ??
    raw.match(/\b(\d{1,6})\s*(?:unid|unidad|unidades|pcs|piezas)\b/i) ??
    raw.match(/\bx\s*(\d{1,6})\b/i) ??
    raw.match(/\b(\d{1,6})\s*u\b/i);
  const cand = mExplicit?.[1];

  const stripped = raw.replace(/(?:usd|us\$|u\$s|\$)\s*[0-9][0-9.,]*/gi, " ");
  const m = cand ? null : stripped.match(/\b(\d{1,6})\b/);

  const n = Number(cand ?? m?.[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export function parseQuantity(text: string): number | null {
  return parseQuantityWithMode(text, { allowBareNumber: false });
}

export function userProvidedQuantity(text: string): boolean {
  return parseQuantity(text) != null;
}

export function looksLikeJustNumber(text: string) {
  return /^[0-9.,\s]+$/.test(String(text || "").trim());
}

export function looksLikePriceMessage(text: string) {
  const t = String(text || "").toLowerCase();
  return /\b(precio|sale|cuesta|valor|usd|us\$|u\$s|dolares|dólares)\b/i.test(t) || /\$/.test(t);
}

export const PRICE_TRIGGERS =
  /\b(precio|vale|valen|cuesta|sale|valor|usd|us\$|u\$s|dolares|dólares|fob|por\s+unidad)\b/i;

export function parseUnitPriceUsdSmart(text: string): number | null {
  const strict = parseUnitPriceUsdWithMode(text, { allowBareNumber: false });
  if (typeof strict === "number") return strict;
  const t = String(text || "").toLowerCase();
  if (!PRICE_TRIGGERS.test(t)) return null;
  return parseUnitPriceUsdWithMode(text, { allowBareNumber: true });
}

export function parseQuantitySmart(text: string): number | null {
  const strict = parseQuantityWithMode(text, { allowBareNumber: false });
  if (typeof strict === "number") return strict;
  const raw = String(text || "").toLowerCase();
  if (!hasQuantityHint(raw)) return null;
  return parseQuantityWithMode(text, { allowBareNumber: true });
}

export function lastUserMessage(messages: IncomingMessage[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") return messages[i]!.content;
  }
  return "";
}

export function extractUrl(text: string): string | null {
  const t = String(text || "").trim();
  if (!t) return null;

  const m1 = t.match(/https?:\/\/[^\s)]+/i);
  if (m1?.[0]) return m1[0];

  const m2 = t.match(/\b((?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s)]+)?)\b/i);
  const cand = m2?.[1] ? String(m2[1]).trim() : "";
  if (cand && cand.includes("/")) return `https://${cand.replace(/^https?:\/\//i, "")}`;

  return null;
}

export function normalizeUrl(u: string) {
  try {
    return new URL(u).toString();
  } catch {
    return String(u || "").trim();
  }
}

export function stripUrlFromText(text: string, url: string | null) {
  const raw = String(text || "");
  const withoutExact = url ? raw.split(url).join(" ") : raw;
  return withoutExact
    .replace(/https?:\/\/[^\s)]+/gi, " ")
    .replace(/\b(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}\/[^\s)]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanOneLine(s: string, maxLen = 140) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1).trim()}…`;
}

export function cleanProductTitleFromMixedInput(inputText: string) {
  const s0 = String(inputText || "").replace(/\s+/g, " ").trim();
  if (!s0) return s0;

  let s = s0;
  s = s.replace(/\b\d{4}\.\d{2}\.\d{2}\b/g, " ").replace(/\b\d{8}\b/g, " ");
  s = s.replace(
    /(?:\b(precio|vale|valen|cuesta|sale|valor|fob)\b\s*[:=]?\s*)(?:usd|us\$|u\$s|\$)?\s*[0-9][0-9.,]*/gi,
    " "
  );
  s = s.replace(/(?:\b(?:usd|us\$|u\$s)\b|\$)\s*[0-9][0-9.,]*/gi, " ");
  s = s.replace(/\b(usd|us\$|u\$s|dolares|dólares)\b/gi, " ");
  s = s.replace(/\b(cant|cantidad)\b\s*[:=]?\s*\d{1,6}\b/gi, " ");
  s = s.replace(/\b\d{1,6}\s*(unid|unidad|unidades|pcs|piezas)\b/gi, " ");
  s = s.replace(/\bx\s*\d{1,6}\b/gi, " ");
  s = s.replace(/^\s*(quiero|quisiera|necesito|busco)\s+(importar|traer|comprar)\s+/i, "");
  s = s.replace(/^\s*(quiero|quisiera|necesito|busco)\s+/i, "");
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/[.,;:]+$/g, "").trim();
  if (s.length >= 6) return cleanOneLine(s, 120);
  return cleanOneLine(s0, 120);
}

export function looksLikeProductText(text: string) {
  const t = String(text || "").trim();
  if (!t) return false;
  const hasLetters = /[a-záéíóúñ]/i.test(t);
  if (!hasLetters) return false;
  if (userProvidedUnitPrice(t) && t.length <= 16) return false;
  if (looksLikePriceMessage(t) && !extractUrl(t)) {
    const stripped = t
      .toLowerCase()
      .replace(PRICE_TRIGGERS, "")
      .replace(/\$|usd|us\$|u\$s/gi, "")
      .replace(/\b[0-9][0-9.,]*\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (stripped.length < 4) return false;
  }
  const q = parseQuantityWithMode(t, { allowBareNumber: false });
  if (typeof q === "number") {
    const stripped = t
      .toLowerCase()
      .replace(/\b(cant|cantidad|unid|unidad|unidades|pcs|piezas)\b/gi, "")
      .replace(/\bx\b/gi, "")
      .replace(/\b\d{1,6}\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (stripped.length < 4) return false;
  }
  return true;
}

export function looksLikeFreshProductIntent(text: string) {
  const t = String(text || "").trim();
  if (!t) return false;
  if (extractUrl(t)) return true;
  if (looksLikeJustNumber(t)) return false;
  if (looksLikeProductText(t)) return true;
  const cleaned = cleanProductTitleFromMixedInput(t);
  const hasLetters = /[a-záéíóúñ]/i.test(cleaned);
  const hasIntentVerb =
    /\b(quiero|necesito|importar|cotizar|producto|articulo|artículo|mercader[ií]a|modelo)\b/i.test(t);
  return hasLetters && cleaned.length >= 4 && hasIntentVerb;
}

export function looksLikeContact(text: string) {
  const t = text.trim();
  const email = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(t);
  const phone = /\+?\d[\d\s().-]{7,}/.test(t);
  return email || phone;
}

export function parseWeightKg(text: string): number | null {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const mKg = raw.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:kg|kilos?|kilogramos?)\b/i);
  if (mKg) {
    const n = parseFloat(mKg[1]!.replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const mG = raw.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:gr?|gramos?)\b/i);
  if (mG) {
    const n = parseFloat(mG[1]!.replace(",", ".")) / 1000;
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

export function contactChannel(text: string): "email" | "whatsapp" | "unknown" {
  const t = text.trim();
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(t)) return "email";
  if (/\+?\d[\d\s().-]{7,}/.test(t)) return "whatsapp";
  return "unknown";
}

export function hasQuoteSignals(messages: IncomingMessage[]) {
  return messages.some(
    (m) =>
      m.role === "assistant" &&
      /Total puesto en Argentina|Impuestos argentinos|Flete internacional/i.test(m.content)
  );
}

export function isAffirmative(text: string) {
  const t = text.trim().toLowerCase();
  return /(sí|si|dale|ok|vamos|avanc|quiero avanzar|de una|hagamos|continuemos|valid(ar|alo)|agend(ar|alo)|consult(or[ií]a|a)|hablar con (un )?asesor|asesor(a)? experto)/i.test(t);
}

export function consultingPostQuoteMessage() {
  return [
    "—",
    "Esto es **orientativo**: el número final se valida con ficha técnica, documentación, origen y peso/volumen real.",
    "",
    "¿Querés **validarlo con un especialista** y cerrar números (consultoría paga)?",
  ].join("\n");
}
