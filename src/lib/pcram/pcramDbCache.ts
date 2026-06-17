/**
 * Caché PERSISTENTE de PCRAM en la base (Neon), vía AuditLog.
 *
 * Por qué: el caché local de PcramClient (SQLite) vive dentro del contenedor de
 * Railway y se borra en cada deploy → el motor arranca "frío", pega más a PCRAM
 * y falla más. Guardando los detalles en la base, sobreviven a los deploys y
 * además sirven como "último valor conocido" cuando PCRAM se cae.
 *
 * Best-effort: si la base falla, no rompe el flujo de cotización.
 */
import { prisma } from "@/lib/db";

const ENTITY = "pcram_cache";
const ACTION = "pcram_detail";

function ncmKey(ncm: string): string {
  return (ncm || "").replace(/\D/g, "").slice(0, 8);
}

export type PcramDbHit = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  detail: any;
  fetchedAt: Date;
};

/** Último detalle guardado para una NCM (o null). */
export async function readPcramDb(ncm: string): Promise<PcramDbHit | null> {
  const key = ncmKey(ncm);
  if (key.length < 6) return null;
  try {
    const row = await prisma.auditLog.findFirst({
      where: { entityType: ENTITY, action: ACTION, entityId: key },
      orderBy: { createdAt: "desc" },
    });
    if (!row?.payload) return null;
    return { detail: row.payload, fetchedAt: row.createdAt };
  } catch {
    return null;
  }
}

/** Guarda un detalle real de PCRAM. */
export async function writePcramDb(ncm: string, detail: unknown): Promise<void> {
  const key = ncmKey(ncm);
  if (key.length < 6 || !detail) return;
  try {
    await prisma.auditLog.create({
      data: {
        entityType: ENTITY,
        entityId: key,
        action: ACTION,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        payload: detail as any,
      },
    });
  } catch {
    // ignorar: el caché nunca bloquea el producto
  }
}
