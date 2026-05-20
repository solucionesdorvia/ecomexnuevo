/**
 * Pipeline decisivo: filtro duro por tipo de producto, penalización semántica
 * y resolución de ambigüedad a partir de la respuesta del usuario.
 */

import type { NormalizedAmbiguity } from "./ncmAmbiguity";
import type { NcmAmbiguitySnapshot, NcmCandidateItem } from "./types";

/** Señales derivadas del texto y del caso (consumo, wearable, etc.). */
export type ProductClassificationSignals = {
  text: string;
  /** Texto en minúsculas sin acentos para matching */
  textNorm: string;
  wearable: boolean;
  personalDevice: boolean;
  consumerProduct: boolean;
  productTypeFinal: boolean;
  productTypePart: boolean;
};

const WEARABLE_RE =
  /\b(smartwatch|apple watch|galaxy watch|pixel watch|reloj inteligente|reloj conectado|wearable|pulsera inteligente|fitbit|amazfit|huawei watch|xiaomi watch)\b/i;

const PERSONAL_DEVICE_RE =
  /\b(smartphone|celular|teléfono móvil|tablet|ipad|auricular|earbud|notebook|laptop)\b/i;

const CONSUMER_RE =
  /\b(hogar|doméstico|consumo|personal|usuario final|retail|tienda)\b/i;

/** Infraestructura de red / equipamiento carrier — incompatible con wearable/consumo personal. */
const INFRA_NETWORK_DESC =
  /\b(switch(?:es)?\b|router(?:es)?\b|multiplex|multiplexor|multíplex|concentrador(?:es)?|central(?:es)?\s+telef[oó]nica|routing\b|infraestructura\s+de\s+red|equipo[s]?\s+de\s+red\b|conmutador(?:es)?\s+de\s+(?:red|datos|ethernet))\b/i;

const INDUSTRIAL_DESC =
  /\b(industrial|fábrica|planta|línea de producción|maquinaria pesada|equipo de planta)\b/i;

const MEDICAL_TITLE_RE =
  /\b(médico|medicina|diagnóstico|quirúrgico|hospital|clínico|terapéutico|paciente|uso médico)\b/i;

const PART_TITLE_RE =
  /\b(parte|pieza|repuesto|componente|para máquina|accesorio de máquina|no funciona por sí)\b/i;

export function deriveProductSignals(
  technicalText: string,
  opts?: { productType?: string }
): ProductClassificationSignals {
  const text = technicalText.slice(0, 8000);
  const textNorm = normalizeAnswer(text);
  const pt = opts?.productType;
  return {
    text,
    textNorm,
    wearable: WEARABLE_RE.test(text),
    personalDevice: WEARABLE_RE.test(text) || PERSONAL_DEVICE_RE.test(text),
    consumerProduct: CONSUMER_RE.test(text) || WEARABLE_RE.test(text) || !INDUSTRIAL_DESC.test(text),
    productTypeFinal: pt === "final",
    productTypePart: pt === "part",
  };
}

function normalizeAnswer(s: string): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function chapter2(code: string): string {
  const d = String(code ?? "").replace(/\D/g, "");
  return d.length >= 2 ? d.slice(0, 2) : "";
}

/** Primeros 4 dígitos del NCM (partida HS). */
function heading4(code: string): string {
  const d = String(code ?? "").replace(/\D/g, "");
  return d.length >= 4 ? d.slice(0, 4) : "";
}

/** Convierte metadata del chat en forma usada por `resolveAmbiguityDecision`. */
export function snapshotAmbiguityToNormalized(amb: NcmAmbiguitySnapshot): NormalizedAmbiguity {
  return {
    reason: amb.reason,
    competingCandidates: amb.competingCandidates,
    decisiveField: amb.decisiveField,
    primaryQuestion: amb.question,
    secondaryQuestion: amb.secondaryQuestion,
  };
}

export type DiscardedCandidate = { code: string; reason: string };

