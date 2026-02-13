import "dotenv/config";

type JsonValue = null | boolean | number | string | JsonValue[] | { [k: string]: JsonValue };

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function looksLikeJsonObject(text: string) {
  const t = text.trim();
  return t.startsWith("{") && t.endsWith("}");
}

async function openaiJsonViaChatCompletions<T extends JsonValue>(opts: {
  system: string;
  user: string;
  model: string;
  timeoutMs: number;
}) {
  const apiKey = requireEnv("OPENAI_API_KEY");
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: opts.model,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      const msg =
        (json?.error?.message as string | undefined) ??
        `OpenAI error: ${res.status}`;
      throw new Error(msg);
    }
    const text = String(json?.choices?.[0]?.message?.content ?? "").trim();
    if (!looksLikeJsonObject(text)) throw new Error("OpenAI returned non-JSON output.");
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(t);
  }
}

export async function openaiJson<T extends JsonValue>(opts: {
  system: string;
  user: string;
  model?: string;
  timeoutMs?: number;
}): Promise<T> {
  const apiKey = requireEnv("OPENAI_API_KEY");
  const model = opts.model ?? (process.env.OPENAI_MODEL || "gpt-4o-mini");
  const timeoutMs = opts.timeoutMs ?? 25_000;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Primary: Responses API (preferred when available)
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: [{ type: "input_text", text: opts.system }] },
          { role: "user", content: [{ type: "input_text", text: opts.user }] },
        ],
        // Strong bias towards valid JSON output
        text: { format: { type: "json_object" } },
      }),
    });

    const json = await res.json();
    if (res.ok) {
      const outputText: string | undefined = Array.isArray(json?.output)
        ? json.output
            .flatMap((o: any) => (Array.isArray(o?.content) ? o.content : []))
            .filter(
              (c: any) => c?.type === "output_text" && typeof c?.text === "string"
            )
            .map((c: any) => c.text)
            .join("")
        : undefined;

      const text = (outputText ?? "").trim();
      if (text && looksLikeJsonObject(text)) return JSON.parse(text) as T;

      const alt =
        json?.output?.[0]?.content?.[0]?.text ??
        json?.output_text ??
        json?.text ??
        "";
      if (typeof alt === "string" && looksLikeJsonObject(alt)) {
        return JSON.parse(alt) as T;
      }
    }

    // Fallback: Chat Completions JSON mode
    return await openaiJsonViaChatCompletions<T>({
      system: opts.system,
      user: opts.user,
      model,
      timeoutMs,
    });
  } finally {
    clearTimeout(t);
  }
}

