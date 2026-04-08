/** Solo dígitos del código NCM/HS. */
export function ncmDigitsOnly(s: string): string {
  return String(s ?? "").replace(/\D/g, "");
}

/**
 * Formato legal Mercosur XX.XX.XX (8 dígitos).
 * Si hay menos dígitos, rellena con ceros a la derecha en el tramo faltante.
 */
export function formatMercosurNcm8(digits: string): string {
  const d = ncmDigitsOnly(digits).slice(0, 8).padEnd(8, "0");
  const a = d.slice(0, 4);
  const b = d.slice(4, 6);
  const c = d.slice(6, 8);
  return `${a}.${b}.${c}`;
}

/** Partida HS 4 dígitos sin puntos. */
export function headingCode4(raw: string): string {
  const d = ncmDigitsOnly(raw);
  return d.slice(0, 4).padEnd(4, "0");
}

/** Limpia descripción: espacios, guiones tipográficos, basura de tabla. */
export function cleanDescription(s: string): string {
  return String(s ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[\u200b\ufeff]/g, "")
    .replace(/^[\s\-–—:]+/g, "")
    .trim();
}
