/**
 * Estimador de peso por unidad usando IA.
 * Para productos conocidos (MacBook Air M2, Ford Maverick, iPhone, etc.)
 * devuelve el peso real sin necesidad de preguntarle al usuario.
 */

import { openaiJson } from "./openaiClient";

export type WeightEstimate = {
  weightKgPerUnit: number;
  confidence: number; // 0..1
  source: string;     // ej: "MacBook Air M2 pesa 1.24 kg según especificaciones oficiales"
};

export async function estimateProductWeight(
  title: string,
  ncm?: string
): Promise<WeightEstimate | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  const t = String(title || "").trim();
  if (!t) return null;

  const system = [
    "Sos un experto en especificaciones técnicas de productos para importación.",
    "Tu tarea: dado un nombre de producto, estimá su peso por unidad en kg.",
    "",
    "Reglas:",
    "- Para productos conocidos (Apple MacBook Air M2, Ford Maverick, iPhone 15, etc.) usá el peso oficial del fabricante.",
    "- Para vehículos usá el peso del vehículo en kg (tara/kerb weight).",
    "- Para electrónica de consumo usá el peso con packaging/caja de envío.",
    "- confidence 0..1: 0.9+ solo si conocés el peso exacto del modelo específico.",
    "  0.7-0.89: si es razonable pero podría variar por variante.",
    "  0.5-0.69: si es una estimación genérica de la categoría.",
    "  <0.5: si realmente no podés saberlo.",
    "- Si confidence < 0.5 igual devolvé tu mejor estimación.",
    "- Devuelve SOLO JSON: { weightKgPerUnit: number, confidence: number, source: string }",
    "- source: frase corta explicando de dónde viene el dato.",
  ].join("\n");

  const user = [
    `Producto: ${t}`,
    ncm ? `NCM (clasificación arancelaria): ${ncm}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const r = await openaiJson<{
      weightKgPerUnit?: number;
      confidence?: number;
      source?: string;
    }>({
      system,
      user,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      timeoutMs: 12_000,
    });

    const weight = Number(r?.weightKgPerUnit);
    const confidence = Math.max(0, Math.min(1, Number(r?.confidence ?? 0)));
    const source = String(r?.source ?? "").trim();

    if (!Number.isFinite(weight) || weight <= 0) return null;

    return { weightKgPerUnit: weight, confidence, source };
  } catch {
    return null;
  }
}
