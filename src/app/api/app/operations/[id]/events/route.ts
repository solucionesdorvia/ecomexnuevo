import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { RATE_LIMIT_MESSAGE, rateLimitByUser } from "@/lib/rateLimit";

export const runtime = "nodejs";

const HOUR_MS = 60 * 60 * 1000;

const STAGES = [
  "INICIADA",
  "ORDEN_COMPRA",
  "EMBARQUE",
  "ADUANA",
  "ENTREGA",
  "COMPLETADA",
] as const;

const postSchema = z.object({
  description: z.string().min(1, "Descripción requerida").max(2000),
  stage: z.enum(STAGES).optional(),
});

function requireOperator(user: Awaited<ReturnType<typeof getSessionUser>>) {
  if (!user) return { ok: false as const, status: 401 as const, msg: "No autorizado." };
  if (user.role !== "operator" && user.role !== "admin") {
    return { ok: false as const, status: 403 as const, msg: "Solo operadores pueden agregar eventos de importación." };
  }
  return { ok: true as const, user };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = requireOperator(await getSessionUser());
  if (!gate.ok) {
    return NextResponse.json({ error: gate.msg }, { status: gate.status });
  }
  const actor = gate.user;

  const rl = rateLimitByUser(actor.id, "op-events-post", 30, HOUR_MS);
  if (!rl.ok) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const { id: operationId } = await params;
  const raw = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors.description?.[0] ?? "Datos inválidos.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  let operation: Awaited<ReturnType<typeof prisma.operation.findFirst<{ select: { id: true; stage: true; userId: true } }>>> = null;
  try {
    operation = await prisma.operation.findFirst({
      where: { id: operationId },
      select: { id: true, stage: true, userId: true },
    });
  } catch (e) {
    console.error("[op-events/POST] error finding operation", e);
    return NextResponse.json({ error: "No se pudo verificar la operación." }, { status: 500 });
  }
  if (!operation) {
    return NextResponse.json({ error: "Operación no encontrada." }, { status: 404 });
  }

  const eventStage = parsed.data.stage ?? operation.stage;
  const desc = parsed.data.description.trim();
  const bodyShort = desc.length > 120 ? `${desc.slice(0, 120)}…` : desc;

  try {
    const ev = await prisma.$transaction(async (tx) => {
      const e = await tx.operationEvent.create({
        data: {
          operationId: operation.id,
          stage: eventStage,
          description: desc,
          actor: actor.email,
        },
        select: {
          id: true,
          operationId: true,
          stage: true,
          description: true,
          actor: true,
          createdAt: true,
        },
      });

      await tx.notification.create({
        data: {
          userId: operation.userId,
          operationId: operation.id,
          type: "EVENT_ADDED",
          title: "Nuevo evento en tu importación",
          body: bodyShort,
        },
      });

      return e;
    });

    return NextResponse.json({
      ok: true as const,
      event: {
        ...ev,
        createdAt: ev.createdAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("[op-events/POST] error creating event", e);
    return NextResponse.json({ error: "No se pudo registrar el evento." }, { status: 500 });
  }
}
