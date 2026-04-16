import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { operationWhereForUser } from "./operationAccess";

export async function loadOperationDetail(operationId: string, user: SessionUser) {
  const where = operationWhereForUser(user, operationId);

  const operation = await prisma.operation.findFirst({
    where,
    include: {
      quote: {
        select: {
          id: true,
          productJson: true,
          quoteJson: true,
          totalMinUsd: true,
          totalMaxUsd: true,
          stage: true,
          userText: true,
          mode: true,
        },
      },
      timeline: { orderBy: { createdAt: "asc" } },
      documents: { orderBy: { createdAt: "desc" } },
      suppliers: { orderBy: { name: "asc" } },
    },
  });

  if (!operation) return null;

  const comments = await prisma.quoteComment.findMany({
    where: { quoteId: operation.quoteId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      createdAt: true,
      authorRole: true,
      authorLabel: true,
      message: true,
    },
  });

  return { operation, comments };
}
