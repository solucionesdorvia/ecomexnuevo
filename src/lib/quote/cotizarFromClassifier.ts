import type { CaseState } from "@/lib/clasificar-ncm/types";

/** Patrón NCM en texto (4+2+2+2 con puntos/espacios o 6–8 dígitos). */
const NCM_REGEX = /\b(\d{4}[\.\s]?\d{2}[\.\s]?\d{2}[\.\s]?\d{2}|\d{6,8})\b/;

export function stripNcmDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function extractNcmFromAssistantText(text: string): string | null {
  const m = text.match(NCM_REGEX);
  if (!m) return null;
  const digits = stripNcmDigits(m[1] ?? m[0] ?? "");
  return digits.length >= 6 ? digits : null;
}

/** Descripción corta para query `producto` (máx. 200). */
export function productDescriptionForQuote(state: CaseState): string {
  const s = state;
  if (s.productName?.trim()) return s.productName.trim().slice(0, 200);
  if (s.technicalName?.trim()) return s.technicalName.trim().slice(0, 200);
  if (s.classificationRationale?.trim()) {
    const line = s.classificationRationale.split(/\n/)[0]!.trim();
    if (line) return line.slice(0, 200);
  }
  if (s.mergedTechnicalDescription?.trim()) return s.mergedTechnicalDescription.trim().slice(0, 200);
  const firstUser = s.messages.find((m) => m.role === "user");
  if (firstUser?.content?.trim()) return firstUser.content.trim().slice(0, 200);
  return "";
}

/**
 * NCM listo para cotizar: primero snapshot; si falta, último mensaje del asistente.
 */
export function ncmDigitsForQuote(state: CaseState): string | null {
  if (state.recommendedNcm?.trim()) {
    const d = stripNcmDigits(state.recommendedNcm);
    return d.length >= 6 ? d : null;
  }
  const lastAsst = [...state.messages].reverse().find((m) => m.role === "assistant");
  if (lastAsst?.content) return extractNcmFromAssistantText(lastAsst.content);
  return null;
}

/** Path + query para `/app/nueva` (sin dominio). Vacío si no hay NCM válido. */
export function buildNuevaCotizacionUrl(state: CaseState): string {
  const ncm = ncmDigitsForQuote(state);
  if (!ncm) return "";
  const qs = new URLSearchParams();
  qs.set("ncm", ncm);
  const desc = productDescriptionForQuote(state);
  if (desc) qs.set("producto", desc);
  return `/app/nueva?${qs.toString()}`;
}

export function buildChatPrefillFromParams(ncmDigits: string, productoDecoded?: string | null): string {
  const ncm = stripNcmDigits(ncmDigits);
  if (!ncm) return "";
  const desc = productoDecoded?.trim().slice(0, 200);
  if (desc) return `Quiero cotizar ${desc}. El NCM es ${ncm}.`;
  return `Quiero cotizar un producto con NCM ${ncm}.`;
}
