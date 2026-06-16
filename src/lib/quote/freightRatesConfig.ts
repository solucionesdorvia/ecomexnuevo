/**
 * Configuración EDITABLE de tarifas de flete.
 *
 * Los valores por defecto son los que estaban hardcodeados (provistos por el
 * encargado de comercio exterior). Una cuenta con rol "admin" puede modificarlos
 * desde /app/configuracion/fletes; los overrides se guardan en AuditLog
 * (entityType "config") para no requerir migración de base.
 *
 * El cálculo (freightRates.ts) lee SIEMPRE la config resuelta = defaults ⊕ overrides.
 */
import { prisma } from "@/lib/db";

export const FREIGHT_IVA = 0.21;

export type FreightRatesConfig = {
  // Aéreo
  airChinaPerKg: number;
  airUsaPerKg: number;
  airUsaAwbFlat: number;
  airUsaTransferPerKg: number;
  airUsaTransferMin: number;
  airDestCorteGuiaNet: number; // sin IVA
  airDestHandlingNet: number; // sin IVA
  // Marítimo FCL
  fclChina20: number;
  fclChina40: number;
  fclEurope20: number;
  fclEurope40: number;
  fclDestNet: number; // sin IVA
  // Marítimo LCL (tarifa plana por embarque)
  lclChinaFlat: number;
  lclEuropeFlat: number;
  lclUsaFlat: number;
  lclHandling: number;
  // Almacenaje / depósito destino
  almAir: number;
  almFcl20: number;
  almFcl40: number;
  almLcl: number;
};

export const DEFAULT_FREIGHT_RATES: FreightRatesConfig = {
  airChinaPerKg: 250,
  airUsaPerKg: 250,
  airUsaAwbFlat: 40,
  airUsaTransferPerKg: 0.15,
  airUsaTransferMin: 50,
  airDestCorteGuiaNet: 220,
  airDestHandlingNet: 50,
  fclChina20: 4000,
  fclChina40: 6000,
  fclEurope20: 2500,
  fclEurope40: 3800,
  fclDestNet: 890,
  lclChinaFlat: 1500,
  lclEuropeFlat: 1500,
  lclUsaFlat: 1500,
  lclHandling: 50,
  almAir: 250,
  almFcl20: 1500,
  almFcl40: 1800,
  almLcl: 1500,
};

/** Metadata para construir el formulario del admin (label, grupo, unidad). */
export type FreightFieldMeta = {
  key: keyof FreightRatesConfig;
  label: string;
  group: "Aéreo" | "Marítimo FCL" | "Marítimo LCL" | "Almacenaje";
  unit: "USD" | "USD/kg";
  help?: string;
};

export const FREIGHT_FIELDS: FreightFieldMeta[] = [
  { key: "airChinaPerKg", label: "Flete aéreo China", group: "Aéreo", unit: "USD/kg" },
  { key: "airUsaPerKg", label: "Flete aéreo USA", group: "Aéreo", unit: "USD/kg" },
  { key: "airUsaAwbFlat", label: "AWB (guía aérea) USA", group: "Aéreo", unit: "USD" },
  { key: "airUsaTransferPerKg", label: "Air transfer USA", group: "Aéreo", unit: "USD/kg" },
  { key: "airUsaTransferMin", label: "Air transfer mínimo USA", group: "Aéreo", unit: "USD" },
  { key: "airDestCorteGuiaNet", label: "Destino: corte de guía (sin IVA)", group: "Aéreo", unit: "USD" },
  { key: "airDestHandlingNet", label: "Destino: handling aéreo (sin IVA)", group: "Aéreo", unit: "USD" },
  { key: "fclChina20", label: "FCL China 20'", group: "Marítimo FCL", unit: "USD" },
  { key: "fclChina40", label: "FCL China 40'", group: "Marítimo FCL", unit: "USD" },
  { key: "fclEurope20", label: "FCL Europa 20'", group: "Marítimo FCL", unit: "USD" },
  { key: "fclEurope40", label: "FCL Europa 40'", group: "Marítimo FCL", unit: "USD" },
  { key: "fclDestNet", label: "FCL: gastos destino (sin IVA)", group: "Marítimo FCL", unit: "USD" },
  { key: "lclChinaFlat", label: "LCL China (tarifa plana)", group: "Marítimo LCL", unit: "USD" },
  { key: "lclEuropeFlat", label: "LCL Europa (tarifa plana)", group: "Marítimo LCL", unit: "USD" },
  { key: "lclUsaFlat", label: "LCL USA (tarifa plana)", group: "Marítimo LCL", unit: "USD" },
  { key: "lclHandling", label: "LCL: handling destino", group: "Marítimo LCL", unit: "USD" },
  { key: "almAir", label: "Almacenaje aéreo", group: "Almacenaje", unit: "USD" },
  { key: "almFcl20", label: "Almacenaje FCL 20'", group: "Almacenaje", unit: "USD" },
  { key: "almFcl40", label: "Almacenaje FCL 40'", group: "Almacenaje", unit: "USD" },
  { key: "almLcl", label: "Almacenaje LCL", group: "Almacenaje", unit: "USD" },
];

const CONFIG_ENTITY = "config";
const CONFIG_ACTION = "freight_rates_updated";

/** Estado en memoria + cache con TTL para no pegarle a la DB en cada cálculo. */
let _current: FreightRatesConfig = { ...DEFAULT_FREIGHT_RATES };
let _loadedAt = 0;
const TTL_MS = 60_000;

/** Mezcla defaults con un parcial validado (solo números finitos ≥ 0). */
export function mergeFreightConfig(
  partial: Partial<Record<keyof FreightRatesConfig, unknown>> | null | undefined
): FreightRatesConfig {
  const out: FreightRatesConfig = { ...DEFAULT_FREIGHT_RATES };
  if (!partial) return out;
  for (const f of FREIGHT_FIELDS) {
    const v = Number((partial as Record<string, unknown>)[f.key]);
    if (Number.isFinite(v) && v >= 0) out[f.key] = v;
  }
  return out;
}

/** Config actual (síncrona) usada por el motor de flete. */
export function getFreightConfig(): FreightRatesConfig {
  return _current;
}

/** Refresca la config desde la DB (con TTL). Llamar antes de cotizar. */
export async function hydrateFreightConfig(force = false): Promise<FreightRatesConfig> {
  const now = Date.now();
  if (!force && now - _loadedAt < TTL_MS) return _current;
  try {
    const row = await prisma.auditLog.findFirst({
      where: { entityType: CONFIG_ENTITY, action: CONFIG_ACTION },
      orderBy: { createdAt: "desc" },
    });
    _current = mergeFreightConfig((row?.payload ?? null) as Partial<FreightRatesConfig> | null);
  } catch {
    // Si la DB falla, seguimos con lo último cargado (o defaults).
  }
  _loadedAt = now;
  return _current;
}

/** Guarda nuevos valores (rol admin) y actualiza el estado en memoria. */
export async function saveFreightConfig(
  partial: Partial<FreightRatesConfig>,
  actor: { userId?: string | null; role?: string | null }
): Promise<FreightRatesConfig> {
  const merged = mergeFreightConfig(partial);
  await prisma.auditLog.create({
    data: {
      entityType: CONFIG_ENTITY,
      entityId: "freight_rates",
      action: CONFIG_ACTION,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload: merged as any,
      actorUserId: actor.userId ?? null,
      actorRole: actor.role ?? null,
    },
  });
  _current = merged;
  _loadedAt = Date.now();
  return merged;
}
