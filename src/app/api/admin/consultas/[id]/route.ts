import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/** Borra una consulta del formulario de contacto (solo operador/admin). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireRole(["operator", "admin"]);
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: gate.status });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "Falta el id." }, { status: 400 });
  }

  try {
    // Acotado a entityType "contact": solo borra consultas, nunca otros audit logs.
    const res = await prisma.auditLog.deleteMany({ where: { id, entityType: "contact" } });
    return NextResponse.json({ ok: true, deleted: res.count });
  } catch (e) {
    console.error("[admin/consultas] delete error", e);
    return NextResponse.json({ ok: false, error: "No se pudo borrar." }, { status: 500 });
  }
}
