/**
 * State machine inference, NCM disambiguation, and vehicle inference helpers.
 */

import type { IncomingMessage } from "./chatParsers";
import { looksLikeFreshProductIntent } from "./chatParsers";

export type StageHint = "awaiting_product" | "awaiting_price" | "awaiting_quantity" | null;

export function withTimeout<T>(p: Promise<T>, timeoutMs: number): Promise<T> {
  const ms = Math.max(1000, Math.floor(timeoutMs));
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

export function inferStageHintFromMessages(messages: IncomingMessage[]): StageHint {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m || m.role !== "assistant") continue;
    const t = String(m.content || "").toLowerCase();
    if (/precio unitario|precio por unidad|usd 120|solo el número/i.test(t)) return "awaiting_price";
    if (/cantidad|unidades|pcs|piezas/i.test(t)) return "awaiting_quantity";
    if (/qué producto|que producto|peg[aá]\s+el\s+link/i.test(t)) return "awaiting_product";
    if (/total puesto en argentina|impuestos argentinos|flete internacional/i.test(t)) return null;
  }
  return null;
}

export function inferSeedForProductFromMessages(messages: IncomingMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m || m.role !== "user") continue;
    const txt = String(m.content || "").trim();
    if (!txt) continue;
    if (looksLikeFreshProductIntent(txt)) return txt;
  }
  return null;
}

export function extractNcmFromText(text: string): string | null {
  const s = String(text || "");
  const dot = s.match(/\b(\d{4}\.\d{2}\.\d{2})\b/);
  if (dot?.[1] && dot[1] !== "9999.99.99") return dot[1];
  const digits = s.match(/\b(\d{8})\b/);
  if (digits?.[1]) {
    const d = digits[1];
    const formatted = `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}`;
    if (formatted === "9999.99.99") return null;
    return formatted;
  }
  return null;
}

export function isValidNcmCode(ncm: unknown): ncm is string {
  const s = String(ncm ?? "").trim();
  if (!/^\d{4}\.\d{2}\.\d{2}$/.test(s)) return false;
  return s !== "9999.99.99";
}

export function parseChoiceIndex(text: string): number | null {
  const t = String(text || "").trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  if (n < 1 || n > 5) return null;
  return n;
}

