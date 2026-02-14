import "dotenv/config";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { calcImportQuote } from "@/lib/quote/calcImportQuote";
import { scrapeProductFromUrl } from "@/lib/scraper/scrapeProductFromUrl";
import { prisma } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth/jwt";
import {
  extractVehicleInferenceFromText,
  vehicleInferenceToHintsText,
} from "@/lib/ai/vehicleExtractor";

type IncomingMessage = { role: "user" | "assistant"; content: string };

export const runtime = "nodejs";

function normalizeNumberLike(input: string) {
  // Accept "1.500,50" or "1,500.50" or "1500.50"
  const s = String(input || "").trim();
  if (!s) return "";
  // If contains both separators, decide last one as decimal.
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

function hasQuantityHint(text: string) {
  const t = String(text || "").toLowerCase();
  return (
    /\b(unid|unidad|unidades|pcs|piezas)\b/i.test(t) ||
    /\bx\s*\d{1,6}\b/i.test(t) ||
    /\b(cant|cantidad)\b/i.test(t) ||
    /\b(\d{1,6})\s*u\b/i.test(t)
  );
}

function parseUnitPriceUsdWithMode(
  text: string,
  opts: { allowBareNumber: boolean }
): number | null {
  // Accept: "USD 120", "U$S 120", "US$120", "$120", "120 usd", "120 dólares", "precio 1200"
  // If allowBareNumber=true, accept a plain number ONLY when no quantity hints are present.
  const raw = String(text || "").trim();
  if (!raw) return null;
  const t = raw.toLowerCase();

  const hasUsdSignal =
    /\b(usd|us\$|u\$s|u\$d|dolares|dólares|dls)\b/i.test(t) || /\$/.test(t);

  // Avoid interpreting "500 unidades" as a price.
  if (!hasUsdSignal && hasQuantityHint(t)) return null;

  // Prefer currency-tagged matches
  const tagged =
    t.match(/(?:usd|us\$|u\$s|u\$d|\$)\s*([0-9][0-9.,]*)/i) ??
    t.match(/([0-9][0-9.,]*)\s*(?:usd|us\$|u\$s|u\$d|dolares|dólares|dls)\b/i);
  if (tagged?.[1]) {
    const n = Number(normalizeNumberLike(tagged[1]));
    if (Number.isFinite(n) && n > 0) return n;
  }

  if (!opts.allowBareNumber) return null;

  // Bare number fallback (price stage): first number token
  const bare = t.match(/\b([0-9][0-9.,]*)\b/);
  if (!bare?.[1]) return null;
  const n = Number(normalizeNumberLike(bare[1]));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function parseUnitPriceUsd(text: string): number | null {
  return parseUnitPriceUsdWithMode(text, { allowBareNumber: false });
}

function userProvidedUnitPrice(text: string): boolean {
  // IMPORTANT: keep this STRICT so bare numbers like "500" can be treated as quantity when needed.
  return parseUnitPriceUsdWithMode(text, { allowBareNumber: false }) != null;
}

function parseQuantity(text: string): number | null {
  return parseQuantityWithMode(text, { allowBareNumber: false });
}

function userProvidedQuantity(text: string): boolean {
  return parseQuantity(text) != null;
}

function parseQuantityWithMode(
  text: string,
  opts: { allowBareNumber: boolean }
): number | null {
  const raw = String(text || "").trim().toLowerCase();
  if (!raw) return null;

  // Avoid interpreting prices as quantities.
  const hasPriceSignal = /(usd|\$)/i.test(raw);
  const hasQtyHint = hasQuantityHint(raw);

  if (hasPriceSignal && !hasQtyHint) return null;
  if (!hasQtyHint && !opts.allowBareNumber) return null;

  // Extract first integer token
  const m = raw.match(/\b(\d{1,6})\b/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function looksLikeJustNumber(text: string) {
  const t = String(text || "").trim();
  return /^[0-9.,\s]+$/.test(t);
}

function looksLikePriceMessage(text: string) {
  const t = String(text || "").toLowerCase();
  return /\b(precio|sale|cuesta|valor|usd|us\$|u\$s|dolares|dólares)\b/i.test(t) || /\$/.test(t);
}

const PRICE_TRIGGERS =
  /\b(precio|vale|valen|cuesta|sale|valor|usd|us\$|u\$s|dolares|dólares|fob|por\s+unidad)\b/i;

function parseUnitPriceUsdSmart(text: string): number | null {
  // First try strict (requires USD signal).
  const strict = parseUnitPriceUsdWithMode(text, { allowBareNumber: false });
  if (typeof strict === "number") return strict;

  // If the user is clearly talking about price, allow a bare number (assume USD).
  const t = String(text || "").toLowerCase();
  if (!PRICE_TRIGGERS.test(t)) return null;

  return parseUnitPriceUsdWithMode(text, { allowBareNumber: true });
}

function parseQuantitySmart(text: string): number | null {
  const strict = parseQuantityWithMode(text, { allowBareNumber: false });
  if (typeof strict === "number") return strict;
  const raw = String(text || "").toLowerCase();
  if (!hasQuantityHint(raw)) return null;
  return parseQuantityWithMode(text, { allowBareNumber: true });
}

function looksLikeProductText(text: string) {
  const t = String(text || "").trim();
  if (!t) return false;
  // If it contains letters and is not just USD/quantity shorthand, treat as product description.
  const hasLetters = /[a-záéíóúñ]/i.test(t);
  if (!hasLetters) return false;
  // Avoid cases like "usd 1200" being treated as product.
  if (userProvidedUnitPrice(t) && t.length <= 16) return false;
  // Avoid cases like "precio 1500" being treated as product,
  // but allow messages that contain a product + price in the same sentence.
  if (looksLikePriceMessage(t) && !extractUrl(t)) {
    const stripped = t
      .toLowerCase()
      .replace(PRICE_TRIGGERS, "")
      .replace(/\$|usd|us\$|u\$s/gi, "")
      .replace(/\b[0-9][0-9.,]*\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (stripped.length < 10) return false;
  }
  // Avoid treating "500 unidades" as product, but allow "500 unidades de <producto>".
  const q = parseQuantityWithMode(t, { allowBareNumber: false });
  if (typeof q === "number") {
    const stripped = t
      .toLowerCase()
      .replace(/\b(cant|cantidad|unid|unidad|unidades|pcs|piezas)\b/gi, "")
      .replace(/\bx\b/gi, "")
      .replace(/\b\d{1,6}\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (stripped.length < 10) return false;
  }
  return true;
}

function lastUserMessage(messages: IncomingMessage[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") return messages[i]!.content;
  }
  return "";
}

function extractUrl(text: string): string | null {
  // Very permissive; we just need to catch pasted supplier links.
  const m = text.match(/https?:\/\/[^\s)]+/i);
  return m?.[0] ?? null;
}

type StageHint = "awaiting_product" | "awaiting_price" | "awaiting_quantity" | null;

function inferStageHintFromMessages(messages: IncomingMessage[]): StageHint {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m || m.role !== "assistant") continue;
    const t = String(m.content || "").toLowerCase();
    if (/precio unitario|precio por unidad|usd 120|solo el número/i.test(t)) return "awaiting_price";
    if (/cantidad|unidades|pcs|piezas/i.test(t)) return "awaiting_quantity";
    if (/qué producto|que producto|peg[aá]\s+el\s+link/i.test(t)) return "awaiting_product";
    // If assistant already showed cards/quote signals, there is no active stage hint.
    if (/total puesto en argentina|impuestos argentinos|flete internacional/i.test(t)) return null;
  }
  return null;
}

function inferSeedForProductFromMessages(messages: IncomingMessage[]): string | null {
  // Prefer the most recent URL user pasted.
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m || m.role !== "user") continue;
    const url = extractUrl(m.content);
    if (url) return url;
  }
  // Fallback: most recent user text that looks like a product description.
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m || m.role !== "user") continue;
    const txt = String(m.content || "").trim();
    if (!txt) continue;
    if (extractUrl(txt)) continue;
    if (looksLikeJustNumber(txt)) continue;
    if (looksLikeProductText(txt)) return txt;
  }
  return null;
}

