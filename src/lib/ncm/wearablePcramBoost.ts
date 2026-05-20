/**
 * PCRAM suele rankear primero teléfonos (8517.11–8517.14) para queries genéricas del cap. 8517.
 * Para wearables / 8517.62 forzamos consultas que encuentren la subpartida correcta.
 */
function normText(s: string) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function wearablePcramQueryBoost(p: {
  text: string;
  aiNcmHint?: string;
  searchTerms?: string[];
  kind?: string;
}): string[] {
  const t = normText(`${p.text} ${p.kind ?? ""} ${(p.searchTerms ?? []).join(" ")}`);
  const digits = (p.aiNcmHint ?? "").replace(/\D/g, "");
  const looksWearable =
    /\b(apple watch|galaxy watch|pixel watch|smartwatch|reloj inteligente|reloj conectado|amazfit|fitbit|huawei watch|xiaomi watch|wearable|mi watch)\b/.test(
      t
    ) || /^851762/.test(digits);

  if (!looksWearable) return [];

  return [
    "8517.62",
    "8517 62",
    "demás aparatos transmisión recepción",
    "reloj inteligente",
    "smartwatch",
  ];
}
