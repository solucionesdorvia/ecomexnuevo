-- Add optional metadata fields for operator budgets

ALTER TABLE "OperatorBudget" ADD COLUMN "rubro" TEXT;
ALTER TABLE "OperatorBudget" ADD COLUMN "productTitle" TEXT;