function extractNcmFromText(text: string): string | null {
  const s = String(text || "");
  const dot = s.match(/\b(\d{4}\.\d{2}\.\d{2})\b/);
  if (dot?.[1]) return dot[1];
  const digits = s.match(/\b(\d{8})\b/);
  if (digits?.[1]) {
    const d = digits[1];
    return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}`;
  }
  return null;
}

function parseChoiceIndex(text: string): number | null {
  const t = String(text || "").trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  if (n < 1 || n > 5) return null;
  return n;
}

function cleanOneLine(s: string, maxLen = 140) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1).trim()}…`;
}

function cleanProductTitleFromMixedInput(inputText: string) {
  const s0 = String(inputText || "").replace(/\s+/g, " ").trim();
  if (!s0) return s0;

  let s = s0;

  // Remove explicit NCM codes from the human-facing title.
  s = s
    .replace(/\b\d{4}\.\d{2}\.\d{2}\b/g, " ")
    .replace(/\b\d{8}\b/g, " ");

  // Remove obvious price fragments (keep model numbers like "iPhone 15" intact).
  s = s.replace(
    /(?:\b(precio|vale|valen|cuesta|sale|valor|fob)\b\s*[:=]?\s*)(?:usd|us\$|u\$s|\$)?\s*[0-9][0-9.,]*/gi,
    " "
  );
  s = s.replace(/(?:\b(?:usd|us\$|u\$s)\b|\$)\s*[0-9][0-9.,]*/gi, " ");
  // Remove leftover currency words.
  s = s.replace(/\b(usd|us\$|u\$s|dolares|dólares)\b/gi, " ");

  // Remove obvious quantity fragments.
  s = s.replace(/\b(cant|cantidad)\b\s*[:=]?\s*\d{1,6}\b/gi, " ");
  s = s.replace(/\b\d{1,6}\s*(unid|unidad|unidades|pcs|piezas)\b/gi, " ");
  s = s.replace(/\bx\s*\d{1,6}\b/gi, " ");

  // Remove common lead-in phrases.
  s = s.replace(
    /^\s*(quiero|quisiera|necesito|busco)\s+(importar|traer|comprar)\s+/i,
    ""
  );
  s = s.replace(/^\s*(quiero|quisiera|necesito|busco)\s+/i, "");

  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/[.,;:]+$/g, "").trim();
  if (s.length >= 6) return cleanOneLine(s, 120);
  return cleanOneLine(s0, 120);
}

function looksLikeOnlyNcmCodeTitle(title?: string) {
  const t = String(title ?? "").trim();
  return /^\d{4}\.\d{2}\.\d{2}$/.test(t) || /^\d{8}$/.test(t);
}

function parseAssumptionUpdate(text: string): { origin?: string; shippingProfile?: "light" | "medium" | "heavy" } | null {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const t = raw.toLowerCase();

  let origin: string | undefined;
  let shippingProfile: "light" | "medium" | "heavy" | undefined;

  const mOrigin = raw.match(/\borigen\b\s*[:=]\s*(.+)$/i) ?? raw.match(/^\s*origen\s+(.+)$/i);
  if (mOrigin?.[1]) {
    const v = String(mOrigin[1]).trim();
    if (v && v.length <= 60) origin = v;
  }

  const mProf =
    raw.match(/\b(perfil\s*(?:de)?\s*carga|perfil\s*flete|carga|flete)\b\s*[:=]\s*(livian[ao]|media|pesad[ao])/i) ??
    raw.match(/^\s*(livian[ao]|media|pesad[ao])\s*$/i);
  if (mProf?.[2] || mProf?.[1]) {
    const v = String(mProf[2] ?? mProf[1]).toLowerCase();
    if (v.startsWith("livi")) shippingProfile = "light";
    else if (v.startsWith("pes")) shippingProfile = "heavy";
    else shippingProfile = "medium";
  }

  if (!origin && !shippingProfile) return null;
  return { origin, shippingProfile };
}

function applyAssumptionUpdate(product: any, upd: { origin?: string; shippingProfile?: "light" | "medium" | "heavy" }) {
  if (!product || typeof product !== "object") return product;
  if (upd.origin) product.origin = upd.origin;
  if (upd.shippingProfile) {
    product.raw = { ...(product.raw ?? {}), shippingProfile: upd.shippingProfile };
  }
  return product;
}

function buildHiddenChoiceSet(
  candidates: Array<{ ncmCode: string; title?: string }>,
  currentNcm?: string,
  limit = 5
) {
  // Note: choices are internal. We never expose codes (or lists) to the user.
  // Keep a wider set so we can reliably map user answers to the right bucket.
  const keep = Math.max(12, limit);
  const hidden = candidates.slice(0, keep);
  return { hidden };
}

function normLooseText(s: string) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function inferVehicleDefaultsFromTitle(title: string) {
  const t = normLooseText(title);
  if (!t) return null;

  // If the user explicitly mentions special body types, don't assume defaults.
  const mentionsBasculante = /\bbasculant/.test(t);
  const mentionsFrigo = /\bfrigor|isoterm/.test(t);
  const mentionsVolquete = /\bvolquete\b/.test(t);
  const mentionsChasis = /\bchasis\b/.test(t);

  const isPickup =
    /\b(pickup|pick up|pick-up)\b/.test(t) ||
    /\b(camioneta|utilitario)\b/.test(t) ||
    /\b(hilux|ranger|amarok|frontier|navara|np300|l200|triton|dmax|d max|s10|s 10)\b/.test(t);

  if (!isPickup) return null;
  if (mentionsVolquete || mentionsChasis) return null;

  // Defaults for common pickups: almost always <=5t, not basculante, not frigorífico.
  // We only apply when user didn't explicitly mention otherwise.
  const le5t = true;
  const basculante = mentionsBasculante ? null : false;
  const frigo = mentionsFrigo ? null : false;

  return { kind: "pickup" as const, le5t, basculante, frigo };
}

function maybeAutoResolveKnownVehicle(product: any) {
  const title = String(product?.title ?? "").trim();
  if (!title) return product;
  const defaults = inferVehicleDefaultsFromTitle(title);
  if (!defaults) return product;

  const meta: any = product?.raw?.ncmMeta;
  const candidates: Array<{ ncmCode: string; title?: string }> = Array.isArray(
    meta?.pcramCandidates
  )
    ? meta.pcramCandidates
    : [];
  if (!candidates.length) return product;

  const pool = candidates
    .map((c) => ({ ...c, titleNorm: normLooseText(c.title ?? "") }))
    .filter((c) => c.ncmCode);

  let filtered = pool;
  if (defaults.le5t) filtered = filtered.filter((c) => /inferior o igual a 5 t/.test(c.titleNorm));
  if (defaults.basculante === false)
    filtered = filtered.filter((c) => !/basculante/.test(c.titleNorm));
  if (defaults.frigo === false)
    filtered = filtered.filter((c) => !/frigor|isoterm/.test(c.titleNorm));

  // Avoid matching "volquetes" when we inferred a pickup.
  filtered = filtered.filter((c) => !/volquete/.test(c.titleNorm));

  // Prefer "los demás" bucket for standard pickup.
  const preferred = filtered.filter((c) => /\blos demas\b/.test(c.titleNorm));
  const final = preferred.length ? preferred : filtered;

  if (final.length === 1) {
    product.ncm = final[0]!.ncmCode;
    if (product?.raw?.ncmMeta) {
      product.raw.ncmMeta.ambiguous = false;
      delete product.raw.ncmMeta.missingInfoQuestions;
    }
    // Remove any pending hidden options; we won't ask the user.
    if (product?.raw) delete product.raw.ncmChoiceOptions;
  }

  return product;
}

