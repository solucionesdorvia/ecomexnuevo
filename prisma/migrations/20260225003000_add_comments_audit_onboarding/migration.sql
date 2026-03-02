-- Add onboarding flag, quote comments and generic audit log

ALTER TABLE "User" ADD COLUMN "onboardingSeenAt" TIMESTAMP(3);

CREATE TABLE "QuoteComment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quoteId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorRole" TEXT NOT NULL,
    "authorLabel" TEXT,
    "message" TEXT NOT NULL,

    CONSTRAINT "QuoteComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB,
    "actorUserId" TEXT,
    "actorRole" TEXT,
    "quoteId" TEXT,
    "operatorBudgetId" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QuoteComment_quoteId_createdAt_idx" ON "QuoteComment"("quoteId", "createdAt");
CREATE INDEX "QuoteComment_authorUserId_createdAt_idx" ON "QuoteComment"("authorUserId", "createdAt");

CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");
CREATE INDEX "AuditLog_quoteId_createdAt_idx" ON "AuditLog"("quoteId", "createdAt");
CREATE INDEX "AuditLog_operatorBudgetId_createdAt_idx" ON "AuditLog"("operatorBudgetId", "createdAt");
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

ALTER TABLE "QuoteComment" ADD CONSTRAINT "QuoteComment_quoteId_fkey"
FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuoteComment" ADD CONSTRAINT "QuoteComment_authorUserId_fkey"
FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_quoteId_fkey"
FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_operatorBudgetId_fkey"
FOREIGN KEY ("operatorBudgetId") REFERENCES "OperatorBudget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

