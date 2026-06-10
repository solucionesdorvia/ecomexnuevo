-- Perfil de importador persistente en User (Fase 0.b del Motor de Cotización)

-- AlterTable
ALTER TABLE "User" ADD COLUMN "importerProfile" TEXT,
ADD COLUMN "taxId" TEXT,
ADD COLUMN "iibbProvince" TEXT,
ADD COLUMN "fiscalBenefits" TEXT[] DEFAULT ARRAY[]::TEXT[];
