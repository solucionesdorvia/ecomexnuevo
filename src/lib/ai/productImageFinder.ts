/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Buscador de imagen real del producto para el presupuesto.
 *
 * Estrategia para NO inventar ni poner fotos random:
 *  1. web_search (Responses API) → URL de la página oficial del producto
 *     (fabricante o retailer/marketplace serio) + confianza.
 *  2. Se baja esa página y se extrae su imagen real (og:image / twitter:image).
 *  3. Se VALIDA que la URL exista y sea una imagen (content-type image/*).
 *  4. Solo se devuelve si hay confianza suficiente y la imagen valida.
 *     Ante cualquier duda → null (el presupuesto muestra el placeholder).
 *
 * Es best-effort: nunca devuelve una URL no verificada.
 */

import "dotenv/config";

export type ProductImageResult = {
  imageUrl: string;
  sourceUrl: string;
  confidence: number;
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export function isImageSearchEnabled(): boolean {
  const v = (process.env.PRODUCT_IMAGE_SEARCH ?? "1").trim().toLowerCase();
  return v !== "0" && v !== "false" && v !== "off";
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function collectOutputText(json: any): string {
  if (Array.isArray(json?.output)) {
    const t = json.output
      .flatMap((o: any) => (Array.isArray(o?.content) ? o.content : []))
      .filter((c: any) => c?.type === "output_text" && typeof c?.text === "string")
      .map((c: any) => c.text)
      .join("");
    if (t.trim()) return t;
  }
  if (typeof json?.output_text === "string") return json.output_text;
  return "";
}

const SYSTEM = [
  "Sos un asistente que encuentra la página oficial de un producto para obtener su foto.",
  "Buscá en internet la página del FABRICANTE o de un retailer/marketplace serio que muestre EXACTAMENTE este producto.",
  "Devolvé SOLO un JSON: { \"pageUrl\": string|null, \"confidence\": number }.",
  "- pageUrl: URL de una página que claramente muestra este producto (con su foto).",
  "- confidence 0..1: 0.8+ solo si estás seguro de que es el producto exacto; <0.5 si dudás.",
  "- Si no encontrás una página confiable, devolvé pageUrl:null.",
  "No inventes URLs: devolvé solo páginas que realmente existan y hayas encontrado en la búsqueda.",
].join("\n");

async function findOfficialPageUrl(
  title: string,
  ncm: string | undefined,
  timeoutMs: number
): Promise<{ pageUrl: string; confidence: number } | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.OPENAI_WEBSEARCH_MODEL ?? "gpt-4o-mini";
  const toolType = process.env.OPENAI_WEBSEARCH_TOOL ?? "web_search_preview";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        tools: [{ type: toolType }],
        input: [
          { role: "system", content: [{ type: "input_text", text: SYSTEM }] },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [`Producto: ${title}`, ncm ? `NCM: ${ncm}` : ""].filter(Boolean).join("\n"),
              },
            ],
          },
        ],
      }),
    });
    const json = await res.json();
    if (!res.ok) return null;
    const jsonText = extractJsonObject(collectOutputText(json).trim());
    if (!jsonText) return null;
    const parsed = JSON.parse(jsonText);
    const pageUrl = typeof parsed?.pageUrl === "string" ? parsed.pageUrl.trim() : "";
    const confidence = Math.max(0, Math.min(1, Number(parsed?.confidence ?? 0)));
    if (!/^https?:\/\//i.test(pageUrl)) return null;
    return { pageUrl, confidence };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function resolveUrl(maybeUrl: string, base: string): string | null {
  try {
    return new URL(maybeUrl, base).toString();
  } catch {
    return null;
  }
}

/** Baja la página y extrae og:image / twitter:image (imagen real de la página). */
async function extractOgImage(pageUrl: string, timeoutMs: number): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(pageUrl, {
      signal: controller.signal,
      headers: { "user-agent": UA, accept: "text/html" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 400_000);
    const patterns = [
      /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]) {
        const abs = resolveUrl(m[1].trim(), pageUrl);
        if (abs) return abs;
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Verifica que la URL exista y sea una imagen real (no un pixel ni un 404). */
async function validateImage(url: string, timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": UA },
      redirect: "follow",
    });
    if (!res.ok) return false;
    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    const len = Number(res.headers.get("content-length") ?? "0");
    try {
      await res.body?.cancel();
    } catch {
      /* noop */
    }
    if (!ct.startsWith("image/")) return false;
    if (len && len < 2048) return false; // descarta pixeles/íconos diminutos
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Devuelve la imagen real del producto, o null si no se pudo verificar una.
 */
export async function findProductImage(
  title: string,
  opts?: { ncm?: string; minConfidence?: number; timeoutMs?: number }
): Promise<ProductImageResult | null> {
  if (!isImageSearchEnabled()) return null;
  const t = String(title || "").trim();
  if (!t) return null;

  const minConfidence = opts?.minConfidence ?? 0.55;
  const timeoutMs = opts?.timeoutMs ?? Number(process.env.PRODUCT_IMAGE_SEARCH_TIMEOUT_MS ?? "20000");

  const page = await findOfficialPageUrl(t, opts?.ncm, timeoutMs).catch(() => null);
  if (!page || page.confidence < minConfidence) return null;

  const imageUrl = await extractOgImage(page.pageUrl, 12_000).catch(() => null);
  if (!imageUrl) return null;

  const ok = await validateImage(imageUrl, 10_000).catch(() => false);
  if (!ok) return null;

  return { imageUrl, sourceUrl: page.pageUrl, confidence: page.confidence };
}
