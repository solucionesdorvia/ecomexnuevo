/* eslint-disable @typescript-eslint/no-explicit-any */
// Product text pipeline — dynamic AI JSON responses require any casts.
import { classifyWithAI, type NcmClassification } from "@/lib/ai/ncmClassifier";
import { wearablePcramQueryBoost } from "@/lib/ncm/wearablePcramBoost";
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
    discarded?: Array<{ ncm: string; reason: string }>;
    needsClarification?: boolean;
    /** Metadata de ambigüedad (misma forma que `NcmClassification.ambiguity`). */
    ambiguity?: NonNullable<NcmClassification["ambiguity"]>;
  };
};

function withTimeout<T>(p: Promise<T>, timeoutMs: number): Promise<T> {
  const ms = Math.max(1000, Math.floor(timeoutMs));
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

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

function normText(s: string) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function extractNcmFromText(input: string): string | undefined {
  const s = input || "";
  const dotMatch = s.match(/\b(\d{4}\.\d{2}\.\d{2})\b/);
  if (dotMatch?.[1] && dotMatch[1] !== "9999.99.99") return dotMatch[1];

  const digitsMatch = s.match(/\b(\d{8})\b/);
  if (digitsMatch?.[1]) {
    const d = digitsMatch[1];
    const formatted = `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}`;
    if (formatted === "9999.99.99") return undefined;
    return formatted;
  }

  return undefined;
}

export async function productFromTextPipeline(text: string): Promise<TextPipelineResult> {
  // If the user provides an explicit NCM in the message, honor it (works even without OpenAI).
  const explicitNcm = extractNcmFromText(text);
  let ncm = explicitNcm;
  let ncmMeta: TextPipelineResult["ncmMeta"] | undefined = explicitNcm
    ? { source: "explicit" }
    : undefined;

  if (!ncm && process.env.OPENAI_API_KEY) {
    try {
      const cls = await classifyWithAI(text);
      ncm = cls.ncm_code !== "9999.99.99" ? cls.ncm_code : undefined;
      if (!ncmMeta) ncmMeta = { source: "ai" };
      if (cls.ncm_code !== "9999.99.99") ncmMeta.aiNcm = cls.ncm_code;
      if (typeof cls.confidence === "number") ncmMeta.confidence = cls.confidence;
      if (cls.hs_heading) ncmMeta.hsHeading = cls.hs_heading;
      if (cls.kind) ncmMeta.kind = cls.kind;
      if (Array.isArray(cls.search_terms) && cls.search_terms.length) {
        ncmMeta.searchTerms = cls.search_terms.map(String).filter(Boolean).slice(0, 6);
      }
      if (Array.isArray(cls.missing_info_questions) && cls.missing_info_questions.length) {
        ncmMeta.missingInfoQuestions = cls.missing_info_questions.map(String).filter(Boolean).slice(0, 4);
      }
      if (cls.needs_clarification) ncmMeta.needsClarification = true;
      if (cls.ambiguous) ncmMeta.ambiguous = true;
      if (cls.ambiguity) ncmMeta.ambiguity = cls.ambiguity;
    } catch {
      // In production (e.g. Railway), OpenAI can intermittently fail (timeouts/quotas).
      // Don't abort the entire pipeline; we'll fall back to PCRAM/local evidence below.
      if (!ncmMeta) ncmMeta = { source: "ai" };
      ncmMeta.ambiguous = true;
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
    // Fail-fast: PCRAM (scraper AFIP en vivo) es la principal fuente de latencia.
    // 45s colgaba el chat. 9s alcanza cuando responde; si está lento/caído, corta
    // rápido y la clasificación sigue con el índice offline + anclas.
    const pcramTimeoutMs = Number(process.env.PCRAM_CALL_TIMEOUT_MS ?? "9000");
    // Use PCRAM's own search as *evidence* to support the AI classification.
    if (!explicitNcm) {
      const aiTerms = ncmMeta?.source === "ai" ? ncmMeta.searchTerms : undefined;
      const baseQueries =
        Array.isArray(aiTerms) && aiTerms.length ? aiTerms.map(String) : [text];
      const hs = ncmMeta?.hsHeading;
      const wearBoost = wearablePcramQueryBoost({
        text,
        aiNcmHint: ncm ?? ncmMeta?.aiNcm,
        searchTerms: ncmMeta?.searchTerms,
        kind: ncmMeta?.kind,
      });
      const queries = uniqueStrings(
        [
          ...wearBoost,
          hs && /^\d{4}$/.test(hs) ? hs : "",
          hs && /^\d{4}$/.test(hs) ? `${hs} ${ncmMeta?.kind ?? ""}` : "",
          ...baseQueries,
        ].flatMap((q) => expandSearchQueries(q))
      ).slice(0, 12);
      const merged: Array<{ ncmCode: string; title?: string; href?: string }> = [];
      const seen = new Set<string>();

      const pushCand = (ncmCode: string, title?: string, href?: string) => {
        const key = String(ncmCode).replace(/\D/g, "");
        if (!key || key.length < 6 || seen.has(key)) return;
        seen.add(key);
        merged.push({ ncmCode, title, href });
      };

      // 1) NCM sugerido por IA primero (evita que solo aparezcan teléfonos 8517.11–8517.14).
      if (ncm && ncm !== "9999.99.99") {
        const d = await withTimeout(client.getDetail(ncm), pcramTimeoutMs).catch(() => null);
        pushCand(ncm, typeof (d as any)?.title === "string" ? (d as any).title : undefined);
      }

      // Seed with local candidates first.
      const localSeed = Array.isArray(ncmMeta?.localCandidates) ? ncmMeta!.localCandidates : [];
      for (const c of localSeed) {
        const ncmCode = String((c as any)?.ncmCode ?? "").trim();
        const key = ncmCode.replace(/\D/g, "");
        if (!key || key.length < 6 || seen.has(key)) continue;
        seen.add(key);
        merged.push({ ncmCode, title: (c as any)?.title });
        if (merged.length >= 12) break;
      }

      for (const q of queries) {
        const found = await withTimeout(client.searchNcm(q, { limit: 10 }), pcramTimeoutMs).catch(
          () => []
        );
        for (const c of found) {
          const key = String(c.ncmCode).replace(/\D/g, "");
          if (!key || seen.has(key)) continue;
          seen.add(key);
          merged.push(c);
          if (merged.length >= 14) break;
        }
        if (merged.length >= 14) break;
      }

      const candidates = merged;
      if (candidates.length) {
        // Enrich missing titles by fetching PCRAM detail for top candidates (even if some already have titles).
        const enriched = await Promise.all(
          candidates.map(async (c, idx) => {
            if (c.title) return c;
            if (idx >= 6) return c;
            const d = await withTimeout(client.getDetail(c.ncmCode), pcramTimeoutMs).catch(
              () => null
            );
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
            .slice(0, 12)
            .map((c) => ({ ncmCode: c.ncmCode, title: c.title }));

        // AI "research": choose NCM from the evidence candidate list.
        if (process.env.OPENAI_API_KEY) {
          const evidenceNote = [
            "Elegí el NCM correcto usando SOLO los candidatos provistos.",
            "Priorizá títulos que coincidan con el producto.",
            "Si hay dudas (vehículos), elegí el mejor match por defecto y marcá missing_info_questions para afinar después.",
          ].join(" ");
          const aiPick = await withTimeout(
            classifyWithAI(text, {
              candidates: filteredByHs.map((c) => ({ ncm_code: c.ncmCode, title: c.title })),
              evidenceNote,
            }),
            pcramTimeoutMs
          ).catch(() => null);
          const picked = aiPick?.ncm_code && aiPick.ncm_code !== "9999.99.99" ? aiPick.ncm_code : null;
          if (picked) {
            const prev = ncm;
            ncm = picked;
            if (!ncmMeta) ncmMeta = { source: "ai" };
            if (prev && prev !== picked) {
              ncmMeta.adjustedFrom = String(prev);
              ncmMeta.adjustedTo = picked;
            }
            if (typeof aiPick?.confidence === "number") ncmMeta.confidence = aiPick.confidence;
            if (Array.isArray(aiPick?.discarded) && aiPick.discarded.length) {
              ncmMeta.discarded = aiPick.discarded;
            }
            if (Array.isArray(aiPick?.missing_info_questions) && aiPick.missing_info_questions.length) {
              ncmMeta.missingInfoQuestions = aiPick.missing_info_questions.map(String).filter(Boolean).slice(0, 4);
            }
            if (aiPick?.needs_clarification) ncmMeta.needsClarification = true;
            if (aiPick?.ambiguity) ncmMeta.ambiguity = aiPick.ambiguity;
            ncmMeta.ambiguous = Boolean(
              aiPick?.ambiguous === true ||
                (aiPick && aiPick.confidence != null && aiPick.confidence < 0.55)
            );
          } else {
            // Fallback: if AI cannot pick, default to the top PCRAM candidate.
            const top = filteredByHs?.[0]?.ncmCode;
            if (!ncm && top) {
              ncm = top;
              if (!ncmMeta) ncmMeta = { source: "pcram_search" };
              ncmMeta.ambiguous = true;
            }
          }
        }
      }
    }

    if (ncm) {
      // Try top candidates from the AI (best-effort) to guarantee we get a PCRAM detail when possible.
      const tryCodes = uniqueStrings([ncm]);
      let pcram: any = undefined;
      let used: string | undefined = undefined;
      for (const code of tryCodes.slice(0, 3)) {
        const d = await withTimeout(client.getDetail(code), pcramTimeoutMs).catch(() => undefined);
        if (d) {
          pcram = d;
          used = code;
          break;
        }
      }
      if (pcram) {
        const ncmOfficial =
          typeof (pcram as any)?.ncmCode === "string" && (pcram as any).ncmCode.trim()
            ? String((pcram as any).ncmCode).trim()
            : used ?? ncm;
        return { ncm: ncmOfficial, pcram, ncmMeta };
      }
      // Sin detalle PCRAM: igual devolvemos el NCM inferido (cotización / lab), marcado ambiguo.
      if (ncmMeta) {
        ncmMeta.ambiguous = true;
      }
      return { ncm, ncmMeta, pcram: undefined };
    }
  }

  if (!ncm) return ncmMeta ? { ncmMeta } : {};
  return { ncm, ncmMeta };
}

