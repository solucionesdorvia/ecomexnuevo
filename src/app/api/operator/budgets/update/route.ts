import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import {
  effectiveParsedFromStored,
  normalizeStoredParsedJson,
  type BudgetOverrides,
} from "@/lib/operatorBudget/overrides";
import { writeAuditLog } from "@/lib/audit/log";

export const runtime = "nodejs";

function clampNum(n: unknown, min: number, max: number) {
  const x = typeof n === "number" ? n : n == null ? null : Number(String(n));
  if (x == null) return null;
  if (!Number.isFinite(x)) return null;
  return Math.max(min, Math.min(max, x));
}

function pickOverrides(input: any): BudgetOverrides {
  const src = input && typeof input === "object" ? input : {};
  const out: any = {};

  // allow null to clear a field; allow numbers
  const keys: Array<keyof BudgetOverrides> = [
    "totalToShowUsd",
    "ivaUsd",
    "totalToPayUsd",
    "totalTributosUsd",
    "fobUsd",
    "fleteUsd",
    "seguroUsd",
    "honorariosUsd",
    "depositoUsd",
    "transporteNacionalUsd",
    "transferenciaIntlUsd",
    "arancelSimUsd",
  ];
  for (const k of keys) {
    if (!(k in src)) continue;
    const v = (src as any)[k];
    if (v === null) out[k] = null;
    else {
      const n = clampNum(v, 0, 1_000_000_000);
      if (n != null) out[k] = n;
    }
  }
  return out as BudgetOverrides;
}

export async function PATCH(req: Request) {
  const gate = await requireRole(["operator", "admin"]);
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: gate.status === 401 ? "Sin sesión." : "Sin permisos." },
      { status: gate.status }
    );
  }

  const body = (await req.json().catch(() => null)) as any;
  const id = String(body?.id ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Falta id." }, { status: 400 });

  const row = await prisma.operatorBudget
    .findUnique({
      where: { id },
      select: { id: true, createdByUserId: true, parsedJson: true, rubro: true, productTitle: true },
    })
    .catch(() => null);
  if (!row) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  if (gate.user.role !== "admin" && row.createdByUserId !== gate.user.id) {
    return NextResponse.json({ ok: false, error: "Sin permisos." }, { status: 403 });
  }

  const overrides = body?.resetOverrides === true ? ({} as BudgetOverrides) : pickOverrides(body?.overrides);
  const parsedNorm = normalizeStoredParsedJson(row.parsedJson as any);
  const mergedOverrides =
    body?.resetOverrides === true ? {} : { ...(parsedNorm._overrides ?? {}), ...overrides };

  // Store both original + overrides (non-destructive)
  const toStore = {
    ...parsedNorm,
    _original: parsedNorm._original ?? (parsedNorm as any),
    _overrides: mergedOverrides,
  } as any;

  const updated = await prisma.operatorBudget.update({
    where: { id },
    data: {
      rubro: typeof body?.rubro === "string" ? body.rubro.trim().slice(0, 80) : row.rubro,
      productTitle:
        typeof body?.productTitle === "string" ? body.productTitle.trim().slice(0, 120) : row.productTitle,
      parsedJson: toStore,
    },
    select: { id: true, createdAt: true, filename: true, rubro: true, productTitle: true, parsedJson: true },
  });

  const effective = effectiveParsedFromStored(updated.parsedJson as any).effective;

  await writeAuditLog({
    entityType: "operator_budget",
    entityId: id,
    action: body?.resetOverrides === true ? "overrides_reset" : "overrides_saved",
    actorUserId: gate.user.id,
    actorRole: gate.user.role,
    operatorBudgetId: id,
    payload: {
      changedFields: Object.keys(overrides ?? {}),
      hasOverrides: Boolean(mergedOverrides && Object.keys(mergedOverrides).length),
    },
  });

  return NextResponse.json({
    ok: true,
    budget: {
      id: updated.id,
      createdAt: updated.createdAt,
      filename: updated.filename,
      rubro: updated.rubro,
      productTitle: updated.productTitle,
      effective,
    },
  });
}

