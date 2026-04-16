import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { RATE_LIMIT_MESSAGE, rateLimitByUser } from "@/lib/rateLimit";
import { operationWhereForUser } from "@/lib/operations/operationAccess";
import { operationProductLine } from "@/lib/notifications/operationProductLine";
import { OPERATION_STAGE_LABEL_ES } from "@/lib/operations/stageLabels";

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

const patchSchema = z.object({
  stage: z.enum(STAGES),
});

function requireOperator(user: Awaited<ReturnType<typeof getSessionUser>>) {
  if (!user) return { ok: false as const, status: 401 as const, msg: "No autorizado." };
  if (user.role !== "operator" && user.role !== "admin") {
    return { ok: false as const, status: 403 as const, msg: "Solo operadores pueden cambiar etapas de importación." };
  }
  return { ok: true as const, user };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requireOperator(await getSessionUser());
  if (!session.ok) {
    return NextResponse.json({ error: session.msg }, { status: session.status });
  }
  const user = session.user;

  const rl = rateLimitByUser(user.id, "op-stage-patch", 60, HOUR_MS);
  if (!rl.ok) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const { id: operationId } = await params;
  const raw = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Stage inválido." }, { status: 400 });
  }

  const newStage = parsed.data.stage;

  const where = operationWhereForUser(user, operationId);
  const existing = await prisma.operation.findFirst({
    where,
    select: {
      id: true,
      userId: true,
      stage: true,
      quote: { select: { productJson: true, userText: true } },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Operación no encontrada." }, { status: 404 });
  }

  const label = OPERATION_STAGE_LABEL_ES[newStage] ?? newStage;
  const productLine = operationProductLine(existing.quote.productJson, existing.quote.userText);

  const updated = await prisma.$transaction(async (tx) => {
    const op = await tx.operation.update({
      where: { id: existing.id },
      data: { stage: newStage },
      select: { id: true, stage: true, updatedAt: true },
    });

    await tx.operationEvent.create({
      data: {
        operationId: op.id,
        stage: newStage,
        description: `Etapa actualizada a ${label}`,
        actor: user.email,
      },
    });

    if (existing.userId !== user.id) {
      await tx.notification.create({
        data: {
          userId: existing.userId,
          operationId: op.id,
          type: "STAGE_CHANGED",
          title: `Tu importación avanzó a ${label}`,
          body: `${productLine} pasó a etapa ${label}`,
        },
      });
    }

    return op;
  });

  return NextResponse.json({
    ok: true as const,
    stage: updated.stage,
    updatedAt: updated.updatedAt.toISOString(),
  });
}
