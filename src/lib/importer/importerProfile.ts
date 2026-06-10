/**
 * Perfil de importador persistente (Fase 0.b del Motor de Cotización).
 *
 * Fuente única de verdad para:
 *  - opciones/labels de la UI (formulario en /app/configuracion),
 *  - validación de la API (PUT /api/user/profile),
 *  - formateo del perfil como bloque de contexto del chatbot (ANALYST_SYSTEM).
 *
 * NOTA: este módulo NO aplica recuperabilidad de impuestos (eso es Fase 1, a la
 * espera de validación fiscal). Acá solo capturamos e informamos el perfil para
 * que el bot no re-pregunte datos que el usuario ya cargó en su cuenta.
 */

export type ImporterProfileType =
  | "PERSONA_FISICA"
  | "MONOTRIBUTO"
  | "RESPONSABLE_INSCRIPTO"
  | "SOCIEDAD"
  | "ORGANISMO_PUBLICO";

export type FiscalBenefit =
  | "TDF"
  | "BIEN_DE_CAPITAL"
  | "RIGI"
  | "MINERIA"
  | "ENERGIA"
  | "OTROS";

/** Datos persistidos en User. Todos opcionales: el perfil puede estar incompleto. */
export type ImporterProfile = {
  importerProfile: ImporterProfileType | null;
  taxId: string | null;
  iibbProvince: string | null;
  fiscalBenefits: FiscalBenefit[];
};

export const IMPORTER_PROFILE_OPTIONS: ReadonlyArray<{ value: ImporterProfileType; label: string }> = [
  { value: "PERSONA_FISICA", label: "Persona Física" },
  { value: "MONOTRIBUTO", label: "Monotributo" },
  { value: "RESPONSABLE_INSCRIPTO", label: "Responsable Inscripto" },
  { value: "SOCIEDAD", label: "Sociedad" },
  { value: "ORGANISMO_PUBLICO", label: "Organismo Público" },
];

export const FISCAL_BENEFIT_OPTIONS: ReadonlyArray<{ value: FiscalBenefit; label: string }> = [
  { value: "TDF", label: "Tierra del Fuego (TdF)" },
  { value: "BIEN_DE_CAPITAL", label: "Bien de Capital" },
  { value: "RIGI", label: "RIGI" },
  { value: "MINERIA", label: "Minería" },
  { value: "ENERGIA", label: "Energía" },
  { value: "OTROS", label: "Otros" },
];

/** Jurisdicciones para Ingresos Brutos (23 provincias + CABA). */
export const IIBB_PROVINCES: ReadonlyArray<string> = [
  "CABA",
  "Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
];

const PROFILE_VALUES = new Set(IMPORTER_PROFILE_OPTIONS.map((o) => o.value));
const BENEFIT_VALUES = new Set(FISCAL_BENEFIT_OPTIONS.map((o) => o.value));
const PROVINCE_VALUES = new Set(IIBB_PROVINCES);

const PROFILE_LABELS: Record<ImporterProfileType, string> = Object.fromEntries(
  IMPORTER_PROFILE_OPTIONS.map((o) => [o.value, o.label])
) as Record<ImporterProfileType, string>;

const BENEFIT_LABELS: Record<FiscalBenefit, string> = Object.fromEntries(
  FISCAL_BENEFIT_OPTIONS.map((o) => [o.value, o.label])
) as Record<FiscalBenefit, string>;

export function isValidImporterProfile(value: unknown): value is ImporterProfileType {
  return typeof value === "string" && PROFILE_VALUES.has(value as ImporterProfileType);
}

export function isValidIibbProvince(value: unknown): value is string {
  return typeof value === "string" && PROVINCE_VALUES.has(value);
}

/** Limpia y deduplica una lista de beneficios, descartando valores desconocidos. */
export function sanitizeFiscalBenefits(value: unknown): FiscalBenefit[] {
  if (!Array.isArray(value)) return [];
  const out: FiscalBenefit[] = [];
  for (const v of value) {
    if (typeof v === "string" && BENEFIT_VALUES.has(v as FiscalBenefit) && !out.includes(v as FiscalBenefit)) {
      out.push(v as FiscalBenefit);
    }
  }
  return out;
}

export function profileTypeLabel(value: ImporterProfileType | null | undefined): string | null {
  return value && PROFILE_LABELS[value] ? PROFILE_LABELS[value] : null;
}

export function fiscalBenefitLabel(value: FiscalBenefit): string {
  return BENEFIT_LABELS[value] ?? value;
}

/** `true` si el perfil tiene al menos un dato útil para inyectar al contexto. */
export function hasAnyProfileData(p: ImporterProfile | null | undefined): boolean {
  if (!p) return false;
  return Boolean(p.importerProfile || p.taxId || p.iibbProvince || (p.fiscalBenefits && p.fiscalBenefits.length));
}

/**
 * Formatea el perfil como un bloque de contexto para el prompt del analista.
 * Devuelve null si no hay nada que inyectar.
 *
 * El bloque le dice al bot qué ya sabe del importador para que NO lo vuelva a
 * preguntar. No habilita cálculos de recuperabilidad (Fase 1).
 */
export function formatImporterProfileForPrompt(p: ImporterProfile | null | undefined): string | null {
  if (!hasAnyProfileData(p)) return null;

  const lines: string[] = [];
  const profileLabel = profileTypeLabel(p!.importerProfile);
  if (profileLabel) lines.push(`- Condición fiscal: ${profileLabel}`);
  if (p!.taxId) lines.push(`- CUIT/CUIL: ${p!.taxId}`);
  if (p!.iibbProvince) lines.push(`- Provincia IIBB: ${p!.iibbProvince}`);
  if (p!.fiscalBenefits && p!.fiscalBenefits.length) {
    lines.push(`- Beneficios fiscales habituales: ${p!.fiscalBenefits.map(fiscalBenefitLabel).join(", ")}`);
  }

  return [
    "=== DATOS DEL IMPORTADOR (ya cargados en su cuenta — NO los vuelvas a preguntar) ===",
    ...lines,
    "Usá estos datos como contexto del importador. No menciones el CUIT ni jerga fiscal salvo que el usuario lo pida.",
  ].join("\n");
}
