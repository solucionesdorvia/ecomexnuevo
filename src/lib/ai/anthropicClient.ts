/* eslint-disable @typescript-eslint/no-explicit-any */
// Cliente Anthropic (Claude) vía HTTP — mismo estilo que openaiClient.
// Se usa para clasificación NCM con Opus 4.8 + caché de prompt (el prompt grande
// se cachea, así repetir consultas cuesta ~10x menos).
import "dotenv/config";

type JsonValue = null | boolean | number | string | JsonValue[] | { [k: string]: JsonValue };

/** ¿Está configurada la API key de Anthropic? */
export function anthropicAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Extrae el objeto JSON de un texto (tolera ```json fences``` y prosa alrededor). */
function extractJsonObject(text: string): string | null {
  const t = (text || "").trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : t).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  return body.slice(start, end + 1);
}

export async function anthropicJson<T extends JsonValue>(opts: {
  system: string;
  user: string;
  model?: string;
  timeoutMs?: number;
  maxTokens?: number;
}): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing env var: ANTHROPIC_API_KEY");

  const model = opts.model ?? (process.env.ANTHROPIC_MODEL || "claude-opus-4-8");
  // Opus con thinking puede tardar; piso de 40s para no abortar de más.
  const timeoutMs = Math.max(opts.timeoutMs ?? 45_000, 40_000);
  // effort bajo por defecto: rápido y barato, sigue siendo mucho más capaz que un modelo chico.
  const effort = process.env.ANTHROPIC_EFFORT || "low";

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxTokens ?? 6000,
        thinking: { type: "adaptive" },
        output_config: { effort },
        // El prompt grande (sistema) se cachea → consultas siguientes ~10x más baratas.
        system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: opts.user }],
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      const msg = (json?.error?.message as string | undefined) ?? `Anthropic error: ${res.status}`;
      throw new Error(msg);
    }

    const text: string = Array.isArray(json?.content)
      ? json.content
          .filter((c: any) => c?.type === "text" && typeof c?.text === "string")
          .map((c: any) => c.text)
          .join("")
      : "";

    const body = extractJsonObject(text);
    if (!body) throw new Error("Anthropic returned non-JSON output.");
    return JSON.parse(body) as T;
  } finally {
    clearTimeout(t);
  }
}

/** Tipos de imagen que acepta la API de Anthropic. */
function normalizeImageMediaType(mime: string): string {
  const m = (mime || "").toLowerCase();
  if (m.includes("png")) return "image/png";
  if (m.includes("webp")) return "image/webp";
  if (m.includes("gif")) return "image/gif";
  return "image/jpeg";
}

/**
 * Visión con Claude (Opus): transcribe una imagen a texto plano. Se usa para
 * leer facturas/fichas/screenshots de producto. Devuelve el texto transcripto.
 */
export async function anthropicVisionText(opts: {
  imageBase64: string;
  mime: string;
  prompt: string;
  system?: string;
  model?: string;
  timeoutMs?: number;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing env var: ANTHROPIC_API_KEY");

  const model = opts.model ?? (process.env.ANTHROPIC_MODEL || "claude-opus-4-8");
  const timeoutMs = Math.max(opts.timeoutMs ?? 45_000, 40_000);

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxTokens ?? 4096,
        ...(opts.system ? { system: opts.system } : {}),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: normalizeImageMediaType(opts.mime), data: opts.imageBase64 },
              },
              { type: "text", text: opts.prompt },
            ],
          },
        ],
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      const msg = (json?.error?.message as string | undefined) ?? `Anthropic error: ${res.status}`;
      throw new Error(msg);
    }
    const text: string = Array.isArray(json?.content)
      ? json.content
          .filter((c: any) => c?.type === "text" && typeof c?.text === "string")
          .map((c: any) => c.text)
          .join("")
      : "";
    return text.trim();
  } finally {
    clearTimeout(t);
  }
}
