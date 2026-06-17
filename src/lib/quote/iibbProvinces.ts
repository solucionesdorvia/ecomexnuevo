/**
 * Alícuotas de percepción de IIBB (SIRPEI) por provincia, en %.
 * Valores de REFERENCIA orientativos (la alícuota real depende de la situación
 * del contribuyente en cada jurisdicción). Editable a futuro.
 */
export const IIBB_PROVINCES: Array<{ code: string; label: string; pct: number }> = [
  { code: "CABA", label: "Ciudad de Buenos Aires", pct: 3 },
  { code: "BA", label: "Buenos Aires", pct: 3.5 },
  { code: "CAT", label: "Catamarca", pct: 2.5 },
  { code: "CHA", label: "Chaco", pct: 2.5 },
  { code: "CHU", label: "Chubut", pct: 2.5 },
  { code: "COR", label: "Córdoba", pct: 3 },
  { code: "CRR", label: "Corrientes", pct: 2.5 },
  { code: "ER", label: "Entre Ríos", pct: 2.5 },
  { code: "FOR", label: "Formosa", pct: 2.5 },
  { code: "JUJ", label: "Jujuy", pct: 2.5 },
  { code: "LP", label: "La Pampa", pct: 2.5 },
  { code: "LR", label: "La Rioja", pct: 2.5 },
  { code: "MZA", label: "Mendoza", pct: 3 },
  { code: "MIS", label: "Misiones", pct: 2.5 },
  { code: "NQN", label: "Neuquén", pct: 2.5 },
  { code: "RN", label: "Río Negro", pct: 2.5 },
  { code: "SAL", label: "Salta", pct: 2.5 },
  { code: "SJ", label: "San Juan", pct: 2.5 },
  { code: "SL", label: "San Luis", pct: 2.5 },
  { code: "SC", label: "Santa Cruz", pct: 2.5 },
  { code: "SF", label: "Santa Fe", pct: 3 },
  { code: "SE", label: "Santiago del Estero", pct: 2.5 },
  { code: "TF", label: "Tierra del Fuego", pct: 0 },
  { code: "TUC", label: "Tucumán", pct: 2.5 },
];

const DEFAULT_IIBB_PCT = 3;

/** Devuelve la alícuota de IIBB (%) para un código de provincia (default 3%). */
export function iibbPctForProvince(code?: string | null): number {
  if (!code) return DEFAULT_IIBB_PCT;
  const hit = IIBB_PROVINCES.find((p) => p.code === code);
  return hit ? hit.pct : DEFAULT_IIBB_PCT;
}
