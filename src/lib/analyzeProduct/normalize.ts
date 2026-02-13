function stripEmojis(input: string) {
  const s = String(input || "");
  // Extended_Pictographic is supported on modern Node; fallback to broad range if not.
  try {
    // eslint-disable-next-line no-control-regex
    return s.replace(/\p{Extended_Pictographic}+/gu, " ");
  } catch {
    // eslint-disable-next-line no-control-regex
    return s.replace(/[\u{1F300}-\u{1FAFF}]+/gu, " ");
  }
}

function splitLines(input: string) {
  return String(input || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

const NOISE_PHRASES: RegExp[] = [
  /\bfree\s+shipping\b/i,
  /\bbest\s+seller\b/i,
  /\blimited\s+time\b/i,
  /\bflash\s+sale\b/i,
  /\bhot\s+sale\b/i,
  /\bdiscount\b/i,
  /\bdeal\b/i,
  /\boffer\b/i,
  /\bpromo\b/i,
  /\bnew\s+arrival\b/i,
  /\bwholesale\b/i,
  /\b100%\s*(?:original|authentic|genuine)\b/i,
  /\bguarantee\b/i,
  /\bfast\s+delivery\b/i,
  /\ben\s+oferta\b/i,
  /\boferta\b/i,
  /\bdescuento\b/i,
  /\benvío\s+gratis\b/i,
  /\bventa\b/i,
  /\bcomprar\s+ahora\b/i,
  /\bclick\b/i,
  /\badd\s+to\s+cart\b/i,
];

function removeNoiseLines(lines: string[]) {
  const out: string[] = [];
  for (const l of lines) {
    const low = l.toLowerCase();
    if (low.length <= 2) continue;
    // remove mostly-symbol lines
    if (/^[^a-z0-9]{0,6}$/.test(low)) continue;
    if (NOISE_PHRASES.some((re) => re.test(l))) continue;
    out.push(l);
  }
  return out;
}

function normalizeUnits(s: string) {
  let t = String(s || "");
  // Normalize separators
  t = t.replace(/[×✕]/g, "x");
  // Ensure spacing between number+unit
  t = t.replace(/(\d)(mm|cm|m|kg|g|l|ml|w|v|hz)\b/gi, "$1 $2");
  t = t.replace(/(\d)\s*("|\bin\b|\binch(?:es)?\b)/gi, "$1 in");
  t = t.replace(/(\d)\s*(lbs?\b|pounds?\b)/gi, "$1 lb");
  t = t.replace(/(\d)\s*(oz\b|ounces?\b)/gi, "$1 oz");
  // Normalize common materials (keep both Spanish + English keyword)
  t = t.replace(/\bstainless\s+steel\b/gi, "acero inoxidable (stainless steel)");
  t = t.replace(/\baluminum\b/gi, "aluminio (aluminum)");
  t = t.replace(/\baluminium\b/gi, "aluminio (aluminium)");
  t = t.replace(/\bcarbon\s+steel\b/gi, "acero al carbono (carbon steel)");
  t = t.replace(/\bplastic\b/gi, "plástico (plastic)");
  t = t.replace(/\babs\b/gi, "ABS");
  return t;
}

function dedupeLines(lines: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const l of lines) {
    const key = l
      .toLowerCase()
      .normalize("NFD")
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(l);
  }
  return out;
}

export function buildNormalizedDescription(opts: {
  title?: string;
  rawDescription?: string;
  bullets?: string[];
  specs?: Array<{ label: string; value: string }>;
}) {
  const title = opts.title ? String(opts.title).trim() : "";
  const bullets = Array.isArray(opts.bullets) ? opts.bullets.map(String) : [];
  const specs = Array.isArray(opts.specs) ? opts.specs : [];
  const raw = opts.rawDescription ? String(opts.rawDescription) : "";

  const lines = [
    title ? `Título: ${title}` : "",
    ...bullets.map((b) => `- ${b}`),
    ...specs.map((s) => `${s.label}: ${s.value}`),
    raw,
  ]
    .filter(Boolean)
    .join("\n");

  const noEmoji = stripEmojis(lines);
  const normed = normalizeUnits(noEmoji);
  const cleaned = removeNoiseLines(splitLines(normed));
  const deduped = dedupeLines(cleaned);

  // Keep it dense but readable for NCM classification/search.
  return deduped.join("\n").slice(0, 12_000);
}

