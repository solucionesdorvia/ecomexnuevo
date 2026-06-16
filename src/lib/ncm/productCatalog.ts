/**
 * Catálogo curado de NCM por producto.
 *
 * - Se autollena cuando se cotiza (recordProductNcm), incrementando timesUsed.
 * - El clasificador puede consultarlo primero (lookupProductNcm) para reusar
 *   clasificaciones ya hechas (más rápido y consistente).
 * - Se cura desde el panel admin (verificar / editar / borrar).
 *
 * TODAS las operaciones son best-effort (try/catch): si la tabla todavía no existe
 * en la base (migración no aplicada) o la DB falla, no rompe el flujo de cotización.
 */
import { prisma } from "@/lib/db";

/** Normaliza un texto a una clave estable: minúsculas, sin tildes, sin signos, espacios colapsados. */
export function normalizeProductKey(text: string): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export type ProductNcmHit = {
  ncm: string;
  ncmDescription: string | null;
  confidence: number | null;
  verified: boolean;
  timesUsed: number;
};

/** Busca una clasificación previa por clave exacta del texto del producto. */
export async function lookupProductNcm(text: string): Promise<ProductNcmHit | null> {
  const key = normalizeProductKey(text);
  if (key.length < 3) return null;
  try {
    const row = await prisma.productNcm.findUnique({ where: { key } });
    if (!row) return null;
    return {
      ncm: row.ncm,
      ncmDescription: row.ncmDescription,
      confidence: row.confidence,
      verified: row.verified,
      timesUsed: row.timesUsed,
    };
  } catch {
    return null;
  }
}

/** Registra (o actualiza) una clasificación en el catálogo. Best-effort. */
export async function recordProductNcm(input: {
  name: string;
  ncm: string;
  ncmDescription?: string | null;
  confidence?: number | null;
  source?: "ai" | "manual" | "quote";
  createdByUserId?: string | null;
}): Promise<void> {
  const key = normalizeProductKey(input.name);
  const ncm = (input.ncm || "").trim();
  // No guardamos clasificaciones vacías o sin resolver.
  if (key.length < 3 || !ncm || ncm === "9999.99.99") return;
  try {
    const existing = await prisma.productNcm.findUnique({ where: { key } });
    if (existing) {
      await prisma.productNcm.update({
        where: { key },
        data: {
          timesUsed: { increment: 1 },
          // No pisamos una entrada verificada por humano con una de IA.
          ...(existing.verified
            ? {}
            : {
                ncm,
                ncmDescription: input.ncmDescription ?? existing.ncmDescription,
                confidence: input.confidence ?? existing.confidence,
              }),
        },
      });
    } else {
      await prisma.productNcm.create({
        data: {
          key,
          name: input.name.trim().slice(0, 200),
          ncm,
          ncmDescription: input.ncmDescription ?? null,
          confidence: input.confidence ?? null,
          source: input.source ?? "quote",
          createdByUserId: input.createdByUserId ?? null,
        },
      });
    }
  } catch {
    // tabla ausente / DB caída: ignorar, no bloquear la cotización.
  }
}
