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
  // Marítimo LCL (mínimo por embarque + tarifa por tonelada de revenue = max(m³, ton))
  lclChinaFlat: number;
  lclEuropeFlat: number;
  lclUsaFlat: number;
  lclPerM3: number; // USD por revenue ton (m³ o tonelada, el mayor). Sobre el mínimo manda este.
  lclHandling: number;
  // Almacenaje / depósito destino
  almAir: number;
  almFcl20: number;
  almFcl40: number;
  almLcl: number;
  // Vehículos / sobredimensionado (RORO se cobra por volumen; Flat Rack / Open Top por unidad)
  roroPorM3: number;
  roroMinimo: number;
  // Piso del flete RORO por vehículo (autos). Es el valor que más manda en el flete
  // de un auto: el m³ × tarifa casi siempre queda por debajo, así que define el número.
  fleteVehiculoMinUsd: number;
  flatRackPorUnidad: number;
  openTopPorUnidad: number;
  // Courier (envíos puerta a puerta, régimen simplificado): flete por kg según origen
  // + impuesto único (% sobre el FOB) que reemplaza derechos/IVA/percepciones.
  courierChinaPerKg: number;
  courierUsaPerKg: number;
  courierEuropePerKg: number;
  courierTaxPct: number;
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
  lclPerM3: 120,
  lclHandling: 50,
  almAir: 250,
  almFcl20: 1500,
  almFcl40: 1800,
  almLcl: 1500,
  // ⚠️ Valores de referencia — reemplazar con las tarifas reales del despachante.
  roroPorM3: 120,
  roroMinimo: 1500,
  // Flete real de un auto por RORO (dato de Andy). Editable en el panel.
  fleteVehiculoMinUsd: 4500,
  flatRackPorUnidad: 3500,
  openTopPorUnidad: 3000,
  // Courier (tarifas reales del operador): USD/kg puerta a puerta + impuesto único.
  courierChinaPerKg: 95,
  courierUsaPerKg: 55,
  courierEuropePerKg: 65,
  courierTaxPct: 50,
};

/** Metadata para construir el formulario del admin (label, grupo, unidad). */
export type FreightFieldMeta = {
  key: keyof FreightRatesConfig;
  label: string;
  group: "Aéreo" | "Marítimo FCL" | "Marítimo LCL" | "Almacenaje" | "Vehículos / sobredimensionado" | "Courier";
  unit: "USD" | "USD/kg" | "USD/m³" | "%";
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
  { key: "lclChinaFlat", label: "LCL China (mínimo por embarque)", group: "Marítimo LCL", unit: "USD" },
  { key: "lclEuropeFlat", label: "LCL Europa (mínimo por embarque)", group: "Marítimo LCL", unit: "USD" },
  { key: "lclUsaFlat", label: "LCL USA (mínimo por embarque)", group: "Marítimo LCL", unit: "USD" },
  { key: "lclPerM3", label: "LCL: tarifa por m³ / revenue ton", group: "Marítimo LCL", unit: "USD/m³", help: "Se cobra el mayor entre m³ y toneladas; sobre el mínimo manda esta tarifa." },
  { key: "lclHandling", label: "LCL: handling destino", group: "Marítimo LCL", unit: "USD" },
  { key: "almAir", label: "Almacenaje aéreo", group: "Almacenaje", unit: "USD" },
  { key: "almFcl20", label: "Almacenaje FCL 20'", group: "Almacenaje", unit: "USD" },
  { key: "almFcl40", label: "Almacenaje FCL 40'", group: "Almacenaje", unit: "USD" },
  { key: "almLcl", label: "Almacenaje LCL", group: "Almacenaje", unit: "USD" },
  { key: "roroPorM3", label: "RORO (autos/buses) por m³", group: "Vehículos / sobredimensionado", unit: "USD/m³" },
  { key: "roroMinimo", label: "RORO: mínimo por operación", group: "Vehículos / sobredimensionado", unit: "USD" },
  { key: "fleteVehiculoMinUsd", label: "Flete de auto (RORO): piso por vehículo", group: "Vehículos / sobredimensionado", unit: "USD", help: "Es el número que define el flete de un auto. Poné acá la tarifa real de RORO por unidad." },
  { key: "flatRackPorUnidad", label: "Flat Rack (por unidad)", group: "Vehículos / sobredimensionado", unit: "USD" },
  { key: "openTopPorUnidad", label: "Open Top (por unidad)", group: "Vehículos / sobredimensionado", unit: "USD" },
  { key: "courierChinaPerKg", label: "Courier China", group: "Courier", unit: "USD/kg" },
  { key: "courierUsaPerKg", label: "Courier USA", group: "Courier", unit: "USD/kg" },
  { key: "courierEuropePerKg", label: "Courier Europa", group: "Courier", unit: "USD/kg" },
  { key: "courierTaxPct", label: "Courier: impuesto sobre FOB", group: "Courier", unit: "%", help: "Régimen simplificado: % único sobre el FOB que reemplaza derechos/IVA/percepciones." },
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
