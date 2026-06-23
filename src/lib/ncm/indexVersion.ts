/**
 * Versión del índice arancelario offline (data/ncm/version.json).
 *
 * Permite saber CUÁNDO se generó y de qué dump de AFIP/ARCA viene, para avisar
 * cuando el nomenclador local quedó viejo (riesgo: cotizar con un arancel
 * desactualizado si PCRAM no está disponible). El archivo lo emite el script de
 * ingesta (scripts/ncm/ingest-chapters.ts).
 */
import { existsSync, readFileSync } from "fs";
import path from "path";

export type NcmIndexVersion = {
  /** ISO — cuándo se corrió la ingesta. */
  generatedAt?: string;
  /** Fecha del dump oficial AFIP/ARCA (la que importa fiscalmente). */
  sourceDate?: string;
  /** Checksum del index.json (detecta cambios). */
  checksum?: string;
  /** Cantidad de registros indexados. */
  records?: number;
};

let cached: NcmIndexVersion | null | undefined;

function versionPath(): string {
  return path.join(process.cwd(), "data", "ncm", "version.json");
}

export function getNcmIndexVersion(): NcmIndexVersion | null {
  if (cached !== undefined) return cached;
  try {
    const p = versionPath();
    if (!existsSync(p)) {
      cached = null;
      return cached;
    }
    cached = JSON.parse(readFileSync(p, "utf8")) as NcmIndexVersion;
  } catch {
    cached = null;
  }
  return cached;
}

/**
 * ¿El índice quedó viejo? Usa sourceDate (fecha del dump oficial) o, si falta,
 * generatedAt. Sin versión o fecha no parseable → se trata como viejo (no es
 * verificable, conviene avisar).
 */
export function isNcmIndexStale(maxAgeMonths = 12, nowMs: number = Date.now()): boolean {
  const v = getNcmIndexVersion();
  const ref = v?.sourceDate || v?.generatedAt;
  if (!ref) return true;
  const t = Date.parse(ref);
  if (!Number.isFinite(t)) return true;
  const ageMonths = (nowMs - t) / (1000 * 60 * 60 * 24 * 30.44);
  return ageMonths > maxAgeMonths;
}

/** Resumen legible para logs. */
export function ncmIndexVersionSummary(): string {
  const v = getNcmIndexVersion();
  if (!v) return "índice NCM sin versión (data/ncm/version.json ausente)";
  const parts = [
    v.sourceDate ? `fuente ${v.sourceDate}` : "fuente desconocida",
    v.generatedAt ? `generado ${v.generatedAt.slice(0, 10)}` : null,
    typeof v.records === "number" ? `${v.records} registros` : null,
    isNcmIndexStale() ? "⚠️ VIEJO" : "vigente",
  ].filter(Boolean);
  return `índice NCM: ${parts.join(", ")}`;
}
