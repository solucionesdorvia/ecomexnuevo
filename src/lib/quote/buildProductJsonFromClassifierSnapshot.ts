import type { CaseSnapshot, ChatMessage } from "@/lib/clasificar-ncm/types";

/**
 * Convierte el estado del clasificador NCM conversacional en `productJson` compatible con `calcImportQuote` / chat.
 */
export function buildProductJsonFromClassifierSnapshot(
  snapshot: CaseSnapshot,
  messages: ChatMessage[]
): Record<string, unknown> {
  const firstUser = messages.find((m) => m.role === "user")?.content?.trim() ?? "";
  const title =
    (snapshot.productName ?? snapshot.technicalName ?? "").trim() ||
    firstUser.slice(0, 280) ||
    "Producto";

  const description = [snapshot.mergedTechnicalDescription, snapshot.classificationRationale]
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .join("\n\n")
    .slice(0, 8000);

  // Usar recommendedNcm si existe; si no, el candidato top como fallback para PCRAM.
  const ncm =
    snapshot.recommendedNcm?.trim() ||
    (Array.isArray(snapshot.candidates) && snapshot.candidates[0]?.ncmCode?.trim()
      ? snapshot.candidates[0].ncmCode.trim()
      : undefined) ||
    undefined;
  const fobUsd =
    typeof snapshot.purchase?.fobUnitUsd === "number" && snapshot.purchase.fobUnitUsd > 0
      ? snapshot.purchase.fobUnitUsd
      : undefined;
  const quantity =
    typeof snapshot.purchase?.quantity === "number" && snapshot.purchase.quantity > 0
      ? Math.max(1, Math.floor(snapshot.purchase.quantity))
      : undefined;
  const origin = snapshot.purchase?.origin?.trim() || undefined;

  return {
    title,
    ...(description ? { description } : {}),
    ...(ncm ? { ncm } : {}),
    ...(fobUsd ? { fobUsd } : {}),
    ...(quantity ? { quantity } : {}),
    ...(origin ? { origin } : {}),
    raw: {
      classifier: {
        status: snapshot.status,
        confidence: snapshot.confidence,
        candidates: snapshot.candidates,
        discardedCandidates: snapshot.discardedCandidates,
        discardedNotes: snapshot.discardedNotes,
        ambiguity: snapshot.ambiguity,
        mergedTechnicalDescription: snapshot.mergedTechnicalDescription,
        mainFunction: snapshot.mainFunction,
        materials: snapshot.materials,
        use: snapshot.use,
        productType: snapshot.productType,
        industry: snapshot.industry,
        pendingQuestions: snapshot.pendingQuestions,
      },
    },
  };
}

export function buildUserTextFromClassifier(
  snapshot: CaseSnapshot,
  messages: ChatMessage[]
): string {
  const parts: string[] = [];
  const firstUser = messages.find((m) => m.role === "user")?.content?.trim();
  if (firstUser) parts.push(firstUser);
  if (snapshot.mergedTechnicalDescription?.trim()) {
    parts.push(`[Descripción técnica unificada]\n${snapshot.mergedTechnicalDescription.trim()}`);
  }
  return parts.join("\n\n").slice(0, 50_000);
}
