function safeUrl(u: string, base?: string) {
  const s = String(u || "").trim();
  if (!s) return null;
  try {
    return new URL(s, base).toString();
  } catch {
    return null;
  }
}

function stripTracking(url: string) {
  // Preserve main URL but drop obvious trackers; keep query when it likely encodes the asset.
  try {
    const u = new URL(url);
    const keep = new URL(u.toString());
    // Remove common tracking params
    for (const k of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "spm",
      "spm_id_from",
      "scm",
      "algo_pvid",
      "algo_exp_id",
    ]) {
      keep.searchParams.delete(k);
    }
    return keep.toString();
  } catch {
    return url;
  }
}

function isImageUrl(url: string) {
  return /\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(url);
}

function looksLikeThumb(url: string) {
  const u = url.toLowerCase();
  if (/(thumb|thumbnail|small|sprite|icon|logo|avatar)/i.test(u)) return true;
  if (/\b(\d{2,3})x(\d{2,3})\b/.test(u)) {
    const m = u.match(/\b(\d{2,3})x(\d{2,3})\b/);
    const w = m ? Number(m[1]) : NaN;
    const h = m ? Number(m[2]) : NaN;
    if (Number.isFinite(w) && Number.isFinite(h) && (w <= 180 || h <= 180)) return true;
  }
  // Amazon-style resized suffixes: ._SX38_ ._SY50_
  if (/\._s[xy]\d{2,3}_/i.test(u)) return true;
  return false;
}

function keyForDedupe(url: string) {
  // remove query + known size suffixes for better dedupe.
  const noQuery = String(url).split("?")[0] ?? url;
  return noQuery.replace(/\._s[xy]\d{2,4}_[^/]*$/i, "").toLowerCase();
}

export function normalizeAndFilterImages(input: Array<string | undefined | null>, baseUrl?: string) {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of input) {
    const abs = safeUrl(String(raw ?? ""), baseUrl);
    if (!abs) continue;
    if (!isImageUrl(abs)) continue;
    const clean = stripTracking(abs);
    if (looksLikeThumb(clean)) continue;
    const key = keyForDedupe(clean);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
    if (out.length >= 12) break;
  }

  return out;
}

