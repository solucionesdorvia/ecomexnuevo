import "dotenv/config";
import { NextResponse } from "next/server";
import { PcramClient } from "@/lib/pcram/pcramClient";

export const runtime = "nodejs";

const STOPWORDS = new Set([
  "de",
  "del",
  "la",
  "las",
  "el",
  "los",
  "y",
  "o",
  "para",
  "con",
  "sin",
  "por",
  "un",
  "una",
  "unos",
  "unas",
  "en",
  "al",
  "a",
]);

function normText(s: string) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokensFrom(s: string) {
  const t = normText(s);
  if (!t) return [];
  const toks = t
    .split(/\s+/g)
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => x.length >= 4)
    .filter((x) => !STOPWORDS.has(x));
  return [...new Set(toks)].slice(0, 12);
}

function tokenMatchesTitle(token: string, titleNorm: string) {
  const words = titleNorm.split(/\s+/g);
  return words.some((w) => w === token || w.startsWith(token) || token.startsWith(w));
}

function scoreCandidate(query: string, title?: string) {
  const qTokens = tokensFrom(query);
  const tNorm = normText(title ?? "");
  if (!qTokens.length || !tNorm) return 0;
  let hits = 0;
  for (const tok of qTokens) if (tokenMatchesTitle(tok, tNorm)) hits++;
  return hits / qTokens.length;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "ascensor").trim();
  const limit = Number(url.searchParams.get("limit") ?? "12");
  const enrich = url.searchParams.get("enrich") === "1";

  try {
    const client = new PcramClient();
    const candidates = await client.searchNcm(q, { limit: Number.isFinite(limit) ? limit : 12 });
    const enriched = enrich
      ? await Promise.all(
          candidates.map(async (c, idx) => {
            if (c.title) return c;
            if (idx >= 5) return c;
            const d = await client.getDetail(c.ncmCode).catch(() => null);
            return { ...c, title: d?.title || c.title };
          })
        )
      : candidates;

    const scored = enriched
      .map((c) => ({ ...c, score: scoreCandidate(q, c.title) }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    return NextResponse.json({
      ok: true,
      q,
      tokens: tokensFrom(q),
      enrich,
      scored,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, q, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