export function parseAssumptionUpdate(text: string): { origin?: string; shippingProfile?: "light" | "medium" | "heavy" } | null {
  const raw = String(text || "").trim();
  if (!raw) return null;

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

export function applyAssumptionUpdate(product: Record<string, unknown>, upd: { origin?: string; shippingProfile?: "light" | "medium" | "heavy" }) {
  if (!product || typeof product !== "object") return product;
  if (upd.origin) product.origin = upd.origin;
  if (upd.shippingProfile) {
    product.raw = { ...((product.raw as Record<string, unknown>) ?? {}), shippingProfile: upd.shippingProfile };
  }
  return product;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function validateNoGuessQuoteInputs(product: Record<string, unknown>, _opts?: { requireNcm?: boolean }) {
  const missing: string[] = [];
  const questions: string[] = [];

  const hasPriceRange =
    (product?.price as Record<string, unknown>)?.type === "range" &&
    typeof (product?.price as Record<string, unknown>)?.min === "number" &&
    typeof (product?.price as Record<string, unknown>)?.max === "number" &&
    Number.isFinite((product?.price as Record<string, unknown>)?.min as number) &&
    Number.isFinite((product?.price as Record<string, unknown>)?.max as number) &&
    ((product?.price as Record<string, unknown>)?.min as number) > 0 &&
    ((product?.price as Record<string, unknown>)?.max as number) > 0;
  const hasUnitPrice =
    typeof product?.fobUsd === "number" && Number.isFinite(product.fobUsd as number) && (product.fobUsd as number) > 0;
  if (!hasPriceRange && !hasUnitPrice) {
    missing.push("precio");
    questions.push("¿Cuál es el **precio** en **USD**? (valor FOB o precio del proveedor)");
  }

  return { ok: missing.length === 0, missing, questions };
}

export function originFromPurchaseUrl(u?: string) {
  const raw = String(u ?? "").trim();
  if (!raw) return null;
  try {
    const h = new URL(raw).hostname.replace(/^www\./i, "").toLowerCase();
    if (/alibaba|1688|made-in-china|taobao|tmall/.test(h)) return "China";
    if (/amazon\./.test(h)) return "Marketplace (Amazon)";
    if (/mercadolibre|mercado libre/.test(h)) return "Marketplace (Mercado Libre)";
    return h;
  } catch {
    return null;
  }
}

export function buildHiddenChoiceSet(
  candidates: Array<{ ncmCode: string; title?: string }>,
  _currentNcm?: string,
  limit = 5
) {
  const keep = Math.max(12, limit);
  const hidden = candidates.slice(0, keep);
  return { hidden };
}

export function normLooseText(s: string) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function inferVehicleDefaultsFromTitle(title: string) {
  const t = normLooseText(title);
  if (!t) return null;

  const mentionsBasculante = /\bbasculant/.test(t);
  const mentionsFrigo = /\bfrigor|isoterm/.test(t);
  const mentionsVolquete = /\bvolquete\b/.test(t);
  const mentionsChasis = /\bchasis\b/.test(t);

  const isPickup =
    /\b(pickup|pick up|pick-up)\b/.test(t) ||
    /\b(camioneta|utilitario)\b/.test(t) ||
    /\b(hilux|ranger|amarok|frontier|navara|np300|l200|triton|dmax|d max|s10|s 10|maverick|f-150|f150|f 150|toro|oroch|alaskan|montana|strada)\b/.test(t);

  if (!isPickup) return null;
  if (mentionsVolquete || mentionsChasis) return null;

  return {
    kind: "pickup" as const,
    le5t: true,
    basculante: mentionsBasculante ? null : false,
    frigo: mentionsFrigo ? null : false,
  };
}

export function maybeAutoResolveKnownVehicle(product: Record<string, unknown>) {
  const title = String(product?.title ?? "").trim();
  if (!title) return product;

  const defaults = inferVehicleDefaultsFromTitle(title);
  if (!defaults) return product;

  const meta = product?.raw as Record<string, unknown> | undefined;
  const candidates: Array<{ ncmCode: string; title?: string }> = Array.isArray(
    (meta?.ncmMeta as Record<string, unknown>)?.pcramCandidates
  )
    ? (meta?.ncmMeta as Record<string, unknown>).pcramCandidates as Array<{ ncmCode: string; title?: string }>
    : [];
  if (!candidates.length) return product;

  const pool = candidates
    .map((c) => ({ ...c, titleNorm: normLooseText(c.title ?? "") }))
    .filter((c) => c.ncmCode);

  let filtered = pool;
  if (defaults.le5t) filtered = filtered.filter((c) => /inferior o igual a 5 t/.test(c.titleNorm));
  if (defaults.basculante === false) filtered = filtered.filter((c) => !/basculante/.test(c.titleNorm));
  if (defaults.frigo === false) filtered = filtered.filter((c) => !/frigor|isoterm/.test(c.titleNorm));
  filtered = filtered.filter((c) => !/volquete/.test(c.titleNorm));

  const preferred = filtered.filter((c) => /\blos demas\b/.test(c.titleNorm));
  const final = preferred.length ? preferred : filtered;

  if (final.length === 1) {
    product.ncm = final[0]!.ncmCode;
    const raw = product.raw as Record<string, unknown> | undefined;
    if (raw?.ncmMeta) {
      (raw.ncmMeta as Record<string, unknown>).ambiguous = false;
    }
    if (product.raw) delete (product.raw as Record<string, unknown>).ncmChoiceOptions;
  }

  return product;
}

export function shouldSkipTechnicalQuestions(product: Record<string, unknown>) {
  const vi = (product?.raw as Record<string, unknown> | undefined)?.vehicleInference as
    | { kind?: string; confidence?: number }
    | undefined;
  const nm = (product?.raw as Record<string, unknown> | undefined)?.ncmMeta as Record<string, unknown> | undefined;
  if (!product?.ncm) return false;
  // Vehículos con alta confianza: saltear preguntas técnicas incluso si hay ambigüedad menor
  if (vi && typeof vi.confidence === "number" && vi.confidence >= 0.75) return true;
  // Ambigüedad activa (no resuelta): preguntar siempre
  if (nm?.ambiguous === true) return false;
  const hs = String(nm?.hsHeading ?? "").replace(/\D/g, "");
  if (hs.startsWith("87")) return true;
  return false;
}

export function tryPickNcmCandidateFromHints(
  candidates: Array<{ ncmCode: string; title?: string }>,
  userText: string
): { ncmCode: string } | null {
  const t = normLooseText(userText);
  if (!t || candidates.length < 2) return null;

  const wantsLe5t = /(<=\s*5\s*t|≤\s*5\s*t|hasta\s*5\s*t|menor\s+o\s+igual\s+a\s*5\s*t|\b5\s*t\s*o\s*menos\b)/i.test(userText);
  const wantsGt5t = /(>\s*5\s*t|mas\s+de\s*5\s*t|mayor\s+a\s*5\s*t|superior\s+a\s*5\s*t)/i.test(userText);

  const basculanteNo = /\b(no|sin)\s+basculant/.test(t);
  const basculanteYes = /\bbasculant/.test(t) && !basculanteNo && /\b(si|sí)\b/.test(t);
  const frigoNo = /\b(no|sin)\s+(frigor|isoterm)/.test(t);
  const frigoYes = /\b(frigo|frigor|isoterm)/.test(t) && !frigoNo && /\b(si|sí)\b/.test(t);
  const chasisNo = /\b(no|sin)\s+chasis\b/.test(t);
  const chasisYes = /\bchasis\b/.test(t) && !chasisNo && /\b(si|sí)\b/.test(t);

  const pool = candidates.map((c) => ({ ...c, titleNorm: normLooseText(c.title ?? "") })).filter((c) => c.ncmCode);

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

// Disabled: system auto-picks the best NCM without asking users technical questions.
export function deriveBasicNcmQuestions(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _opts: { hsHeading?: string; kind?: string; candidates: Array<{ ncmCode: string; title?: string }> }
): string[] {
  return [];
}

export function looksLikeNcmDisagreement(text: string) {
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

export function looksLikeClassificationAnswer(text: string) {
  const raw = String(text || "").trim();
  if (!raw) return false;
  const t = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

  const hasMarkers =
    /<=\s*5\s*t|≤\s*5\s*t|\b5\s*t\b/.test(t) ||
    /\b(basculant|frigor|isoterm|chasis|orugas|semirremolque)\b/.test(t) ||
    /\b(personas|carga|utilitario)\b/.test(t) ||
    /\b(cm3|cilindrada)\b/.test(t) ||
    /\b(diesel|nafta|gasolina|electrico|hibrid)\b/.test(t) ||
    /\b(si|sí|no)\b/.test(t);

  return hasMarkers && t.length <= 120;
}

export function looksLikeOnlyNcmCodeTitle(title?: string) {
  const t = String(title ?? "").trim();
  return /^\d{4}\.\d{2}\.\d{2}$/.test(t) || /^\d{8}$/.test(t);
}
