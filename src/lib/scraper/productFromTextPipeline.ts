import { classifyWithAI } from "@/lib/ai/ncmClassifier";
import { PcramClient } from "@/lib/pcram/pcramClient";
import { LocalNomenclator } from "@/lib/nomenclator/localNomenclator";

export type TextPipelineResult = {
  ncm?: string;
  pcram?: unknown;
  ncmMeta?: {
    source: "explicit" | "ai" | "pcram_search";
    aiNcm?: string;
    hsHeading?: string;
    kind?: string;
    searchTerms?: string[];
    missingInfoQuestions?: string[];
    adjustedFrom?: string;
    adjustedTo?: string;
    pcramCandidates?: Array<{ ncmCode: string; title?: string }>;
    localCandidates?: Array<{ ncmCode: string; title?: string }>;
    confidence?: number;
    ambiguous?: boolean;
  };
};

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

function uniqueStrings(items: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const v = String(it || "").trim();
    if (!v) continue;
    const key = normText(v);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function expandSearchQueries(input: string) {
  const t = normText(input);
  const queries: string[] = [input];

  // Common Argentina/LatAm terms → PCRAM-friendly synonyms
  if (/\bautoelevad/.test(t)) {
    // PCRAM seems to match better on "carretilla/apilador" than "forklift".
    queries.push("carretilla", "carretillas", "apilador");
  }
  if (/\bmontacarg/.test(t) && !/\bascensor/.test(t)) {
    queries.push("ascensor");
  }
  if (/\belevador\b/.test(t) && !/\bautoelevad/.test(t)) {
    queries.push("ascensor", "elevador vehiculos", "elevador de liquidos");
  }
  if (/\bapilador\b/.test(t)) {
    queries.push("carretilla elevadora", "autoelevador");
  }

  return uniqueStrings(queries).slice(0, 4);
}

const GENERIC_TOKENS = new Set(["elevador", "montacargas", "maquina", "equipo", "producto"]);

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
  // de-dupe while keeping order
  return [...new Set(toks)].slice(0, 12);
}

function tokenMatchesTitle(token: string, titleNorm: string) {
  // Prefer word-boundary-ish matches and prefix matches ("ascensor" ~ "ascensores")
  const words = titleNorm.split(/\s+/g);
  return words.some((w) => w === token || w.startsWith(token) || token.startsWith(w));
}

function scoreCandidate(query: string, title?: string) {
  const qTokens = tokensFrom(query);
  const tNorm = normText(title ?? "");
  if (!qTokens.length || !tNorm) return { score: 0, qTokens };
  let hits = 0;
  for (const tok of qTokens) {
    if (tokenMatchesTitle(tok, tNorm)) hits++;
  }
  return { score: hits / qTokens.length, qTokens };
}

