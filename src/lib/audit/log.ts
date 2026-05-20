import { prisma } from "@/lib/db";

type LogParams = {
  entityType: string;
  entityId: string;
  action: string;
  payload?: unknown;
  actorUserId?: string | null;
  actorRole?: string | null;
  quoteId?: string | null;
  operatorBudgetId?: string | null;
};

export async function writeAuditLog(params: LogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        payload: (params.payload ?? null) as any, // Prisma JsonValue cast
        actorUserId: params.actorUserId ?? null,
        actorRole: params.actorRole ?? null,
        quoteId: params.quoteId ?? null,
        operatorBudgetId: params.operatorBudgetId ?? null,
      },
    });
  } catch {
    // Best effort: logs never block product flow.
  }
}