function shouldSkipTechnicalQuestions(product: any) {
  const vi = product?.raw?.vehicleInference as
    | { kind?: string; confidence?: number }
    | undefined;
  const nm: any = product?.raw?.ncmMeta;
  // If we're explicitly ambiguous, we DO want to ask the minimal technical questions.
  if (nm?.ambiguous === true) return false;
  // If we don't have a resolved NCM yet, don't skip questions (we need it to query PCRAM).
  if (!product?.ncm) return false;
  // If AI already recognized a vehicle with decent confidence, don't block the user with
  // technical disambiguation. We'll quote with conservative ranges when needed.
  if (vi && typeof vi.confidence === "number" && vi.confidence >= 0.75) return true;
  // If the internal pipeline already determined this is chapter 87 (vehicles),
  // we can still quote without blocking on cilindraje/peso, using wider ranges.
  const hs = String(nm?.hsHeading ?? "").replace(/\D/g, "");
  if (hs.startsWith("87")) return true;
  return false;
}

function tryPickNcmCandidateFromHints(
  candidates: Array<{ ncmCode: string; title?: string }>,
  userText: string
): { ncmCode: string } | null {
  const t = normLooseText(userText);
  if (!t || candidates.length < 2) return null;

  const wantsLe5t =
    /(<=\s*5\s*t|≤\s*5\s*t|hasta\s*5\s*t|menor\s+o\s+igual\s+a\s*5\s*t|\b5\s*t\s*o\s*menos\b)/i.test(
      userText
    );
  const wantsGt5t =
    /(>\s*5\s*t|mas\s+de\s*5\s*t|mayor\s+a\s*5\s*t|superior\s+a\s*5\s*t)/i.test(userText);

  // Feature-scoped yes/no parsing (avoid global "sí ... no ..." ambiguity).
  const basculanteNo = /\b(no|sin)\s+basculant/.test(t);
  const basculanteYes = /\bbasculant/.test(t) && !basculanteNo && /\b(si|sí)\b/.test(t);

  const frigoNo = /\b(no|sin)\s+(frigor|isoterm)/.test(t);
  const frigoYes =
    /\b(frigo|frigor|isoterm)/.test(t) && !frigoNo && /\b(si|sí)\b/.test(t);

  const chasisNo = /\b(no|sin)\s+chasis\b/.test(t);
  const chasisYes = /\bchasis\b/.test(t) && !chasisNo && /\b(si|sí)\b/.test(t);

  const pool = candidates
    .map((c) => ({ ...c, titleNorm: normLooseText(c.title ?? "") }))
    .filter((c) => c.ncmCode);

  let filtered = pool;
  if (wantsLe5t) filtered = filtered.filter((c) => /inferior o igual a 5 t/.test(c.titleNorm));
  if (wantsGt5t) filtered = filtered.filter((c) => /superior a 5 t/.test(c.titleNorm));

  if (basculanteYes) filtered = filtered.filter((c) => /basculante/.test(c.titleNorm));
  if (basculanteNo) filtered = filtered.filter((c) => !/basculante/.test(c.titleNorm));

  if (frigoYes) filtered = filtered.filter((c) => /frigor|isoterm/.test(c.titleNorm));
  if (frigoNo) filtered = filtered.filter((c) => !/frigor|isoterm/.test(c.titleNorm));

  if (chasisYes) filtered = filtered.filter((c) => /chasis con motor/.test(c.titleNorm));
  if (chasisNo) filtered = filtered.filter((c) => !/chasis con motor/.test(c.titleNorm));

  if (filtered.length === 1) return { ncmCode: filtered[0]!.ncmCode };
  return null;
}

function topCandidatesWithCurrent(
  candidates: Array<{ ncmCode: string; title?: string }>,
  currentNcm: string | undefined,
  limit = 5
) {
  const top = candidates.slice(0, limit);
  const cur = currentNcm ? String(currentNcm) : "";
  if (!cur) return top;
  const inTop = top.some((c) => String(c.ncmCode).replace(/\D/g, "") === cur.replace(/\D/g, ""));
  if (inTop) return top;
  const found = candidates.find(
    (c) => String(c.ncmCode).replace(/\D/g, "") === cur.replace(/\D/g, "")
  );
  if (!found) return top;
  // Replace last item to keep 1–5 mapping stable.
  return [...top.slice(0, Math.max(0, limit - 1)), found];
}

function looksLikeNcmDisagreement(text: string) {
  const t = String(text || "").toLowerCase();
  const hasCode = /\b\d{4}\.\d{2}\.\d{2}\b/.test(t) || /\b\d{8}\b/.test(t);
  return (
    (/\bncm\b/.test(t) || hasCode) &&
    (/\bno\s+es\b/.test(t) ||
      /\bcuando\s+no\s+es\b/.test(t) ||
      /\bequivocad/.test(t) ||
      /\bincorrect/.test(t) ||
      /\bmal\b/.test(t))
  );
}

function looksLikeClassificationAnswer(text: string) {
  const raw = String(text || "").trim();
  if (!raw) return false;
  const t = raw
    .toLowerCase()
    .normalize("NFD")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

  // Typical short answers to our technical questions
  const hasMarkers =
    /<=\s*5\s*t|≤\s*5\s*t|\b5\s*t\b/.test(t) ||
    /\b(basculant|frigor|isoterm|chasis|orugas|semirremolque)\b/.test(t) ||
    /\b(personas|carga|utilitario)\b/.test(t) ||
    /\b(cm3|cilindrada)\b/.test(t) ||
    /\b(diesel|nafta|gasolina|electrico|hibrid)\b/.test(t) ||
    /\b(si|sí|no)\b/.test(t);

  // Keep it conservative: only treat as "answer" when it's short-ish.
  return hasMarkers && t.length <= 120;
}

function isAffirmative(text: string) {
  const t = text.trim().toLowerCase();
  return /(sí|si|dale|ok|vamos|avanc|quiero avanzar|de una|hagamos|continuemos|valid(ar|alo)|agend(ar|alo)|consult(or[ií]a|a)|hablar con (un )?asesor|asesor(a)? experto)/i.test(
    t
  );
}

function consultingPostQuoteMessage() {
  return [
    "—",
    "Esto es **orientativo**: el número final se valida con ficha técnica, documentación, origen y peso/volumen real.",
    "",
    "¿Querés **validarlo con un especialista** y cerrar números (consultoría paga)?",
  ].join("\n");
}

function looksLikeContact(text: string) {
  const t = text.trim();
  const email = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(t);
  const phone = /\+?\d[\d\s().-]{7,}/.test(t);
  return email || phone;
}

function contactChannel(text: string): "email" | "whatsapp" | "unknown" {
  const t = text.trim();
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(t)) return "email";
  if (/\+?\d[\d\s().-]{7,}/.test(t)) return "whatsapp";
  return "unknown";
}

function hasQuoteSignals(messages: IncomingMessage[]) {
  // Heuristic: if assistant ever mentioned the total card label, we consider a quote was shown.
  return messages.some(
    (m) =>
      m.role === "assistant" &&
      /Total puesto en Argentina|Impuestos argentinos|Flete internacional/i.test(
        m.content
      )
  );
}

