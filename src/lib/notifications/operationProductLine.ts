/** Una línea de producto para títulos/cuerpos de notificación (alineado con el resto de la app). */
export function operationProductLine(productJson: unknown, userText: string, max = 80): string {
  const pj = productJson as { title?: string; name?: string } | null | undefined;
  const t = pj?.title ?? pj?.name;
  if (t && String(t).trim()) return String(t).slice(0, max);
  if (userText?.trim()) return userText.trim().slice(0, max);
  return "Tu importación";
}
