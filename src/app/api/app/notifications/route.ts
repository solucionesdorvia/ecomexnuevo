import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          operation: {
            select: {
              id: true,
              quote: { select: { productJson: true, userText: true } },
            },
          },
        },
      }),
      prisma.notification.count({
        where: { userId: user.id, readAt: null },
      }),
    ]);

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
        operation: n.operation
          ? {
              id: n.operation.id,
              quote: n.operation.quote,
            }
          : null,
      })),
      unreadCount,
    });
  } catch (e) {
    console.error("[notifications/GET] error", e);
    return NextResponse.json({ error: "No se pudieron cargar las notificaciones." }, { status: 500 });
  }
}
