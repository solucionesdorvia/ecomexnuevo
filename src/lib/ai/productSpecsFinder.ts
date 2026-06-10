/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Buscador de ficha técnica por web (Fase 0.c del Motor de Cotización).
 *
 * Cuando falta el peso/dimensiones de un producto, busca su ficha técnica en
 * internet (por marca/modelo) usando el tool `web_search` de la Responses API
 * de OpenAI y extrae peso + dimensiones con el mismo modelo (parser IA).
 *
 * Es BEST-EFFORT: ante cualquier problema (sin API key, modelo sin soporte de
 * web_search, timeout, JSON inválido) devuelve null y el caller cae a su
 * fallback (estimación por IA y, en última instancia, por NCM en el motor).
 */

import "dotenv/config";

export type ProductDimensionsCm = {
  length: number;
  width: number;
  height: number;
};

export type ProductSpecs = {
  /** Peso por unidad en kg (con packaging cuando aplica). */
  weightKgPerUnit: number | null;
  /** Dimensiones por unidad en cm (largo × ancho × alto), si se encontraron. */
  dimensionsCm: ProductDimensionsCm | null;
  /** 0..1 — qué tan confiable es el dato hallado. */
  confidence: number;
  /** Frase corta de dónde sale el dato. */
  source: string | null;
  /** URL de la fuente, si el modelo la reporta. */
  sourceUrl: string | null;
};

/** ¿Está habilitada la búsqueda web? Default: habilitada (se apaga con "0"/"false"). */
export function isWebSpecsSearchEnabled(): boolean {
  const v = (process.env.PRODUCT_SPECS_WEBSEARCH ?? "1").trim().toLowerCase();
  return v !== "0" && v !== "false" && v !== "off";
}

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Extrae el primer objeto JSON balanceado de un texto (tolera prosa alrededor). */
function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/** Junta todo el texto de salida (`output_text`) de una respuesta de la Responses API. */
function collectOutputText(json: any): string {
  if (Array.isArray(json?.output)) {
    const fromOutput = json.output
      .flatMap((o: any) => (Array.isArray(o?.content) ? o.content : []))
      .filter((c: any) => c?.type === "output_text" && typeof c?.text === "string")
      .map((c: any) => c.text)
      .join("");
    if (fromOutput.trim()) return fromOutput;
  }
  if (typeof json?.output_text === "string") return json.output_text;
  return "";
}

const SYSTEM = [
  "Sos un investigador de especificaciones técnicas de productos para importación a Argentina.",
  "Tarea: buscá en internet la ficha técnica del producto indicado (por marca/modelo) y devolvé su",
  "peso y dimensiones por unidad. Preferí fuentes oficiales del fabricante o retailers serios.",
  "",
  "Reglas:",
  "- weightKgPerUnit: peso por unidad en kg. Para electrónica de consumo, usá el peso con caja/packaging de envío si está.",
  "- dimensionsCm: dimensiones de la caja/unidad en cm como { length, width, height }. Si no las encontrás, null.",
  "- confidence 0..1: 0.9+ solo si hallaste el peso del modelo exacto en una fuente confiable;",
  "  0.7-0.89 si es razonable; <0.7 si es dudoso o tuviste que estimar.",
  "- Si NO encontrás datos útiles, devolvé found:false con weightKgPerUnit:null.",
  "- Respondé SOLO un objeto JSON, sin texto adicional.",
  "",
  'Formato: { "found": boolean, "weightKgPerUnit": number|null, "dimensionsCm": {"length":number,"width":number,"height":number}|null, "confidence": number, "source": string|null, "sourceUrl": string|null }',
].join("\n");

/**
 * Busca la ficha técnica del producto en la web y devuelve peso/dimensiones.
 * Devuelve null si no hay API key, la búsqueda está deshabilitada, o falla.
 */
export async function fetchProductSpecsFromWeb(
  title: string,
  opts?: { ncm?: string; timeoutMs?: number; model?: string }
): Promise<ProductSpecs | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (!isWebSpecsSearchEnabled()) return null;

  const t = String(title || "").trim();
  if (!t) return null;

  const model = opts?.model ?? process.env.OPENAI_WEBSEARCH_MODEL ?? "gpt-4o-mini";
  // Nombre del tool configurable: la API lo renombró de "web_search_preview" a "web_search".
  const toolType = process.env.OPENAI_WEBSEARCH_TOOL ?? "web_search_preview";
  const timeoutMs = opts?.timeoutMs ?? Number(process.env.PRODUCT_SPECS_WEBSEARCH_TIMEOUT_MS ?? "25000");

  const userText = [
    `Producto: ${t}`,
    opts?.ncm ? `Clasificación arancelaria (NCM): ${opts.ncm}` : "",
    "Buscá su ficha técnica y devolvé peso y dimensiones por unidad.",
  ]
    .filter(Boolean)
    .join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        tools: [{ type: toolType }],
        input: [
          { role: "system", content: [{ type: "input_text", text: SYSTEM }] },
          { role: "user", content: [{ type: "input_text", text: userText }] },
        ],
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      console.warn(
        "[productSpecsFinder] web_search no disponible o error:",
        json?.error?.message ?? res.status
      );
      return null;
    }

    const text = collectOutputText(json).trim();
    const jsonText = extractJsonObject(text);
    if (!jsonText) return null;

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return null;
    }

    if (parsed?.found === false) {
      return {
        weightKgPerUnit: null,
        dimensionsCm: null,
        confidence: 0,
        source: typeof parsed?.source === "string" ? parsed.source : null,
        sourceUrl: typeof parsed?.sourceUrl === "string" ? parsed.sourceUrl : null,
      };
    }

    const weight = num(parsed?.weightKgPerUnit);
    const dimsRaw = parsed?.dimensionsCm;
    const l = num(dimsRaw?.length);
    const w = num(dimsRaw?.width);
    const h = num(dimsRaw?.height);
    const dimensionsCm = l && w && h ? { length: l, width: w, height: h } : null;
    const confidence = Math.max(0, Math.min(1, Number(parsed?.confidence ?? 0)));

    return {
      weightKgPerUnit: weight,
      dimensionsCm,
      confidence,
      source: typeof parsed?.source === "string" ? parsed.source.trim() || null : null,
      sourceUrl: typeof parsed?.sourceUrl === "string" ? parsed.sourceUrl.trim() || null : null,
    };
  } catch (e) {
    console.warn("[productSpecsFinder] fallo búsqueda web:", e instanceof Error ? e.message : e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