function extractNcmFromText(input: string): string | undefined {
  const s = input || "";
  const dotMatch = s.match(/\b(\d{4}\.\d{2}\.\d{2})\b/);
  if (dotMatch?.[1]) return dotMatch[1];

  const digitsMatch = s.match(/\b(\d{8})\b/);
  if (digitsMatch?.[1]) {
    const d = digitsMatch[1];
    return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}`;
  }

  return undefined;
}

function deriveDisambiguationQuestions(opts: {
  hsHeading?: string;
  kind?: string;
  candidates: Array<{ ncmCode: string; title?: string }>;
}) {
  const hs = (opts.hsHeading ?? "").replace(/\D/g, "");
  const kind = normText(opts.kind ?? "");
  const titles = opts.candidates
    .map((c) => normText(c.title ?? ""))
    .filter(Boolean)
    .slice(0, 10);

  const has = (re: RegExp) => titles.some((t) => re.test(t));
  const questions: string[] = [];

  // Vehicles / tractors (chapter 87) frequently require a couple of hard attributes.
  if (hs === "8704") {
    if (has(/\binferior o igual a 5 t\b/) && has(/\bsuperior a 5 t\b/)) {
      questions.push("¿El **peso total con carga máxima** es **≤ 5 t** o **> 5 t**?");
    } else if (kind.includes("camioneta") || kind.includes("pickup")) {
      questions.push("¿El **peso total con carga máxima** es **≤ 5 t**? (sí/no)");
    }
    if (has(/\bcaja basculante\b/)) {
      questions.push("¿Es una camioneta/camión con **caja basculante**? (sí/no)");
    }
    if (has(/\bfrigorif|isoterm/)) {
      questions.push("¿Es **frigorífico/isotérmico**? (sí/no)");
    }
    if (has(/\bchasis con motor\b/)) {
      questions.push("¿Es **chasis con motor y cabina** o vehículo completo?");
    }
  } else if (hs === "8703") {
    if (has(/\bchispa\b/) && has(/\bcompresion\b/)) {
      questions.push("¿El motor es **nafta (chispa)** o **diésel (compresión)**?");
    }
    if (has(/\bcilindrada\b/)) {
      questions.push("¿Cuál es la **cilindrada (cm³)**? (ej: `2800 cm3`)");
    }
    questions.push("¿Es para **transporte de personas** (auto/SUV) o es **utilitario/carga**?");
  } else if (hs === "8701") {
    if (has(/\btractor(?:es)? de carretera para semirremolques\b/)) {
      questions.push("¿Es **tractor de carretera para semirremolques** (tipo camión) o **tractor agrícola**?");
    }
    if (has(/\borugas\b/)) {
      questions.push("¿Es **tractor de orugas**? (sí/no)");
    }
    if (has(/\bun solo eje\b/)) {
      questions.push("¿Es un **tractor de un solo eje**? (sí/no)");
    }
  }

  return questions.filter(Boolean).slice(0, 4);
}

export async function productFromTextPipeline(text: string): Promise<TextPipelineResult> {
  // If the user provides an explicit NCM in the message, honor it (works even without OpenAI).
  const explicitNcm = extractNcmFromText(text);
  let ncm = explicitNcm;
  let ncmMeta: TextPipelineResult["ncmMeta"] | undefined = explicitNcm
    ? { source: "explicit" }
    : undefined;

  if (!ncm && process.env.OPENAI_API_KEY) {
    const cls = await classifyWithAI(text);
    ncm = cls.ncm_code;
    if (!ncmMeta) ncmMeta = { source: "ai" };
    ncmMeta.aiNcm = cls.ncm_code;
    if (cls.hs_heading) ncmMeta.hsHeading = cls.hs_heading;
    if (cls.kind) ncmMeta.kind = cls.kind;
    if (Array.isArray(cls.search_terms) && cls.search_terms.length) {
      ncmMeta.searchTerms = cls.search_terms.map(String).filter(Boolean).slice(0, 6);
    }
    if (Array.isArray(cls.missing_info_questions) && cls.missing_info_questions.length) {
      ncmMeta.missingInfoQuestions = cls.missing_info_questions;
    }
  }

  // Free "pro" source: local nomenclator index, auto-filled from PCRAM over time.
  try {
    const nom = new LocalNomenclator();
    const aiTerms = ncmMeta?.source === "ai" ? ncmMeta.searchTerms : undefined;
    const base = Array.isArray(aiTerms) && aiTerms.length ? aiTerms[0] : text;
    const hs = ncmMeta?.hsHeading;
    const local = nom.search(base, { limit: 12, hsHeading: hs });
    if (local.length) {
      if (!ncmMeta) ncmMeta = { source: "pcram_search" };
      if (ncmMeta)
        ncmMeta.localCandidates = local.map((r) => ({ ncmCode: r.ncmCode, title: r.title }));
    }
  } catch {
    // ignore
  }

  if (process.env.PCRAM_USER && process.env.PCRAM_PASS) {
    const client = new PcramClient();
    // If NCM came from AI (or is missing), use PCRAM's own search to avoid hallucinated codes.
    if (!explicitNcm) {
      const aiTerms = ncmMeta?.source === "ai" ? ncmMeta.searchTerms : undefined;
      const baseQueries =
        Array.isArray(aiTerms) && aiTerms.length ? aiTerms.map(String) : [text];
      const hs = ncmMeta?.hsHeading;
      const queries = uniqueStrings(
        [
          hs && /^\d{4}$/.test(hs) ? hs : "",
          hs && /^\d{4}$/.test(hs) ? `${hs} ${ncmMeta?.kind ?? ""}` : "",
          ...baseQueries,
        ].flatMap((q) => expandSearchQueries(q))
      ).slice(0, 6);
      const merged: Array<{ ncmCode: string; title?: string; href?: string }> = [];
      const seen = new Set<string>();

      // Seed with local candidates first.
      const localSeed = Array.isArray(ncmMeta?.localCandidates) ? ncmMeta!.localCandidates : [];
      for (const c of localSeed) {
        const ncmCode = String((c as any)?.ncmCode ?? "").trim();
        const key = ncmCode.replace(/\D/g, "");
        if (!key || key.length < 6 || seen.has(key)) continue;
        seen.add(key);
        merged.push({ ncmCode, title: (c as any)?.title });
        if (merged.length >= 8) break;
      }

      for (const q of queries) {
        const found = await client.searchNcm(q, { limit: 10 }).catch(() => []);
        for (const c of found) {
          const key = String(c.ncmCode).replace(/\D/g, "");
          if (!key || seen.has(key)) continue;
          seen.add(key);
          merged.push(c);
          if (merged.length >= 8) break;
        }
        if (merged.length >= 8) break;
      }

      const candidates = merged;
      if (candidates.length) {
        // Enrich missing titles by fetching PCRAM detail for top candidates (even if some already have titles).
        const enriched = await Promise.all(
          candidates.map(async (c, idx) => {
            if (c.title) return c;
            if (idx >= 6) return c;
            const d = await client.getDetail(c.ncmCode).catch(() => null);
            return { ...c, title: d?.title || c.title };
          })
        );

        if (!ncmMeta) ncmMeta = { source: "pcram_search" };
        // If we have a HS heading hint (e.g. vehicles), filter to that heading to avoid irrelevant matches.
        const hs2 = ncmMeta?.hsHeading;
        const filteredByHs =
          hs2 && /^\d{4}$/.test(hs2)
            ? enriched.filter((c) => String(c.ncmCode).replace(/\D/g, "").startsWith(hs2))
            : enriched;

        if (ncmMeta)
          ncmMeta.pcramCandidates = filteredByHs
            .slice(0, 8)
            .map((c) => ({ ncmCode: c.ncmCode, title: c.title }));

        const scoreQuery = [text, ...queries.slice(1)].join(" ");
        const scored = filteredByHs
          .map((c) => {
            const { score } = scoreCandidate(scoreQuery, c.title);
            return { ...c, score };
          })
          .sort((a, b) => b.score - a.score);

        const best = scored[0];
        const second = scored[1];
        const qTokens = tokensFrom(scoreQuery);
        const isGeneric =
          qTokens.length === 1 && GENERIC_TOKENS.has(String(qTokens[0] ?? "").toLowerCase());
        const minScore = isGeneric ? 2 : qTokens.length <= 1 ? 1 : qTokens.length === 2 ? 0.5 : 0.34;
        const bestOk =
          Boolean(best) &&
          best.score >= minScore &&
          (!second || second.score < minScore || best.score - second.score >= 0.2);

        if (ncmMeta) {
          ncmMeta.confidence = best?.score ?? undefined;
          ncmMeta.ambiguous = Boolean(best && !bestOk);
        }

        // If we still can't disambiguate (common for vehicles), generate minimal questions
        // based on what PCRAM candidates differ on, instead of guessing.
        if (filteredByHs.length >= 2 && (ncmMeta?.ambiguous === true || !ncm || !bestOk)) {
          const qs = deriveDisambiguationQuestions({
            hsHeading: ncmMeta?.hsHeading,
            kind: ncmMeta?.kind,
            candidates: filteredByHs.map((c) => ({ ncmCode: c.ncmCode, title: c.title })),
          });
          if (qs.length) {
            if (!ncmMeta) ncmMeta = { source: "pcram_search" };
            ncmMeta.missingInfoQuestions = qs;
          }
        }

        if (!ncm) {
          // Only pick an NCM from PCRAM search if the title actually matches the query.
          if (bestOk) ncm = best!.ncmCode;
        } else if (ncmMeta.source === "ai") {
          const normDigits = String(ncm).replace(/\D/g, "");
          const inCandidates = candidates.some((c) => c.ncmCode.replace(/\D/g, "") === normDigits);
          if (!inCandidates) {
            // Only adjust away from the AI suggestion if we have a strong textual match.
            if (bestOk) {
              const adjustedTo = best!.ncmCode;
              ncmMeta.adjustedFrom = String(ncm);
              ncmMeta.adjustedTo = adjustedTo;
              ncm = adjustedTo;
            } else {
              // If we can't validate, don't pretend we know the NCM.
              ncm = undefined;
            }
          }
        }
      }
    }

    if (ncm) {
      const pcram = await client.getDetail(ncm).catch(() => undefined);
      return { ncm, pcram, ncmMeta };
    }
  }

  if (!ncm) return ncmMeta ? { ncmMeta } : {};
  return { ncm, ncmMeta };
}