/** Filtro duro: elimina candidatos de infraestructura de red para consumo / wearable / dispositivo personal. */
export function filterCandidatesByProductType(
  product: ProductClassificationSignals,
  candidates: NcmCandidateItem[]
): { kept: NcmCandidateItem[]; discarded: DiscardedCandidate[] } {
  const mustFilter = product.wearable || product.personalDevice || product.consumerProduct;
  if (!mustFilter || !candidates.length) {
    return { kept: [...candidates], discarded: [] };
  }

  const discarded: DiscardedCandidate[] = [];
  const kept: NcmCandidateItem[] = [];

  for (const c of candidates) {
    const blob = `${c.description} ${c.rationale}`.toLowerCase();
    if (INFRA_NETWORK_DESC.test(blob)) {
      discarded.push({
        code: c.code,
        reason:
          "Descripción alineada a equipos de infraestructura de red (switch/router/multiplex/concentrador/central); no aplica a dispositivo de consumo personal o wearable.",
      });
      continue;
    }
    kept.push(c);
  }

  return { kept: kept.length ? kept : [], discarded };
}

/** Penalización por incompatibilidad semántica (wearable vs industrial, consumo vs maquinaria). */
export function applySemanticPenalty(
  product: ProductClassificationSignals,
  candidates: NcmCandidateItem[]
): NcmCandidateItem[] {
  const PENALTY = 0.4;
  return candidates.map((c) => {
    let penalty = 0;
    const blob = `${c.description} ${c.rationale}`.toLowerCase();
    if ((product.wearable || product.consumerProduct) && INDUSTRIAL_DESC.test(blob) && !product.textNorm.includes("industrial")) {
      penalty += PENALTY;
    }
    if (product.wearable && /\b(maquinaria|industrial|planta|servidor)\b/i.test(blob)) {
      penalty += PENALTY * 0.5;
    }
    const conf = Math.max(0.05, Math.min(1, c.confidence - penalty));
    return {
      ...c,
      confidence: conf,
      rationale:
        penalty > 0
          ? `${c.rationale} — Penalización semántica (−${Math.round(penalty * 100)} pts): posible desajuste consumo/wearable vs perfil industrial.`
          : c.rationale,
    };
  });
}

export type AmbiguityResolutionResult = {
  candidates: NcmCandidateItem[];
  discarded: DiscardedCandidate[];
};

function sortByConfidence(c: NcmCandidateItem[]): NcmCandidateItem[] {
  return [...c].sort((a, b) => b.confidence - a.confidence);
}

/**
 * Interpreta la respuesta del usuario y elimina o penaliza candidatos según la causa de ambigüedad.
 */
