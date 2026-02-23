-- Add roles to User and add OperatorBudget

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'operator', 'admin');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'user';

-- CreateTable
CREATE TABLE "OperatorBudget" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "xlsxBytes" BYTEA NOT NULL,
    "imageBytes" BYTEA NOT NULL,
    "imageType" TEXT NOT NULL,
    "parsedJson" JSONB,

    CONSTRAINT "OperatorBudget_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OperatorBudget" ADD CONSTRAINT "OperatorBudget_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "OperatorBudget_createdByUserId_createdAt_idx" ON "OperatorBudget"("createdByUserId", "createdAt");

