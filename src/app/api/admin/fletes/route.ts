import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import {
  DEFAULT_FREIGHT_RATES,
  FREIGHT_FIELDS,
  hydrateFreightConfig,
  saveFreightConfig,
  type FreightRatesConfig,
} from "@/lib/quote/freightRatesConfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireRole(["admin"]);
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: gate.status });
  }
  const config = await hydrateFreightConfig(true);
  return NextResponse.json({ ok: true, config, defaults: DEFAULT_FREIGHT_RATES, fields: FREIGHT_FIELDS });
}

export async function PUT(req: Request) {
  const gate = await requireRole(["admin"]);
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: gate.status });
  }
  const body = (await req.json().catch(() => null)) as Partial<FreightRatesConfig> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
  }
  const saved = await saveFreightConfig(body, { userId: gate.user?.id, role: gate.user?.role });
  return NextResponse.json({ ok: true, config: saved });
}