export function resolveAmbiguityDecision(
  ambiguity: NormalizedAmbiguity,
  userAnswer: string,
  candidates: NcmCandidateItem[]
): AmbiguityResolutionResult {
  const ans = normalizeAnswer(userAnswer);
  const discarded: DiscardedCandidate[] = [];
  let pool = [...candidates];

  const prioritizeChapter = (ch: string) => {
    pool = sortByConfidence(
      pool.map((c) =>
        chapter2(c.code) === ch
          ? { ...c, confidence: Math.min(1, c.confidence + 0.15) }
          : { ...c, confidence: Math.max(0.05, c.confidence - 0.2) }
      )
    );
  };

  switch (ambiguity.reason) {
    case "communication_vs_processing": {
      const comm =
        /\b(comunica|comunicar|transmite|transmitir|datos|red|celular|telefon|wearable|smartwatch|mensaje|voz|inal[áa]mbric|bluetooth|wifi|lte)\b/.test(
          ans
        );
      const proc =
        /\b(procesa|procesamiento|c[oó]mputo|computadora|notebook|laptop|pc|cpu|inform[aá]tic|datos locales)\b/.test(ans);
      if (comm && !proc) {
        for (const c of [...pool]) {
          const h = heading4(c.code);
          if (h.startsWith("8471")) {
            pool = pool.filter((x) => x.code !== c.code);
            discarded.push({
              code: c.code,
              reason:
                "Respuesta: función principal comunicación/transmisión → se excluyen posiciones 8471 (informática) frente a 8517 (telecomunicaciones).",
            });
          }
        }
      } else if (proc && !comm) {
        for (const c of [...pool]) {
          const h = heading4(c.code);
          if (h.startsWith("8517")) {
            pool = pool.filter((x) => x.code !== c.code);
            discarded.push({
              code: c.code,
              reason:
                "Respuesta: función principal procesamiento informático → se excluyen posiciones 8517 (telecomunicaciones) frente a 8471.",
            });
          }
        }
      }
      break;
    }
    case "part_vs_final": {
      const finalLike =
        /\b(aut[oó]nomo|autónoma|uso propio|producto final|listo para usar|funciona solo|completo)\b/.test(ans);
      const partLike =
        /\b(integrad|componente|parte|repuesto|para m[aá]quina|incorporar en|no funciona por s[ií])\b/.test(ans);
      if (finalLike && !partLike) {
        for (const c of [...pool]) {
          if (PART_TITLE_RE.test(`${c.description} ${c.rationale}`)) {
            pool = pool.filter((x) => x.code !== c.code);
            discarded.push({
              code: c.code,
              reason: "Respuesta: producto final autónomo → se descartan posiciones típicas de partes/componentes.",
            });
          }
        }
      } else if (partLike && !finalLike) {
        for (const c of [...pool]) {
          if (!PART_TITLE_RE.test(`${c.description} ${c.rationale}`) && chapter2(c.code) !== "84") {
            pool = pool.filter((x) => x.code !== c.code);
            discarded.push({
              code: c.code,
              reason: "Respuesta: parte/componente → se priorizan partidas de partes frente a producto acabado.",
            });
          }
        }
      }
      break;
    }
    case "medical_vs_consumer": {
      const med =
        /\b(m[eé]dic|diagn[oó]stic|hospital|cl[ií]nic|quir[uú]rg|terap[eé]utic|paciente|uso m[eé]dico)\b/.test(ans);
      const cons = /\b(consumo|general|hogar|deporte|fitness|wellness|no m[eé]dic)\b/.test(ans);
      if (med && !cons) {
        prioritizeChapter("90");
        for (const c of [...pool]) {
          if (chapter2(c.code) === "30" || /\bmedicamento\b/i.test(c.description)) {
            /* keep pharma if medical - don't drop */
          }
        }
      } else if (cons && !med) {
        for (const c of [...pool]) {
          if (MEDICAL_TITLE_RE.test(`${c.description} ${c.rationale}`)) {
            pool = pool.filter((x) => x.code !== c.code);
            discarded.push({
              code: c.code,
              reason: "Respuesta: uso general/consumo → se descartan posiciones claramente médico-diagnóstico.",
            });
          }
        }
      }
      break;
    }
    case "industrial_vs_domestic": {
      const ind = /\b(industrial|f[aá]brica|planta|profesional)\b/.test(ans);
      const dom = /\b(hogar|dom[eé]stico|particular|consumo)\b/.test(ans);
      if (ind && !dom) {
        for (const c of [...pool]) {
          if (/\bdom[eé]stico|hogar\b/i.test(c.description)) {
            pool = pool.filter((x) => x.code !== c.code);
            discarded.push({
              code: c.code,
              reason: "Respuesta: uso industrial → se descartan descripciones explícitamente domésticas.",
            });
          }
        }
      } else if (dom && !ind) {
        for (const c of [...pool]) {
          if (INDUSTRIAL_DESC.test(c.description)) {
            pool = pool.filter((x) => x.code !== c.code);
            discarded.push({
              code: c.code,
              reason: "Respuesta: uso doméstico/particular → se descartan posiciones de maquinaria industrial.",
            });
          }
        }
      }
      break;
    }
    default:
      break;
  }

  pool = sortByConfidence(pool);

  if (process.env.NCM_DEBUG_CANDIDATES === "1" || process.env.NCM_DEBUG_CANDIDATES === "true") {
     
    console.log("Ambiguity resolved:", {
      reason: ambiguity.reason,
      answer: userAnswer.slice(0, 200),
      removedCandidates: discarded.map((d) => d.code),
      remainingCandidates: pool.map((c) => c.code),
    });
  }

  return { candidates: pool, discarded };
}

/** Aplica filtro duro + penalización semántica y devuelve candidatos reordenados. */
export function runDeterministicCandidateStages(
  product: ProductClassificationSignals,
  candidates: NcmCandidateItem[]
): { candidates: NcmCandidateItem[]; discarded: DiscardedCandidate[] } {
  const { kept, discarded } = filterCandidatesByProductType(product, candidates);
  if (!kept.length) {
    return { candidates: [], discarded };
  }
  const penalized = applySemanticPenalty(product, kept);
  return { candidates: sortByConfidence(penalized), discarded };
}
