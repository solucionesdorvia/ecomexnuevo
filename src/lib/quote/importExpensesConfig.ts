/**
 * Configuración EDITABLE de "gastos de importación" (logística + servicios de despacho).
 *
 * Hasta ahora el cotizador solo sumaba honorarios + USD 200 operativos, así que el
 * total quedaba muy por debajo de un presupuesto real (faltaba agencia, terminal,
 * traslado/depósito fiscal, etc. — el bloque más grande de un despacho).
 *
 * Defaults sembrados con valores REALES del presupuesto de Forward (referencia, no
 * inventados) y editables por admin en /app/configuracion/fletes. Algunos ítems son
 * SOLO para vehículos (AVAC/CIVAC, DNRPA) y se aplican únicamente al capítulo 87.
 */
import { prisma } from "@/lib/db";

export type ImportExpensesConfig = {
  agenciaDespacho: number;
  terminalPortuaria: number;
  trasladoDepositoFiscal: number;
  almacenamiento: number;
  fletesInternos: number;
  gastosOperativos: number;
  gastosAdministrativos: number;
  // Solo vehículos (capítulo 87)
  avacCivac: number;
  dnrpa: number;
  // IVA sobre los servicios gravados (%)
  ivaServiciosPct: number;
};

export const DEFAULT_IMPORT_EXPENSES: ImportExpensesConfig = {
  agenciaDespacho: 790,
  terminalPortuaria: 1100,
  trasladoDepositoFiscal: 1100,
  almacenamiento: 550,
  fletesInternos: 250,
  gastosOperativos: 500,
  gastosAdministrativos: 146,
  avacCivac: 1500,
  dnrpa: 350,
  ivaServiciosPct: 21,
};

export type ExpenseFieldMeta = {
  key: keyof ImportExpensesConfig;
  label: string;
  group: "Gastos de despacho" | "Vehículos (cap. 87)" | "Impuestos sobre servicios";
  unit: "USD" | "%";
  /** Solo aplica a vehículos (capítulo 87). */
  autoOnly?: boolean;
};

export const EXPENSE_FIELDS: ExpenseFieldMeta[] = [
  { key: "agenciaDespacho", label: "Gastos de agencia / despacho", group: "Gastos de despacho", unit: "USD" },
  { key: "terminalPortuaria", label: "Terminal portuaria", group: "Gastos de despacho", unit: "USD" },
  { key: "trasladoDepositoFiscal", label: "Traslado y depósito fiscal", group: "Gastos de despacho", unit: "USD" },
  { key: "almacenamiento", label: "Almacenamiento y descarga", group: "Gastos de despacho", unit: "USD" },
  { key: "fletesInternos", label: "Fletes internos", group: "Gastos de despacho", unit: "USD" },
  { key: "gastosOperativos", label: "Gastos operativos", group: "Gastos de despacho", unit: "USD" },
  { key: "gastosAdministrativos", label: "Gastos administrativos", group: "Gastos de despacho", unit: "USD" },
  { key: "avacCivac", label: "AVAC / CIVAC (homologación)", group: "Vehículos (cap. 87)", unit: "USD", autoOnly: true },
  { key: "dnrpa", label: "DNRPA (registro automotor)", group: "Vehículos (cap. 87)", unit: "USD", autoOnly: true },
  { key: "ivaServiciosPct", label: "IVA sobre servicios", group: "Impuestos sobre servicios", unit: "%" },
];

const CONFIG_ENTITY = "config";
const CONFIG_ACTION = "import_expenses_updated";

let _current: ImportExpensesConfig = { ...DEFAULT_IMPORT_EXPENSES };
let _loadedAt = 0;
const TTL_MS = 60_000;

export function mergeImportExpenses(
  partial: Partial<Record<keyof ImportExpensesConfig, unknown>> | null | undefined
): ImportExpensesConfig {
  const out: ImportExpensesConfig = { ...DEFAULT_IMPORT_EXPENSES };
  if (!partial) return out;
  for (const f of EXPENSE_FIELDS) {
    const v = Number((partial as Record<string, unknown>)[f.key]);
    if (Number.isFinite(v) && v >= 0) out[f.key] = v;
  }
  return out;
}

export function getImportExpenses(): ImportExpensesConfig {
  return _current;
}

export async function hydrateImportExpenses(force = false): Promise<ImportExpensesConfig> {
  const now = Date.now();
  if (!force && now - _loadedAt < TTL_MS) return _current;
  try {
    const row = await prisma.auditLog.findFirst({
      where: { entityType: CONFIG_ENTITY, action: CONFIG_ACTION },
      orderBy: { createdAt: "desc" },
    });
    _current = mergeImportExpenses((row?.payload ?? null) as Partial<ImportExpensesConfig> | null);
  } catch {
    // mantener lo último cargado / defaults
  }
  _loadedAt = now;
  return _current;
}

export async function saveImportExpenses(
  partial: Partial<ImportExpensesConfig>,
  actor: { userId?: string | null; role?: string | null }
): Promise<ImportExpensesConfig> {
  const merged = mergeImportExpenses(partial);
  await prisma.auditLog.create({
    data: {
      entityType: CONFIG_ENTITY,
      entityId: "import_expenses",
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

/**
 * Calcula el bloque de gastos de importación para una operación.
 * @param isVehicle  Si la NCM es del capítulo 87 (suma AVAC/CIVAC y DNRPA).
 */
export function computeImportExpenses(isVehicle: boolean): {
  totalUsd: number;
  lines: Array<{ label: string; amountUsd: number }>;
} {
  const c = _current;
  const services: Array<{ label: string; amount: number }> = [
    { label: "Gastos de agencia / despacho", amount: c.agenciaDespacho },
    { label: "Terminal portuaria", amount: c.terminalPortuaria },
    { label: "Traslado y depósito fiscal", amount: c.trasladoDepositoFiscal },
    { label: "Almacenamiento y descarga", amount: c.almacenamiento },
    { label: "Fletes internos", amount: c.fletesInternos },
    { label: "Gastos operativos", amount: c.gastosOperativos },
    { label: "Gastos administrativos", amount: c.gastosAdministrativos },
  ];
  if (isVehicle) {
    services.push({ label: "AVAC / CIVAC (homologación)", amount: c.avacCivac });
    services.push({ label: "DNRPA (registro automotor)", amount: c.dnrpa });
  }
  const subtotal = services.reduce((a, s) => a + s.amount, 0);
  const ivaServicios = subtotal * (c.ivaServiciosPct / 100);
  const lines = services
    .filter((s) => s.amount > 0)
    .map((s) => ({ label: s.label, amountUsd: Math.round(s.amount * 100) / 100 }));
  if (ivaServicios > 0) {
    lines.push({ label: `IVA sobre servicios (${c.ivaServiciosPct}%)`, amountUsd: Math.round(ivaServicios * 100) / 100 });
  }
  return { totalUsd: Math.round((subtotal + ivaServicios) * 100) / 100, lines };
}
