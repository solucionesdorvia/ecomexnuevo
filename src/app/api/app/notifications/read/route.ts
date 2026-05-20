import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const readSchema = z.union([
  z.object({ ids: z.array(z.string()).min(1) }),
  z.object({ all: z.literal(true) }),
]);

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = readSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const now = new Date();

  try {
    if ("all" in parsed.data) {
      await prisma.notification.updateMany({
        where: { userId: user.id, readAt: null },
        data: { readAt: now },
      });
    } else {
      const ids = parsed.data.ids;
      await prisma.notification.updateMany({
        where: { userId: user.id, id: { in: ids } },
        data: { readAt: now },
      });
    }
  } catch (e) {
    console.error("[notifications/read/POST] error marking notifications read", e);
    return NextResponse.json({ error: "No se pudieron marcar las notificaciones." }, { status: 500 });
  }

  return NextResponse.json({ ok: true as const });
}
