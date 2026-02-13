-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "anonId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "userText" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "productJson" JSONB,
    "quoteJson" JSONB NOT NULL,
    "totalMinUsd" REAL,
    "totalMaxUsd" REAL,
    "stage" TEXT NOT NULL DEFAULT 'quoted',
    "leadId" TEXT,
    CONSTRAINT "Quote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anonId" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "channel" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "Quote_anonId_createdAt_idx" ON "Quote"("anonId", "createdAt");

-- CreateIndex
CREATE INDEX "Quote_leadId_idx" ON "Quote"("leadId");

-- CreateIndex
CREATE INDEX "Lead_anonId_createdAt_idx" ON "Lead"("anonId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_contact_key" ON "Lead"("contact");
