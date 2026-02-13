import type { ExtractedPriceCandidate, Price } from "@/lib/analyzeProduct/types";

function normalizeNumberLike(input: string) {
  // Accept "1.500,50" or "1,500.50" or "9,800" or "15.000" (thousands)
  const s = String(input || "").trim();
  if (!s) return "";
  const cleaned = s.replace(/[^\d.,]/g, "");
  if (!cleaned) return "";

  const hasDot = cleaned.includes(".");
  const hasComma = cleaned.includes(",");

  // Both separators present: decide thousands vs decimal by last occurrence.
  if (hasDot && hasComma) {
    const lastDot = cleaned.lastIndexOf(".");
    const lastComma = cleaned.lastIndexOf(",");
    const dotIsDecimal = lastDot > lastComma;
    if (dotIsDecimal) {
      // 1,234.56 → remove commas
      return cleaned.replace(/,/g, "");
    }
    // 1.234,56 → remove dots, comma decimal
    return cleaned.replace(/\./g, "").replace(/,/g, ".");
  }

  if (hasComma) {
    // If comma looks like thousands separator (9,800 or 1,234,567) → remove commas
    if (/^\d{1,3}(,\d{3})+$/.test(cleaned) || /^\d+(,\d{3})+$/.test(cleaned)) {
      return cleaned.replace(/,/g, "");
    }
    // If single comma with exactly 3 digits after → thousands
    const m = cleaned.match(/^(\d+),(\d{3})$/);
    if (m) return `${m[1]}${m[2]}`;
    // Else treat comma as decimal
    return cleaned.replace(/,/g, ".");
  }

  if (hasDot) {
    // If dot looks like thousands separator (15.000 or 1.234.567) → remove dots
    if (/^\d{1,3}(\.\d{3})+$/.test(cleaned) || /^\d+(\.\d{3})+$/.test(cleaned)) {
      return cleaned.replace(/\./g, "");
    }
    // If single dot with exactly 3 digits after → thousands
    const m = cleaned.match(/^(\d+)\.(\d{3})$/);
    if (m) return `${m[1]}${m[2]}`;
    // Else dot is decimal
    return cleaned;
  }

  return cleaned;
}

function normalizeCurrency(cur?: string) {
  const c = String(cur ?? "").trim().toUpperCase();
  if (!c) return "";
  if (c === "US$" || c === "U$S") return "USD";
  if (c === "RMB") return "CNY";
  if (c === "YUAN") return "CNY";
  if (c === "CN¥") return "CNY";
  return c;
}

function currencyFromText(s: string) {
  const t = s.toUpperCase();
  if (/\bUSD\b|US\$|U\$S/.test(t)) return "USD";
  if (/\bCNY\b|\bRMB\b|¥/.test(t)) return "CNY";
  if (/\bEUR\b|€/.test(t)) return "EUR";
  return "";
}

function unitFromText(s: string) {
  const t = s.toLowerCase();
  const units = [
    { re: /\bper\s+piece\b|\b\/\s*piece\b|\bpcs?\b|\bpieza(s)?\b/i, unit: "piece" },
    { re: /\bper\s*kg\b|\b\/\s*kg\b|\bkg\b/i, unit: "kg" },
    { re: /\bper\s*set\b|\b\/\s*set\b|\bset\b|\bjuego\b/i, unit: "set" },
    { re: /\bper\s*meter\b|\b\/\s*m\b|\bmetro(s)?\b/i, unit: "meter" },
  ];
  for (const u of units) if (u.re.test(t)) return u.unit;
  return "";
}

type Parsed = {
  type: "single" | "range";
  min: number;
  max: number | null;
  currency: string;
  unit: string;
  score: number;
};

function parseCandidate(c: ExtractedPriceCandidate): Parsed | null {
  const raw = String(c.text || "").replace(/\s+/g, " ").trim();
  if (!raw) return null;
  const currency = normalizeCurrency(c.hintCurrency) || currencyFromText(raw) || "";
  const unit = c.hintUnit || unitFromText(raw) || "";
  const hasDecimal = /[.,]\d{1,2}\b/.test(raw);
  const looksIntegerOnly = /^[^\d]*\d+[^\d]*$/.test(raw) && !hasDecimal;

  // Common range patterns: "US$ 12.3 - 15.9 / piece", "12.3~15.9"
  const range =
    raw.match(/([0-9][0-9.,]{0,14})\s*(?:-|~|to)\s*([0-9][0-9.,]{0,14})/i) ??
    null;
  if (range?.[1] && range?.[2]) {
    const a = Number(normalizeNumberLike(range[1]));
    const b = Number(normalizeNumberLike(range[2]));
    if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) {
      const min = Math.min(a, b);
      const max = Math.max(a, b);
      const score =
        (c.source === "jsonld" ? 0.9 : c.source === "meta" ? 0.8 : c.source === "dom" ? 0.6 : 0.5) +
        (currency ? 0.1 : 0) +
        (unit ? 0.05 : 0);
      return { type: "range", min, max, currency, unit, score };
    }
  }

  // Single value patterns. We avoid grabbing huge numbers that look like counts.
  const single = raw.match(/(?:\bUSD\b|US\$|U\$S|¥|RMB|CNY|€|\$)?\s*([0-9][0-9.,]{0,14})/i);
  if (single?.[1]) {
    const v = Number(normalizeNumberLike(single[1]));
    if (Number.isFinite(v) && v > 0 && v < 50_000_000) {
      const score =
        (c.source === "jsonld" ? 0.85 : c.source === "meta" ? 0.75 : c.source === "dom" ? 0.6 : 0.5) +
        (currency ? 0.1 : 0) +
        (unit ? 0.05 : 0) +
        (c.source === "dom" && hasDecimal ? 0.12 : 0) +
        (c.source === "jsonld" && (currency === "USD" || currency === "") && looksIntegerOnly ? -0.18 : 0);
      return { type: "single", min: v, max: null, currency, unit, score };
    }
  }

  return null;
}

export function chooseBestPrice(candidates: ExtractedPriceCandidate[]): Price {
  const parsed = candidates
    .map(parseCandidate)
    .filter((x): x is Parsed => Boolean(x))
    .sort((a, b) => b.score - a.score);

  let best = parsed[0];
  if (!best) {
    return { type: "unknown", min: null, max: null, currency: "", unit: "" };
  }

  // Heuristic: some sources (notably Amazon) sometimes expose cents-like integers (e.g. "890" for "$8.90")
  // alongside a correctly formatted DOM price. If we detect an exact ~100x discrepancy, prefer the smaller.
  if (
    best.type === "single" &&
    (best.currency === "USD" || best.currency === "") &&
    Number.isInteger(best.min) &&
    best.min >= 100
  ) {
    const alt = parsed.find((p) => {
      if (!p || p === best) return false;
      if (p.type !== "single") return false;
      if (!(p.currency === best.currency || p.currency === "" || best.currency === "")) return false;
      if (!(p.min > 0 && best!.min > 0)) return false;
      const ratio = best!.min / p.min;
      return ratio > 95 && ratio < 105; // ~100x
    });
    if (alt && alt.min < best.min) {
      best = { ...alt, currency: best.currency || alt.currency };
    }
  }

  if (best.type === "range") {
    return {
      type: "range",
      min: Math.round(best.min * 100) / 100,
      max: Math.round((best.max ?? best.min) * 100) / 100,
      currency: best.currency || "",
      unit: best.unit || "",
    };
  }

  return {
    type: "single",
    min: Math.round(best.min * 100) / 100,
    max: null,
    currency: best.currency || "",
    unit: best.unit || "",
  };
}

