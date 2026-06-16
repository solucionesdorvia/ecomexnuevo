import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { normalizeProductKey } from "@/lib/ncm/productCatalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gate = await requireRole(["operator", "admin"]);
  if (!gate.ok) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: gate.status });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  try {
    const rows = await prisma.productNcm.findMany({
      where: q
        ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { ncm: { contains: q } }] }
        : undefined,
      orderBy: [{ verified: "desc" }, { updatedAt: "desc" }],
      take: 300,
    });
    return NextResponse.json({ ok: true, rows });
  } catch {
    // Tabla aún no migrada en la base.
    return NextResponse.json({ ok: true, rows: [], pendingMigration: true });
  }
}

export async function POST(req: Request) {
  const gate = await requireRole(["operator", "admin"]);
  if (!gate.ok) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: gate.status });

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    ncm?: string;
    ncmDescription?: string;
    defaultUse?: string;
    notes?: string;
  } | null;

  const name = (body?.name ?? "").trim();
  const ncm = (body?.ncm ?? "").trim();
  if (!name || !ncm) return NextResponse.json({ ok: false, error: "Nombre y NCM requeridos" }, { status: 400 });

  const key = normalizeProductKey(name);
  if (key.length < 3) return NextResponse.json({ ok: false, error: "Nombre demasiado corto" }, { status: 400 });

  try {
    const row = await prisma.productNcm.upsert({
      where: { key },
      create: {
        key,
        name: name.slice(0, 200),
        ncm,
        ncmDescription: body?.ncmDescription?.trim() || null,
        defaultUse: body?.defaultUse?.trim() || null,
        notes: body?.notes?.trim() || null,
        source: "manual",
        verified: true,
        createdByUserId: gate.user?.id ?? null,
      },
      update: {
        name: name.slice(0, 200),
        ncm,
        ncmDescription: body?.ncmDescription?.trim() || null,
        defaultUse: body?.defaultUse?.trim() || null,
        notes: body?.notes?.trim() || null,
        verified: true,
      },
    });
    return NextResponse.json({ ok: true, row });
  } catch {
    return NextResponse.json(
      { ok: false, error: "No se pudo guardar. ¿Aplicaste la migración en Neon?" },
      { status: 500 }
    );
  }
}
