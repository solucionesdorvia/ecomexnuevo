import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import {
  DEFAULT_IMPORT_EXPENSES,
  EXPENSE_FIELDS,
  hydrateImportExpenses,
  saveImportExpenses,
  type ImportExpensesConfig,
} from "@/lib/quote/importExpensesConfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireRole(["admin"]);
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: gate.status });
  }
  const config = await hydrateImportExpenses(true);
  return NextResponse.json({ ok: true, config, defaults: DEFAULT_IMPORT_EXPENSES, fields: EXPENSE_FIELDS });
}

export async function PUT(req: Request) {
  const gate = await requireRole(["admin"]);
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: gate.status });
  }
  const body = (await req.json().catch(() => null)) as Partial<ImportExpensesConfig> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
  }
  const saved = await saveImportExpenses(body, { userId: gate.user?.id, role: gate.user?.role });
  return NextResponse.json({ ok: true, config: saved });
}