function parseCookies(header: string | null) {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const headerAnon = (req.headers.get("x-ecomex-anon") ?? "").trim();
    const anonId = cookieStore.get("ecomex_anon")?.value || headerAnon || crypto.randomUUID();
    const authToken = cookieStore.get("ecomex_auth")?.value;
    const auth = authToken ? await verifyAuthToken(authToken) : null;
    const userId = auth?.sub ?? null;
    const cookieSecure = (req.headers.get("x-forwarded-proto") ?? "")
      .toLowerCase()
      .startsWith("https");

    const body = (await req.json()) as {
      mode?: "quote" | "budget";
      messages?: IncomingMessage[];
      contact?: string;
    };

    const mode = body.mode === "budget" ? "budget" : "quote";
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const userText = lastUserMessage(messages);
    const contact = typeof body.contact === "string" ? body.contact.trim() : "";

    if (!messages.length || !userText) {
      return NextResponse.json(
        {
          assistantMessage:
            "Necesito tu mensaje para poder cotizar. Pegá un link del proveedor o describí el producto.",
        },
        { status: 400 }
      );
    }

    // Contact step: only after user explicitly wants to advance.
    if (looksLikeContact(userText) && contact === "") {
      // User pasted contact in the main input. We still accept it, but we won't ask early.
      // We'll treat it as "contact provided after request" only if a quote was shown and user said yes.
    }

    // If user confirms after seeing a quote, request contact to agendar consultoría.
    if (isAffirmative(userText) && hasQuoteSignals(messages)) {
      // Mark latest quote as decision requested (best-effort).
      await prisma.quote
        .findFirst({
          where: { anonId },
          orderBy: { createdAt: "desc" },
        })
        .then((q) =>
          q
            ? prisma.quote.update({
                where: { id: q.id },
                data: { stage: "decision_requested" },
              })
            : null
        )
        .catch(() => null);

      const res = NextResponse.json({
        assistantMessage:
          "Perfecto. Para **agendar una consultoría paga** y validar esta importación con un especialista, dejame tu **mail o WhatsApp**.",
        requestContact: true,
      });
      res.cookies.set("ecomex_anon", anonId, {
        httpOnly: true,
        sameSite: "lax",
        secure: cookieSecure,
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
      return res;
    }

    // If client included contact field and it looks valid, acknowledge.
    if (contact && looksLikeContact(contact)) {
      const lead = await prisma.lead.upsert({
        where: { contact },
        create: {
          anonId,
          contact,
          channel: contactChannel(contact),
          userId: userId ?? undefined,
        },
        update: {
          anonId,
          channel: contactChannel(contact),
          userId: userId ?? undefined,
        },
      });

      // Attach lead to latest quote (best-effort).
      await prisma.quote
        .findFirst({
          where: { anonId },
          orderBy: { createdAt: "desc" },
        })
        .then((q) =>
          q
            ? prisma.quote.update({
                where: { id: q.id },
                data: { leadId: lead.id, stage: "lead_captured" },
              })
            : null
        )
        .catch(() => null);

      const res = NextResponse.json({
        assistantMessage:
          [
            "Recibido. Un especialista va a tomar tu caso y coordinar la **consultoría paga** por el canal que dejaste.",
            "",
            "En la consultoría validamos:",
            "- clasificación aduanera y alícuotas aplicables",
            "- requisitos/intervenciones y documentación",
            "- riesgos operativos (usados, restricciones, permisos)",
            "- optimización logística (marítimo) y costos",
            "- recomendación final de viabilidad",
            "",
            "Si querés, podés crear una cuenta opcional para ver historial y seguimiento: /account",
          ].join("\n"),
        requestContact: false,
      });
      res.cookies.set("ecomex_anon", anonId, {
        httpOnly: true,
        sameSite: "lax",
        secure: cookieSecure,
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
      return res;
    }

    if (mode === "budget") {
      const quote = await calcImportQuote({
        mode,
        budgetText: userText,
      });

      await prisma.quote.create({
        data: {
          anonId,
          mode,
          userText,
          quoteJson: quote as any,
          totalMinUsd: quote.totalMinUsd,
          totalMaxUsd: quote.totalMaxUsd,
          userId: userId ?? undefined,
        },
      });

      const res = NextResponse.json({
        assistantMessage: `${quote.explanation}\n\n${consultingPostQuoteMessage()}`,
        cards: quote.cards,
        requestContact: false,
      });
      res.cookies.set("ecomex_anon", anonId, {
        httpOnly: true,
        sameSite: "lax",
        secure: cookieSecure,
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
      return res;
    }

    const active = await prisma.quote
      .findFirst({
        where: {
          anonId,
          mode: "quote",
          stage: { in: ["awaiting_product", "awaiting_price", "awaiting_quantity"] },
        },
        orderBy: { createdAt: "desc" },
      })
      .catch(() => null);

    const stageHint = inferStageHintFromMessages(messages);
    const seedForProduct = inferSeedForProductFromMessages(messages);

    const priceUsdStrict = parseUnitPriceUsdWithMode(userText, { allowBareNumber: false });
    const quantityStrict = parseQuantityWithMode(userText, { allowBareNumber: false });
    let priceUsd: number | null = priceUsdStrict ?? parseUnitPriceUsdSmart(userText);
    let quantity: number | null = quantityStrict ?? parseQuantitySmart(userText);

    // Reasoning fallback: if the assistant explicitly asked for price/quantity,
    // accept a bare number as the answer (even without "USD"/"unidades").
    if (priceUsd == null && stageHint === "awaiting_price" && looksLikeJustNumber(userText)) {
      const loose = parseUnitPriceUsdWithMode(userText, { allowBareNumber: true });
      if (typeof loose === "number") priceUsd = loose;
    }
    if (quantity == null && stageHint === "awaiting_quantity" && looksLikeJustNumber(userText)) {
      const qLoose = parseQuantityWithMode(userText, { allowBareNumber: true });
      if (typeof qLoose === "number") quantity = qLoose;
    }

    const urlInText = extractUrl(userText);
    const disagreesWithNcm = looksLikeNcmDisagreement(userText);
    const explicitNcm = disagreesWithNcm ? null : extractNcmFromText(userText);

    // If user says the previously shown NCM is wrong (after a quote),
    // reopen the latest quote to let them pick from PCRAM candidates.
    if (!active && disagreesWithNcm) {
      const last = await prisma.quote
        .findFirst({
          where: { anonId, mode: "quote" },
          orderBy: { createdAt: "desc" },
        })
        .catch(() => null);

      if (last) {
        const product: any = (last.productJson as any) ?? {};
        delete product.ncm;
        if (product?.raw) {
          delete product.raw.pcram;
          if (product.raw.ncmMeta) product.raw.ncmMeta.ambiguous = true;
        }

        const seedText = String(product?.title ?? last.userText ?? "").trim();
        if (seedText) {
          const { productFromTextPipeline } = await import(
            "@/lib/scraper/productFromTextPipeline"
          );
          const extra = (await productFromTextPipeline(seedText).catch(() => ({}))) as any;
          // Keep only candidates/meta; don't auto-accept a new NCM while the user is disputing it.
          if (extra?.ncmMeta) product.raw = { ...(product.raw ?? {}), ncmMeta: extra.ncmMeta };
        }

        const candidates: Array<{ ncmCode: string; title?: string }> = Array.isArray(
          product?.raw?.ncmMeta?.pcramCandidates
        )
          ? product.raw.ncmMeta.pcramCandidates
          : [];

        if (candidates.length) {
        const { hidden } = buildHiddenChoiceSet(candidates, product?.ncm, 5);
        product.raw = {
          ...(product.raw ?? {}),
          ncmChoiceOptions: hidden,
        };

          await prisma.quote
            .update({
              where: { id: last.id },
              data: { productJson: product as any, stage: "awaiting_product" },
            })
            .catch(() => null);

          const res = NextResponse.json({
            assistantMessage: [
            "Perfecto, lo recalculamos.",
              "",
            "Para estimar **impuestos** con precisión necesito afinar 1–3 datos técnicos del producto.",
            "Respondeme con lo que sepas (en una sola línea está perfecto).",
            ].join("\n"),
            requestContact: false,
          });
          res.cookies.set("ecomex_anon", anonId, {
            httpOnly: true,
            sameSite: "lax",
            secure: cookieSecure,
            path: "/",
            maxAge: 60 * 60 * 24 * 365,
          });
          return res;
        }
      }
    }

    const buildProductFromInput = async (inputText: string) => {
      const url = extractUrl(inputText);
      if (url) return await scrapeProductFromUrl(url, { hintText: inputText, timeoutMs: 18_000 });
      const base: any = { title: cleanProductTitleFromMixedInput(inputText) };
      // AI vehicle inference to reduce (or eliminate) follow-up questions.
      const vehicleInf = await extractVehicleInferenceFromText(inputText).catch(() => null);
      if (vehicleInf && vehicleInf.kind !== "desconocido") {
        base.raw = { ...(base.raw ?? {}), vehicleInference: vehicleInf };
      }
      const { productFromTextPipeline } = await import(
        "@/lib/scraper/productFromTextPipeline"
      );
      const enrichedText =
        vehicleInf && vehicleInf.confidence >= 0.6
          ? `${inputText}\n\n[HINTS]\n${vehicleInferenceToHintsText(vehicleInf)}`
          : inputText;

      const extra = (await productFromTextPipeline(enrichedText).catch(() => ({}))) as {
        ncm?: string;
        pcram?: unknown;
        ncmMeta?: unknown;
      };
      if (extra.ncm) base.ncm = extra.ncm;
      if (extra.pcram) base.raw = { ...(base.raw ?? {}), pcram: extra.pcram };
      if (extra.ncmMeta) base.raw = { ...(base.raw ?? {}), ncmMeta: extra.ncmMeta };
      // If we can safely resolve common vehicle cases, do it here to avoid asking basics.
      maybeAutoResolveKnownVehicle(base);
      return base;
    };

    const ensurePcram = async (product: any) => {
      if (product?.raw?.pcram) return product;
      if (!product?.ncm) return product;
      if (!(process.env.PCRAM_USER && process.env.PCRAM_PASS)) return product;
      const { PcramClient } = await import("@/lib/pcram/pcramClient");
      const client = new PcramClient();
      const pcram = await client.getDetail(String(product.ncm)).catch(() => undefined);
      if (pcram) product.raw = { ...(product.raw ?? {}), pcram };
      return product;
    };

    const buildProductPreview = (product: any) => {
      const imgs: string[] = Array.isArray(product?.images)
        ? product.images
        : Array.isArray(product?.raw?.urlAnalysis?.imageUrls)
          ? product.raw.urlAnalysis.imageUrls
          : [];
      const imageUrls = imgs
        .map((x) => String(x || "").trim())
        .filter(Boolean)
        .slice(0, 6);
      const sourceUrl =
        typeof product?.url === "string"
          ? product.url
          : typeof product?.sourceUrl === "string"
            ? product.sourceUrl
            : undefined;

      return {
        title: typeof product?.title === "string" ? product.title : undefined,
        imageUrl: imageUrls[0],
        imageUrls: imageUrls.length ? imageUrls : undefined,
        sourceUrl,
        fobUsd: typeof product?.fobUsd === "number" ? product.fobUsd : undefined,
        currency: typeof product?.currency === "string" ? product.currency : undefined,
        price:
          product?.price && typeof product.price === "object"
            ? {
                type: String(product.price.type ?? ""),
                min:
                  typeof product.price.min === "number" && Number.isFinite(product.price.min)
                    ? product.price.min
                    : null,
                max:
                  typeof product.price.max === "number" && Number.isFinite(product.price.max)
                    ? product.price.max
                    : null,
                currency: typeof product.price.currency === "string" ? product.price.currency : "",
                unit: typeof product.price.unit === "string" ? product.price.unit : "",
              }
            : undefined,
        quantity: typeof product?.quantity === "number" ? product.quantity : undefined,
        origin: typeof product?.origin === "string" ? product.origin : undefined,
        supplier: typeof product?.supplier === "string" ? product.supplier : undefined,
      };
    };

    const ask = (assistantMessage: string, product?: any) => {
      const res = NextResponse.json({
        assistantMessage,
        requestContact: false,
        productPreview: product ? buildProductPreview(product) : undefined,
      });
      res.cookies.set("ecomex_anon", anonId, {
        httpOnly: true,
        sameSite: "lax",
        secure: cookieSecure,
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
      return res;
    };

    const quoteAndRespond = async (quoteRowId: string | null, product: any) => {
      const product2 = await ensurePcram(product);
      const quote = await calcImportQuote({
        mode: "quote",
        product: product2,
        rawUserText: userText,
      });

      if (quoteRowId) {
        await prisma.quote
          .update({
            where: { id: quoteRowId },
            data: {
              productJson: product2 as any,
              quoteJson: quote as any,
              totalMinUsd: quote.totalMinUsd,
              totalMaxUsd: quote.totalMaxUsd,
              stage: "refined",
            },
          })
          .catch(() => null);
      } else {
        await prisma.quote
          .create({
            data: {
              anonId,
              mode: "quote",
              userText,
              sourceUrl: urlInText ?? undefined,
              productJson: product2 as any,
              quoteJson: quote as any,
              totalMinUsd: quote.totalMinUsd,
              totalMaxUsd: quote.totalMaxUsd,
              stage: "quoted",
              userId: userId ?? undefined,
            },
          })
          .catch(() => null);
      }

      const ncmUsed =
        typeof product2?.ncm === "string" && product2.ncm.trim()
          ? product2.ncm.trim()
          : undefined;

      const res = NextResponse.json({
        assistantMessage: `${quote.explanation}\n\n${consultingPostQuoteMessage()}`,
        cards: quote.cards,
        productPreview: buildProductPreview(product2),
        ncm: ncmUsed,
        quality: typeof (quote as any).quality === "number" ? (quote as any).quality : undefined,
        assumptions: Array.isArray((quote as any).assumptions)
          ? (quote as any).assumptions
          : undefined,
        requestContact: false,
      });
      res.cookies.set("ecomex_anon", anonId, {
        httpOnly: true,
        sameSite: "lax",
        secure: cookieSecure,
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
      return res;
    };

    // Allow refining the latest quote after it was produced (no active stage),
    // by sending simple structured updates like "Origen: China" or "Perfil carga: pesada".
    if (!active && mode === "quote") {
      const upd = parseAssumptionUpdate(userText);
      if (upd) {
        const last = await prisma.quote
          .findFirst({ where: { anonId, mode: "quote" }, orderBy: { createdAt: "desc" } })
          .catch(() => null);
        if (last) {
          const product: any = (last.productJson as any) ?? {};
          applyAssumptionUpdate(product, upd);
          return await quoteAndRespond(last.id, product);
        }
      }
    }

    if (active) {
      const product: any = (active.productJson as any) ?? {};

      // Update known fields from this message
      if (typeof priceUsd === "number") {
        product.fobUsd = priceUsd;
        product.currency = "USD";
      }
      if (typeof quantity === "number") {
        product.quantity = quantity;
      }

      // If user is providing product now
      if (active.stage === "awaiting_product") {
        // If user says the shown NCM is wrong, clear it and force a re-pick from candidates.
        if (disagreesWithNcm) {
          delete product.ncm;
          if (product?.raw) {
            delete product.raw.pcram;
            if (product.raw.ncmMeta) product.raw.ncmMeta.ambiguous = true;
          }
          // If we don't have candidates stored, re-run the text pipeline from the current title.
          const hasCandidates = Array.isArray(product?.raw?.ncmMeta?.pcramCandidates);
          if (!hasCandidates) {
            const built = await buildProductFromInput(String(product?.title ?? ""));
            Object.assign(product, built);
          }
          await prisma.quote
            .update({ where: { id: active.id }, data: { productJson: product as any } })
            .catch(() => null);
        }

        // We keep classification options internal; user answers questions and we resolve internally.
        const prevHidden: Array<{ ncmCode: string; title?: string }> = Array.isArray(
          product?.raw?.ncmChoiceOptions
        )
          ? product.raw.ncmChoiceOptions
          : [];
        const isTechAnswer =
          prevHidden.length > 0 && !urlInText && looksLikeClassificationAnswer(userText);
        let resolvedViaTechAnswer = false;
        if (prevHidden.length) {
          const hinted = tryPickNcmCandidateFromHints(prevHidden, userText);
          if (hinted?.ncmCode) {
            product.ncm = hinted.ncmCode;
            if (product?.raw?.ncmMeta) product.raw.ncmMeta.ambiguous = false;
            delete product.raw.ncmChoiceOptions;
            await prisma.quote
              .update({ where: { id: active.id }, data: { productJson: product as any } })
              .catch(() => null);
            resolvedViaTechAnswer = true;
          }
        }

        // If we're answering the technical questions and we already have a resolved classification,
        // continue the guided flow (price → qty) even if the user text "looks like product".
        if (isTechAnswer && (resolvedViaTechAnswer || Boolean(product?.ncm))) {
          await prisma.quote
            .update({ where: { id: active.id }, data: { productJson: product as any } })
            .catch(() => null);
          if (typeof product.fobUsd !== "number") {
            await prisma.quote
              .update({ where: { id: active.id }, data: { stage: "awaiting_price" } })
              .catch(() => null);
            return ask(
              "Perfecto. ¿Cuál es el **precio unitario** del producto en **USD**? (ej: `USD 120`)",
              product
            );
          }
          if (typeof product.quantity !== "number") {
            await prisma.quote
              .update({ where: { id: active.id }, data: { stage: "awaiting_quantity" } })
              .catch(() => null);
            return ask("Gracias. ¿Cuál es la **cantidad** a importar? (ej: `500`)", product);
          }
          return await quoteAndRespond(active.id, product);
        }

        // Classification disambiguation: keep it internal; ask for minimal technical info.
        const ncmMeta: any = product?.raw?.ncmMeta;
        const candidates: Array<{ ncmCode: string; title?: string }> =
          Array.isArray(ncmMeta?.pcramCandidates) ? ncmMeta.pcramCandidates : [];

        if (candidates.length >= 2 && (ncmMeta?.ambiguous === true || !product?.ncm)) {
          // If AI already recognized the vehicle/product with decent confidence, don't stop here.
          // We'll continue the flow and quote with conservative ranges if needed.
          if (shouldSkipTechnicalQuestions(product)) {
            if (typeof product.fobUsd !== "number") {
              await prisma.quote
                .update({ where: { id: active.id }, data: { stage: "awaiting_price" } })
                .catch(() => null);
              return ask(
                "Perfecto. ¿Cuál es el **precio unitario** del producto en **USD**? (ej: `USD 120`)",
                product
              );
            }
            if (typeof product.quantity !== "number") {
              await prisma.quote
                .update({ where: { id: active.id }, data: { stage: "awaiting_quantity" } })
                .catch(() => null);
              return ask("Gracias. ¿Cuál es la **cantidad** a importar? (ej: `500`)", product);
            }
            return await quoteAndRespond(active.id, product);
          }

          if (explicitNcm) {
            product.ncm = explicitNcm;
          } else {
            const t = userText.toLowerCase();
            const pick = (pred: (title: string) => boolean) =>
              candidates.find((c) => pred(String(c.title ?? "")));

            const isParts = /(parte|partes|repuesto|repuestos|componente|componentes)/i.test(t);
            const isComplete = /(completo|equipo|maquina|máquina|unidad)/i.test(t);

            if (isParts) {
              const c =
                pick((title) => /partes?|repuestos?/i.test(title)) ??
                pick((title) => /^de\s+ascensor/i.test(title));
              if (c) product.ncm = c.ncmCode;
            } else if (isComplete) {
              const c =
                pick((title) => /ascensor|montacarg|elevador/i.test(title) && !/partes?/i.test(title)) ??
                candidates[0];
              if (c) product.ncm = c.ncmCode;
            }
          }

          // Mark ambiguity resolved when user chooses or pastes a NCM.
          if (product?.ncm && product?.raw?.ncmMeta) {
            product.raw.ncmMeta.ambiguous = false;
          }

          if (ncmMeta?.ambiguous === true || !product?.ncm) {
            const { hidden } = buildHiddenChoiceSet(candidates, product?.ncm, 5);
            product.raw = {
              ...(product.raw ?? {}),
              ncmChoiceOptions: hidden,
            };
            await prisma.quote
              .update({ where: { id: active.id }, data: { productJson: product as any } })
              .catch(() => null);

            const qs: string[] = Array.isArray(ncmMeta?.missingInfoQuestions)
              ? ncmMeta.missingInfoQuestions
                  .map((q: any) => String(q).trim())
                  .filter(Boolean)
                  .slice(0, 4)
              : [];
            if (qs.length) {
              return ask(
                [
                  "Para estimar **impuestos** con precisión, necesito afinar 1–3 datos técnicos.",
                  "",
                  [
                    "Respondeme esto (podés contestar en una sola línea, por ejemplo: `<=5t, no basculante, no frigorifico`):",
                    ...qs.map((q) => `- ${q}`),
                    "",
                  ].join("\n"),
                  "Con eso ajusto la clasificación internamente y seguimos con el precio/cantidad.",
                ]
                  .filter(Boolean)
                  .join("\n")
              );
            }
          }

          await prisma.quote
            .update({ where: { id: active.id }, data: { productJson: product as any } })
            .catch(() => null);

          // If we resolved NCM via the disambiguation answer, continue the guided flow.
          if (product?.ncm && !(urlInText || (looksLikeProductText(userText) && !isTechAnswer))) {
            if (typeof product.fobUsd !== "number") {
              await prisma.quote
                .update({ where: { id: active.id }, data: { stage: "awaiting_price" } })
                .catch(() => null);
              return ask(
                "Perfecto. ¿Cuál es el **precio unitario** del producto en **USD**? (ej: `USD 120`)"
              );
            }
            if (typeof product.quantity !== "number") {
              await prisma.quote
                .update({ where: { id: active.id }, data: { stage: "awaiting_quantity" } })
                .catch(() => null);
              return ask("Gracias. ¿Cuál es la **cantidad** a importar? (ej: `500 unidades`)");
            }
            return await quoteAndRespond(active.id, product);
          }
        }

        if (urlInText || looksLikeProductText(userText)) {
          // If we are in the middle of the "technical questions" step, don't treat those answers
          // as a new product description (otherwise we overwrite title and loop).
          if (isTechAnswer) {
            // No-op: we'll resolve via hints parsing / disambiguation below.
          } else {
          const built = await buildProductFromInput(userText);
          // preserve previously captured price/qty, but ALWAYS let the new product overwrite title/details
          const merged: any = { ...product, ...(built as any) };
          if (typeof product?.fobUsd === "number") merged.fobUsd = product.fobUsd;
          if (typeof product?.quantity === "number") merged.quantity = product.quantity;
          if (typeof product?.currency === "string") merged.currency = product.currency;
          await prisma.quote
            .update({
              where: { id: active.id },
              data: { productJson: merged as any },
            })
            .catch(() => null);

          // If PCRAM candidates are ambiguous, ask before moving to price/qty.
          const mergedMeta: any = (merged as any)?.raw?.ncmMeta;
          const mergedCandidates: Array<{ ncmCode: string; title?: string }> =
            Array.isArray(mergedMeta?.pcramCandidates) ? mergedMeta.pcramCandidates : [];
          if (
            mergedCandidates.length >= 2 &&
            (mergedMeta?.ambiguous === true || !merged?.ncm)
          ) {
            const { hidden } = buildHiddenChoiceSet(mergedCandidates, merged?.ncm, 5);
            (merged as any).raw = {
              ...((merged as any).raw ?? {}),
              ncmChoiceOptions: hidden,
            };
            await prisma.quote
              .update({ where: { id: active.id }, data: { productJson: merged as any } })
              .catch(() => null);

            const qs: string[] = Array.isArray(mergedMeta?.missingInfoQuestions)
              ? mergedMeta.missingInfoQuestions
                  .map((q: any) => String(q).trim())
                  .filter(Boolean)
                  .slice(0, 4)
              : [];
            return ask(
              [
                "Para estimar **impuestos** con precisión, necesito afinar 1–3 datos técnicos.",
                "",
                qs.length
                  ? [
                      "Respondeme esto (podés contestar en una sola línea, por ejemplo: `<=5t, no basculante, no frigorifico`):",
                      ...qs.map((q) => `- ${q}`),
                      "",
                    ].join("\n")
                  : "",
                "Con eso ajusto la clasificación internamente y seguimos con el precio/cantidad.",
              ]
                .filter(Boolean)
                .join("\n")
            );
          }

          // decide next step
          if (typeof merged.fobUsd !== "number") {
            await prisma.quote
              .update({ where: { id: active.id }, data: { stage: "awaiting_price" } })
              .catch(() => null);
            return ask(
              "Perfecto. ¿Cuál es el **precio unitario** del producto en **USD**? (ej: `USD 120`)"
            );
          }
          if (typeof merged.quantity !== "number") {
            await prisma.quote
              .update({
                where: { id: active.id },
                data: { stage: "awaiting_quantity" },
              })
              .catch(() => null);
            return ask(
              "Gracias. ¿Cuál es la **cantidad** a importar? (ej: `500 unidades`)"
            );
          }
          return await quoteAndRespond(active.id, merged);
          }
        }

        // If we already have a product context (URL/title) and the user is clearly answering
        // price/quantity, don't loop back to "qué producto".
        const hasContext =
          typeof product?.title === "string" ||
          typeof product?.url === "string" ||
          typeof product?.sourceUrl === "string";
        if (hasContext) {
          await prisma.quote
            .update({ where: { id: active.id }, data: { productJson: product as any } })
            .catch(() => null);

          if (typeof product.fobUsd !== "number") {
            await prisma.quote
              .update({ where: { id: active.id }, data: { stage: "awaiting_price" } })
              .catch(() => null);
            return ask(
              "Perfecto. ¿Cuál es el **precio unitario** del producto en **USD**? (ej: `USD 120`)",
              product
            );
          }
          if (typeof product.quantity !== "number") {
            await prisma.quote
              .update({ where: { id: active.id }, data: { stage: "awaiting_quantity" } })
              .catch(() => null);
            return ask("Gracias. ¿Cuál es la **cantidad** a importar? (ej: `500 unidades`)", product);
          }
          return await quoteAndRespond(active.id, product);
        }

        return ask(
          "Decime **qué producto** querés importar (o pegá el link del proveedor). Ej: `autoelevador eléctrico 3T`."
        );
      }

      if (active.stage === "awaiting_price") {
        // If the user types a NEW product while we were waiting for price (common when a previous
        // quote is still active), treat it as a product switch and reset the flow.
        const hardPrice = parseUnitPriceUsdWithMode(userText, { allowBareNumber: false });
        const hardQty = parseQuantityWithMode(userText, { allowBareNumber: false });
        const looksLikeNewProduct =
          (urlInText || looksLikeProductText(userText)) &&
          hardPrice == null &&
          hardQty == null &&
          !looksLikeJustNumber(userText);
        if (looksLikeNewProduct) {
          const built = await buildProductFromInput(userText);
          // Reset prior captured fields to avoid mixing products.
          // NOTE: if this was a URL, we keep scraped price/currency to avoid re-asking.
          if (!urlInText) {
            delete (built as any).fobUsd;
            delete (built as any).currency;
          }
          delete (built as any).quantity;

          const builtMeta: any = (built as any)?.raw?.ncmMeta;
          const builtCandidates: Array<{ ncmCode: string; title?: string }> =
            Array.isArray(builtMeta?.pcramCandidates) ? builtMeta.pcramCandidates : [];
          // If the input is a supplier link, don't block the flow with technical questions yet.
          // We'll continue with price/quantity first and refine classification later if needed.
          if (
            urlInText &&
            builtCandidates.length >= 2 &&
            (builtMeta?.ambiguous === true || !(built as any)?.ncm)
          ) {
            const { hidden } = buildHiddenChoiceSet(builtCandidates, (built as any)?.ncm, 5);
            (built as any).raw = { ...((built as any).raw ?? {}), ncmChoiceOptions: hidden };
          }

          await prisma.quote
            .update({
              where: { id: active.id },
              data: {
                productJson: built as any,
                stage: typeof (built as any).fobUsd === "number" ? "awaiting_quantity" : "awaiting_price",
              },
            })
            .catch(() => null);
          if (typeof (built as any).fobUsd === "number") {
            if (typeof (built as any).quantity !== "number") {
              return ask("Perfecto. ¿Cuál es la **cantidad** a importar? (ej: `500`)", built);
            }
            return await quoteAndRespond(active.id, built);
          }
          return ask(
            "Perfecto. ¿Cuál es el **precio unitario** del producto en **USD**? (ej: `USD 120`)",
            built
          );
        }

        // If they also provided product details now, enrich context.
        if (urlInText) {
          const built = await buildProductFromInput(userText);
          Object.assign(product, built);
        }

        if (typeof product.fobUsd !== "number") {
          // In price stage, accept a bare number as USD price (as long as it's not a quantity message).
          const loosePrice = parseUnitPriceUsdWithMode(userText, { allowBareNumber: true });
          if (typeof loosePrice === "number") {
            product.fobUsd = loosePrice;
            product.currency = "USD";
          }
        }

        if (typeof product.fobUsd !== "number") {
          return ask(
            "Necesito el **precio unitario en USD** para calcular el total. Ej: `USD 120` (si ponés solo el número, asumimos USD).",
            product
          );
        }
        await prisma.quote
          .update({ where: { id: active.id }, data: { productJson: product as any } })
          .catch(() => null);

        if (typeof product.quantity !== "number") {
          await prisma.quote
            .update({
              where: { id: active.id },
              data: { stage: "awaiting_quantity" },
            })
            .catch(() => null);
          return ask("Perfecto. ¿Cuál es la **cantidad** a importar? (ej: `500`)", product);
        }
        return await quoteAndRespond(active.id, product);
      }

      if (active.stage === "awaiting_quantity") {
        // Allow user to provide product again (corrections) while awaiting quantity.
        const qNow =
          userProvidedUnitPrice(userText)
            ? null
            : parseQuantityWithMode(userText, { allowBareNumber: true });
        if (
          qNow == null &&
          (urlInText || looksLikeProductText(userText)) &&
          !looksLikeJustNumber(userText)
        ) {
          // Treat as a product switch/correction. Reset captured fields to avoid mixing.
          const built = await buildProductFromInput(userText);
          // Keep scraped price/currency when the switch is coming from a URL.
          if (!urlInText) {
            delete (built as any).fobUsd;
            delete (built as any).currency;
          }
          delete (built as any).quantity;
          Object.assign(product, built);
          // If new product requires technical disambiguation, go back to that step.
          const builtMeta: any = (built as any)?.raw?.ncmMeta;
          const builtCandidates: Array<{ ncmCode: string; title?: string }> =
            Array.isArray(builtMeta?.pcramCandidates) ? builtMeta.pcramCandidates : [];
          // If the input is a supplier link, don't block the flow with technical questions yet.
          if (
            urlInText &&
            builtCandidates.length >= 2 &&
            (builtMeta?.ambiguous === true || !(product as any)?.ncm)
          ) {
            const { hidden } = buildHiddenChoiceSet(builtCandidates, (product as any)?.ncm, 5);
            product.raw = { ...(product.raw ?? {}), ncmChoiceOptions: hidden };
          } else if (
            builtCandidates.length >= 2 &&
            (builtMeta?.ambiguous === true || !(product as any)?.ncm)
          ) {
            const { hidden } = buildHiddenChoiceSet(builtCandidates, (product as any)?.ncm, 5);
            product.raw = { ...(product.raw ?? {}), ncmChoiceOptions: hidden };
            await prisma.quote
              .update({
                where: { id: active.id },
                data: { productJson: product as any, stage: "awaiting_product" },
              })
              .catch(() => null);
            const qs: string[] = Array.isArray(builtMeta?.missingInfoQuestions)
              ? builtMeta.missingInfoQuestions
                  .map((q: any) => String(q).trim())
                  .filter(Boolean)
                  .slice(0, 4)
              : [];
            return ask(
              [
                "Ok. Cambiemos de producto.",
                "",
                "Para estimar **impuestos** con precisión, necesito afinar 1–3 datos técnicos.",
                "",
                qs.length
                  ? [
                      "Respondeme esto (podés contestar en una sola línea):",
                      ...qs.map((q) => `- ${q}`),
                      "",
                    ].join("\n")
                  : "",
                "Con eso ajusto la clasificación internamente y seguimos con el precio/cantidad.",
              ]
                .filter(Boolean)
                .join("\n"),
              product
            );
          }
          await prisma.quote
            .update({ where: { id: active.id }, data: { productJson: product as any } })
            .catch(() => null);
        }

        // In this stage, allow bare numbers like "500" as quantity (but never if it's a USD price).
        if (typeof product.quantity !== "number" && !userProvidedUnitPrice(userText)) {
          const qLoose = parseQuantityWithMode(userText, { allowBareNumber: true });
          if (typeof qLoose === "number") product.quantity = qLoose;
        }

        if (typeof product.quantity !== "number") {
          return ask("Necesito la **cantidad**. Ej: `500 unidades`.", product);
        }
        if (typeof product.fobUsd !== "number") {
          await prisma.quote
            .update({ where: { id: active.id }, data: { stage: "awaiting_price" } })
            .catch(() => null);
          return ask(
            "Antes de calcular, decime el **precio unitario en USD**. Ej: `USD 120`.",
            product
          );
        }
        return await quoteAndRespond(active.id, product);
      }
    }

    // If there's no active DB row (cookies blocked, refresh, etc.), reconstruct context from message history.
    const seedText =
      extractUrl(userText) || looksLikeProductText(userText) ? userText : seedForProduct ?? userText;

    const url = extractUrl(seedText);
    const initialProductProvided = url != null || looksLikeProductText(seedText);
    const initial: any = {};
    if (typeof priceUsd === "number") {
      initial.fobUsd = priceUsd;
      initial.currency = "USD";
    }
    if (typeof quantity === "number") initial.quantity = quantity;

    if (!initialProductProvided) {
      // User started with price/quantity only; ask for product.
      const created = await prisma.quote
        .create({
          data: {
            anonId,
            mode: "quote",
            userText,
            productJson: initial as any,
            quoteJson: { awaiting: "product" } as any,
            stage: "awaiting_product",
            userId: userId ?? undefined,
          },
        })
        .catch(() => null);
      return ask(
        "Dale. Ahora decime **qué producto** querés importar (o pegá el link). Ej: `autoelevador eléctrico industrial`."
      );
    }

    const built = await (async () => {
      const b = await buildProductFromInput(seedText);
      const merged: any = { ...(b as any), ...initial };
      // If the URL scraper already found a price (single or range), don't let loose parsing
      // from the user's mixed message overwrite it (e.g. "9,800" → "9.8").
      if ((b as any)?.price && typeof (b as any).price === "object") {
        merged.price = (b as any).price;
      }
      if (typeof (b as any)?.fobUsd === "number") merged.fobUsd = (b as any).fobUsd;
      if (typeof (b as any)?.currency === "string") merged.currency = (b as any).currency;
      return merged;
    })();

    // If PCRAM candidates are ambiguous, ask before moving to price/qty.
    const builtMeta: any = (built as any)?.raw?.ncmMeta;
    const builtCandidates: Array<{ ncmCode: string; title?: string }> =
      Array.isArray(builtMeta?.pcramCandidates) ? builtMeta.pcramCandidates : [];
    if (
      builtCandidates.length >= 2 &&
      (builtMeta?.ambiguous === true || !built?.ncm) &&
      !shouldSkipTechnicalQuestions(built) &&
      // If user provided a supplier link, don't block the flow here.
      // Continue with price/quantity first; refine later if needed.
      !url
    ) {
      const qs: string[] = Array.isArray(builtMeta?.missingInfoQuestions)
        ? builtMeta.missingInfoQuestions
            .map((q: any) => String(q).trim())
            .filter(Boolean)
            .slice(0, 4)
        : [];
      if (qs.length) {
        const { hidden } = buildHiddenChoiceSet(builtCandidates, built?.ncm, 5);
        (built as any).raw = {
          ...((built as any).raw ?? {}),
          ncmChoiceOptions: hidden,
        };
        await prisma.quote
          .create({
            data: {
              anonId,
              mode: "quote",
              userText,
              sourceUrl: url ?? undefined,
              productJson: built as any,
              quoteJson: { awaiting: "ncm_disambiguation" } as any,
              stage: "awaiting_product",
              userId: userId ?? undefined,
            },
          })
          .catch(() => null);

        return ask(
          [
            "Para estimar **impuestos** con precisión, necesito afinar 1–3 datos técnicos.",
            "",
            [
              "Respondeme esto (podés contestar en una sola línea, por ejemplo: `<=5t, no basculante, no frigorifico`):",
              ...qs.map((q) => `- ${q}`),
              "",
            ].join("\n"),
            "Con eso ajusto la clasificación internamente y seguimos con el precio/cantidad.",
          ]
            .filter(Boolean)
            .join("\n")
        );
      }
    }

    // Ask sequentially for missing fields
    if (typeof built.fobUsd !== "number") {
      await prisma.quote
        .create({
          data: {
            anonId,
            mode: "quote",
            userText,
            sourceUrl: url ?? undefined,
            productJson: built as any,
            quoteJson: { awaiting: "unit_price" } as any,
            stage: "awaiting_price",
            userId: userId ?? undefined,
          },
        })
        .catch(() => null);
      return ask(
        "Para estimar el **total puesto en Argentina** necesito el **precio unitario** en **USD**.\n\n¿Cuál es el precio por unidad? (ej: `USD 120`)",
        built
      );
    }

    if (typeof built.quantity !== "number") {
      await prisma.quote
        .create({
          data: {
            anonId,
            mode: "quote",
            userText,
            sourceUrl: url ?? undefined,
            productJson: built as any,
            quoteJson: { awaiting: "quantity" } as any,
            stage: "awaiting_quantity",
            userId: userId ?? undefined,
          },
        })
        .catch(() => null);
      return ask("Perfecto. ¿Cuál es la **cantidad** a importar? (ej: `500 unidades`)", built);
    }

    return await quoteAndRespond(null, built);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado.";
    return NextResponse.json(
      { assistantMessage: `No pude procesar tu solicitud. ${msg}` },
      { status: 500 }
    );
  }
}

