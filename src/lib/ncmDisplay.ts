/**
 * Utilidades para mostrar el NCM de forma controlada en la UI pública.
 *
 * Política: los usuarios ven solo los primeros 4 dígitos (partida arancelaria),
 * con label "Posición arancelaria estimada". El código completo queda para
 * el equipo de operaciones / consultoría a medida.
 */

/**
 * Devuelve solo los primeros 4 dígitos del NCM ("partida arancelaria").
 * Ejemplo: "8471.30.00" → "8471"
 */
export function ncmToPartida(ncm: string | null | undefined): string {
  if (!ncm) return "";
  const digits = String(ncm).replace(/\D/g, "");
  return digits.slice(0, 4);
}

/**
 * Formatea la partida arancelaria para mostrar en la UI.
 * Devuelve "XXXX" si hay dígitos, "" si no.
 */
export function formatNcmPublic(ncm: string | null | undefined): string {
  return ncmToPartida(ncm);
}

/** Texto del label que acompaña la partida. */
export const NCM_POSITION_LABEL = "Posición arancelaria estimada";

/** Texto de CTA para invitar a consultoría completa. */
export const NCM_CONSULT_CTA =
  "Para la subposición completa y aranceles exactos, solicitá una consultoría a medida.";
