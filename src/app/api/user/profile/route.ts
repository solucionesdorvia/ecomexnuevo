import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    company?: string;
  } | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
  }

  const data: { name?: string; company?: string } = {};
  if (typeof body.name === "string") data.name = body.name.trim().slice(0, 120);
  if (typeof body.company === "string") data.company = body.company.trim().slice(0, 120);

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: { id: true, name: true, company: true, email: true },
    });
    return NextResponse.json({ ok: true, user: updated });
  } catch (e) {
    console.error("[user/profile] error updating profile", e);
    return NextResponse.json({ ok: false, error: "No se pudo actualizar el perfil." }, { status: 500 });
  }
}
