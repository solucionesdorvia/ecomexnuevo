import { openaiJson } from "@/lib/ai/openaiClient";

export type VehicleInference = {
  kind:
    | "auto"
    | "pickup"
    | "suv"
    | "camion"
    | "moto"
    | "tractor"
    | "maquinaria"
    | "otro"
    | "desconocido";
  make?: string;
  model?: string;
  year?: number;
  fuel?: "nafta" | "diesel" | "electrico" | "hibrido" | "desconocido";
  displacementCc?: number; // cilindrada si está explícita o muy probable
  grossWeightClass?: "<=5t" | ">5t" | "desconocido";
  isRefrigerated?: boolean;
  isTippingBed?: boolean;
  confidence: number; // 0..1
  assumptions?: string[];
};

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export async function extractVehicleInferenceFromText(
  text: string
): Promise<VehicleInference | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  const input = String(text || "").trim();
  if (!input) return null;

  const system = [
    "Sos un extractor experto de vehículos/productos para cotización de importación a Argentina.",
    "Tu tarea: a partir de texto libre, inferí SOLO lo que sea razonable. No inventes datos técnicos.",
    "Devuelve SOLO JSON válido con estas claves:",
    "kind, make, model, year, fuel, displacementCc, grossWeightClass, isRefrigerated, isTippingBed, confidence, assumptions.",
    "",
    "Reglas:",
    "- kind: auto/pickup/suv/camion/moto/tractor/maquinaria/otro/desconocido",
    "- year: número (1990..2035) si aparece; si no, null/omitir",
    "- displacementCc: SOLO si aparece explícito (ej '2.8', '2800cc', '1.8') o si es extremadamente obvio; si no, null",
    "- grossWeightClass: para pickups/utilitarios típicos usar '<=5t' si es razonable; si no, 'desconocido'",
    "- confidence 0..1: 0.9+ solo si estás muy seguro",
    "- assumptions: lista corta (0-4) de supuestos que estás haciendo (ej: 'Asumí pick-up estándar <=5t')",
  ].join("\n");

  const user = [
    "Texto del usuario (puede ser modelo/año):",
    input.slice(0, 1200),
  ].join("\n");

  try {
    const r = await openaiJson<any>({
      system,
      user,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      timeoutMs: 18_000,
    });

    const kind = ((): VehicleInference["kind"] => {
      const k = String(r?.kind ?? "desconocido").toLowerCase().trim();
      if (
        k === "auto" ||
        k === "pickup" ||
        k === "suv" ||
        k === "camion" ||
        k === "moto" ||
        k === "tractor" ||
        k === "maquinaria" ||
        k === "otro" ||
        k === "desconocido"
      )
        return k;
      return "desconocido";
    })();

    const yearNum = Number(r?.year);
    const year =
      Number.isFinite(yearNum) && yearNum >= 1990 && yearNum <= 2035
        ? Math.floor(yearNum)
        : undefined;

    const fuelRaw = String(r?.fuel ?? "").toLowerCase().trim();
    const fuel: VehicleInference["fuel"] =
      fuelRaw === "nafta" ||
      fuelRaw === "diesel" ||
      fuelRaw === "electrico" ||
      fuelRaw === "hibrido"
        ? fuelRaw
        : fuelRaw
          ? "desconocido"
          : undefined;

    const dispNum = Number(r?.displacementCc);
    const displacementCc =
      Number.isFinite(dispNum) && dispNum >= 50 && dispNum <= 15000
        ? Math.round(dispNum)
        : undefined;

    const gw = String(r?.grossWeightClass ?? "").trim();
    const grossWeightClass: VehicleInference["grossWeightClass"] =
      gw === "<=5t" || gw === ">5t" || gw === "desconocido" ? gw : undefined;

    const assumptions = Array.isArray(r?.assumptions)
      ? r.assumptions.map((x: any) => String(x).trim()).filter(Boolean).slice(0, 4)
      : undefined;

    const confidence = clamp01(Number(r?.confidence ?? 0.5));
    const make = r?.make ? String(r.make).trim() : undefined;
    const model = r?.model ? String(r.model).trim() : undefined;
    const isRefrigerated =
      typeof r?.isRefrigerated === "boolean" ? r.isRefrigerated : undefined;
    const isTippingBed =
      typeof r?.isTippingBed === "boolean" ? r.isTippingBed : undefined;

    return {
      kind,
      make,
      model,
      year,
      fuel,
      displacementCc,
      grossWeightClass,
      isRefrigerated,
      isTippingBed,
      confidence,
      assumptions,
    };
  } catch {
    return null;
  }
}

export function vehicleInferenceToHintsText(v: VehicleInference) {
  const parts: string[] = [];
  parts.push(`Tipo: ${v.kind}`);
  if (v.make) parts.push(`Marca: ${v.make}`);
  if (v.model) parts.push(`Modelo: ${v.model}`);
  if (typeof v.year === "number") parts.push(`Año: ${v.year}`);
  if (v.fuel && v.fuel !== "desconocido") parts.push(`Combustible: ${v.fuel}`);
  if (typeof v.displacementCc === "number") parts.push(`Cilindrada: ${v.displacementCc} cc`);
  if (v.grossWeightClass && v.grossWeightClass !== "desconocido")
    parts.push(`Peso total: ${v.grossWeightClass}`);
  if (typeof v.isTippingBed === "boolean") parts.push(`Basculante: ${v.isTippingBed ? "sí" : "no"}`);
  if (typeof v.isRefrigerated === "boolean")
    parts.push(`Frigorífico/isotérmico: ${v.isRefrigerated ? "sí" : "no"}`);
  return parts.join("\n");
}

