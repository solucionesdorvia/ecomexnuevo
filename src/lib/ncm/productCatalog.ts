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
  /** true = confirmación humana o cierre real de operación: manda y marca la entrada como "de oro". */
  verified?: boolean;
}): Promise<void> {
  const key = normalizeProductKey(input.name);
  const ncm = (input.ncm || "").trim();
  // No guardamos clasificaciones vacías o sin resolver.
  if (key.length < 3 || !ncm || ncm === "9999.99.99") return;
  const verified = input.verified === true;
  try {
    const existing = await prisma.productNcm.findUnique({ where: { key } });
    if (existing) {
      await prisma.productNcm.update({
        where: { key },
        data: {
          timesUsed: { increment: 1 },
          ...(verified
            ? {
                // Confirmación humana / cierre real: SIEMPRE manda (incluso sobre otra verificada,
                // porque es una decisión más reciente sobre un import efectivamente concretado).
                ncm,
                ncmDescription: input.ncmDescription ?? existing.ncmDescription,
                confidence: input.confidence ?? 1,
                verified: true,
                source: input.source ?? "manual",
              }
            : existing.verified
              ? {} // no pisamos una entrada verificada con una clasificación de IA
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
          confidence: verified ? (input.confidence ?? 1) : (input.confidence ?? null),
          source: input.source ?? (verified ? "manual" : "quote"),
          createdByUserId: input.createdByUserId ?? null,
          verified,
        },
      });
    }
  } catch {
    // tabla ausente / DB caída: ignorar, no bloquear la cotización.
  }
}

/**
 * Extrae {name, ncm, ncmDescription} del productJson guardado en una cotización.
 * Misma derivación que usa el quote route para autollenar el catálogo.
 * Devuelve null si no hay un NCM resuelto (≠ 9999.99.99) o falta el título.
 */
export function catalogEntryFromProductJson(
  productJson: unknown
): { name: string; ncm: string; ncmDescription: string | null } | null {
  const p = (productJson ?? null) as Record<string, unknown> | null;
  if (!p) return null;
  const name = String(p.title ?? "").trim();
  if (!name) return null;
  const raw = (p.raw as Record<string, unknown> | undefined) ?? undefined;
  const fromTop = typeof p.ncm === "string" ? p.ncm.trim() : "";
  const fromRaw = typeof raw?.ncm === "string" ? raw.ncm.trim() : "";
  const ncm =
    fromTop && fromTop !== "9999.99.99"
      ? fromTop
      : fromRaw && fromRaw !== "9999.99.99"
        ? fromRaw
        : "";
  if (!ncm) return null;
  const pcram = (raw?.pcram as Record<string, unknown> | undefined) ?? undefined;
  const ncmDescription = typeof pcram?.title === "string" ? pcram.title : null;
  return { name, ncm, ncmDescription };
}
