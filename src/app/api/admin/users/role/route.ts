import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import type { UserRole } from "@/generated/prisma/enums";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const gate = await requireRole(["admin"]);
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: gate.status === 401 ? "Sin sesión." : "Sin permisos." },
      { status: gate.status }
    );
  }

  try {
    const body = (await req.json()) as { userId?: string; role?: string };
    const userId = String(body.userId ?? "").trim();
    const role = String(body.role ?? "").trim();

    if (!userId) {
      return NextResponse.json({ ok: false, error: "Falta userId." }, { status: 400 });
    }
    if (!["user", "operator", "admin"].includes(role)) {
      return NextResponse.json({ ok: false, error: "Rol inválido." }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: role as UserRole },
      select: { id: true, email: true, role: true },
    });
    return NextResponse.json({ ok: true, user: updated });
  } catch {
    return NextResponse.json(
      { ok: false, error: "No se pudo actualizar el rol." },
      { status: 500 }
    );
  }
}

