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

type Stage = typeof STAGES[number];

// Each stage can only advance to the next one, or stay the same (idempotent).
// Admins can also move backwards one step for corrections.
const STAGE_INDEX: Record<Stage, number> = {
  INICIADA: 0,
  ORDEN_COMPRA: 1,
  EMBARQUE: 2,
  ADUANA: 3,
  ENTREGA: 4,
  COMPLETADA: 5,
};

function isValidTransition(from: Stage, to: Stage, role: string): boolean {
  const fromIdx = STAGE_INDEX[from];
  const toIdx = STAGE_INDEX[to];
  const diff = toIdx - fromIdx;
  if (role === "admin") return Math.abs(diff) <= 1; // admins can go back one step
  return diff >= 0 && diff <= 1; // operators can only advance
}

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

  let existing: {
    id: string;
    userId: string;
    stage: string;
    quote: { productJson: unknown; userText: string };
  } | null = null;
  try {
    existing = await prisma.operation.findFirst({
      where,
      select: {
        id: true,
        userId: true,
        stage: true,
        quote: { select: { productJson: true, userText: true } },
      },
    });
  } catch (e) {
    console.error("[op-stage/PATCH] error finding operation", e);
    return NextResponse.json({ error: "No se pudo verificar la operación." }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Operación no encontrada." }, { status: 404 });
  }

  if (!isValidTransition(existing.stage as Stage, newStage, user.role)) {
    const fromLabel = OPERATION_STAGE_LABEL_ES[existing.stage as Stage] ?? existing.stage;
    const toLabel = OPERATION_STAGE_LABEL_ES[newStage] ?? newStage;
    return NextResponse.json(
      { error: `Transición inválida: no se puede pasar de "${fromLabel}" a "${toLabel}".` },
      { status: 422 }
    );
  }

  const label = OPERATION_STAGE_LABEL_ES[newStage] ?? newStage;
  const productLine = operationProductLine(existing.quote.productJson, existing.quote.userText);

  try {
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
  } catch (e) {
    console.error("[op-stage/PATCH] error updating stage", e);
    return NextResponse.json({ error: "No se pudo actualizar la etapa." }, { status: 500 });
  }
}
