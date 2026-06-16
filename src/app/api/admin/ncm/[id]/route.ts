import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireRole(["operator", "admin"]);
  if (!gate.ok) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: gate.status });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as {
    ncm?: string;
    verified?: boolean;
    defaultUse?: string;
    notes?: string;
  } | null;
  try {
    const row = await prisma.productNcm.update({
      where: { id },
      data: {
        ...(typeof body?.ncm === "string" && body.ncm.trim() ? { ncm: body.ncm.trim() } : {}),
        ...(typeof body?.verified === "boolean" ? { verified: body.verified } : {}),
        ...(typeof body?.defaultUse === "string" ? { defaultUse: body.defaultUse.trim() || null } : {}),
        ...(typeof body?.notes === "string" ? { notes: body.notes.trim() || null } : {}),
      },
    });
    return NextResponse.json({ ok: true, row });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo actualizar" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireRole(["operator", "admin"]);
  if (!gate.ok) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: gate.status });
  const { id } = await params;
  try {
    await prisma.productNcm.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo borrar" }, { status: 500 });
  }
}
