-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anonId" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "userId" TEXT,
    CONSTRAINT "Lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Lead" ("anonId", "channel", "contact", "createdAt", "id") SELECT "anonId", "channel", "contact", "createdAt", "id" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE INDEX "Lead_anonId_createdAt_idx" ON "Lead"("anonId", "createdAt");
CREATE INDEX "Lead_userId_createdAt_idx" ON "Lead"("userId", "createdAt");
CREATE UNIQUE INDEX "Lead_contact_key" ON "Lead"("contact");
CREATE TABLE "new_Quote" (
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
    "userId" TEXT,
    CONSTRAINT "Quote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Quote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Quote" ("anonId", "createdAt", "id", "leadId", "mode", "productJson", "quoteJson", "sourceUrl", "stage", "totalMaxUsd", "totalMinUsd", "updatedAt", "userText") SELECT "anonId", "createdAt", "id", "leadId", "mode", "productJson", "quoteJson", "sourceUrl", "stage", "totalMaxUsd", "totalMinUsd", "updatedAt", "userText" FROM "Quote";
DROP TABLE "Quote";
ALTER TABLE "new_Quote" RENAME TO "Quote";
CREATE INDEX "Quote_anonId_createdAt_idx" ON "Quote"("anonId", "createdAt");
CREATE INDEX "Quote_leadId_idx" ON "Quote"("leadId");
CREATE INDEX "Quote_userId_createdAt_idx" ON "Quote"("userId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
