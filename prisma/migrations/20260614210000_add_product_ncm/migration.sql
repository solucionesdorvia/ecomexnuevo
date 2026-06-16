-- Catálogo curado de NCM por producto (base que crece al cotizar + curaduría)

CREATE TABLE "ProductNcm" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keywords" TEXT,
    "ncm" TEXT NOT NULL,
    "ncmDescription" TEXT,
    "confidence" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'ai',
    "defaultUse" TEXT,
    "notes" TEXT,
    "timesUsed" INTEGER NOT NULL DEFAULT 1,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,

    CONSTRAINT "ProductNcm_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductNcm_key_key" ON "ProductNcm"("key");
CREATE INDEX "ProductNcm_ncm_idx" ON "ProductNcm"("ncm");
CREATE INDEX "ProductNcm_updatedAt_idx" ON "ProductNcm"("updatedAt");
