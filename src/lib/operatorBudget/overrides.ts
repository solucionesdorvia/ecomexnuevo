/* eslint-disable @typescript-eslint/no-explicit-any */
// StoredBudgetParsed serialization helpers — Prisma JsonValue casts are intentional here.
import type { ParsedBudget } from "@/lib/operatorBudget/xlsxParse";

export type BudgetOverrides = Partial<
  Pick<
    ParsedBudget,
    | "totalToShowUsd"
    | "ivaUsd"
    | "totalToPayUsd"
    | "totalTributosUsd"
    | "fobUsd"
    | "fleteUsd"
    | "seguroUsd"
    | "honorariosUsd"
    | "depositoUsd"
    | "transporteNacionalUsd"
    | "transferenciaIntlUsd"
    | "arancelSimUsd"
  >
>;

export type StoredBudgetParsed = ParsedBudget & {
  _original?: ParsedBudget;
  _overrides?: BudgetOverrides;
};

function hasOwn(o: any, k: string) {
  return o && typeof o === "object" && Object.prototype.hasOwnProperty.call(o, k);
}

export function stripBudgetMeta(parsed: StoredBudgetParsed): ParsedBudget {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _original, _overrides, ...rest } = parsed as any;
  return rest as ParsedBudget;
}

export function applyBudgetOverrides(
  base: ParsedBudget,
  overrides?: BudgetOverrides | null
): ParsedBudget {
  const out: any = { ...(base as any) };
  const ov: any = overrides && typeof overrides === "object" ? overrides : null;
  if (!ov) return out as ParsedBudget;

  for (const k of Object.keys(ov)) {
    if (!hasOwn(ov, k)) continue;
    // Allow explicit nulls to clear a value.
    (out as any)[k] = (ov as any)[k];
  }
  return out as ParsedBudget;
}

export function normalizeStoredParsedJson(input: any): StoredBudgetParsed {
  const base: StoredBudgetParsed =
    input && typeof input === "object" ? (input as StoredBudgetParsed) : ({} as any);

  const stripped = stripBudgetMeta(base);
  const original: ParsedBudget =
    base._original && typeof base._original === "object"
      ? (base._original as ParsedBudget)
      : stripped;

  const overrides: BudgetOverrides =
    base._overrides && typeof base._overrides === "object"
      ? (base._overrides as BudgetOverrides)
      : {};

  return {
    ...(stripped as any),
    _original: original,
    _overrides: overrides,
  };
}

export function effectiveParsedFromStored(input: any) {
  const normalized = normalizeStoredParsedJson(input);
  const base = stripBudgetMeta(normalized);
  const effective = applyBudgetOverrides(base, normalized._overrides ?? {});
  return { normalized, base, effective };
}

