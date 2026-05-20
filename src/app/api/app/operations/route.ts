import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { RATE_LIMIT_MESSAGE, rateLimitByUser } from "@/lib/rateLimit";
import type { Prisma } from "@/generated/prisma/client";

export const runtime = "nodejs";

const postBodySchema = z.object({
  quoteId: z.string().min(1, "quoteId requerido"),
});

/**
 * Lista operaciones: operador/admin ve todas; usuario solo las propias.
 * ?includeCompleted=true incluye COMPLETADA (por defecto se excluyen).
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const url = new URL(req.url);
  const includeCompleted = url.searchParams.get("includeCompleted") === "true";

  const where: Prisma.OperationWhereInput = {
    ...(user.role !== "operator" && user.role !== "admin" ? { userId: user.id } : {}),
    ...(!includeCompleted ? { stage: { not: "COMPLETADA" } } : {}),
  };

  const rows = await prisma.operation.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      quote: {
        select: {
          productJson: true,
          userText: true,
          mode: true,
        },
      },
      user: { select: { email: true } },
      timeline: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return NextResponse.json({
    operations: rows.map((op) => ({
      id: op.id,
      quoteId: op.quoteId,
      stage: op.stage,
      createdAt: op.createdAt.toISOString(),
      updatedAt: op.updatedAt.toISOString(),
      quote: op.quote,
      user: op.user,
      lastEvent: op.timeline[0]
        ? {
            id: op.timeline[0].id,
            stage: op.timeline[0].stage,
            description: op.timeline[0].description,
            actor: op.timeline[0].actor,
            createdAt: op.timeline[0].createdAt.toISOString(),
          }
        : null,
    })),
  });
}

const HOUR_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const rl = rateLimitByUser(user.id, "operations-create", 10, HOUR_MS);
  if (!rl.ok) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = postBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors.quoteId?.[0] ?? "Body inválido." },
      { status: 400 }
    );
  }

  const { quoteId } = parsed.data;

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, userId: user.id },
    select: { id: true, userId: true, stage: true },
  });

  if (!quote) {
    return NextResponse.json({ error: "Cotización no encontrada o sin permiso." }, { status: 404 });
  }

  if (!quote.userId) {
    return NextResponse.json(
      { error: "Esta cotización no tiene usuario asociado; no se puede iniciar importación." },
      { status: 400 }
    );
  }

  const ownerId = quote.userId;

  if (quote.stage !== "quoted") {
    return NextResponse.json(
      { error: `Solo se puede iniciar importación con cotización en estado "quoted" (actual: ${quote.stage}).` },
      { status: 400 }
    );
  }

  const existing = await prisma.operation.findUnique({
    where: { quoteId: quote.id },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "Esta cotización ya tiene una importación iniciada." }, { status: 409 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const operation = await tx.operation.create({
        data: {
          quoteId: quote.id,
          userId: ownerId,
          stage: "INICIADA",
        },
      });

      await tx.operationEvent.create({
        data: {
          operationId: operation.id,
          stage: "INICIADA",
          description: "Importación iniciada",
          actor: user.email,
        },
      });

      return operation;
    });

    return NextResponse.json({ operationId: result.id });
  } catch (e) {
    console.error("[operations/POST] error creating operation", e);
    return NextResponse.json({ error: "No se pudo crear la operación." }, { status: 500 });
  }
}
