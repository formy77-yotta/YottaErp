-- CreateEnum
CREATE TYPE "FinancialAccountType" AS ENUM ('BANK', 'CASH', 'VIRTUAL');

-- CreateTable
CREATE TABLE "FinancialAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinancialAccountType" NOT NULL,
    "iban" TEXT,
    "initialBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

-- AddColumn: nullable for backfill
ALTER TABLE "Payment" ADD COLUMN "financialAccountId" TEXT;

-- Backfill: one "Cassa Contanti" per organization that has payments, then assign
INSERT INTO "FinancialAccount" ("id", "organizationId", "name", "type", "initialBalance", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    sub."organizationId",
    'Cassa Contanti',
    'CASH',
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "organizationId" FROM "Payment") sub;

UPDATE "Payment" p
SET "financialAccountId" = (
    SELECT fa."id" FROM "FinancialAccount" fa
    WHERE fa."organizationId" = p."organizationId" AND fa."type" = 'CASH'
    LIMIT 1
);

ALTER TABLE "Payment" ALTER COLUMN "financialAccountId" SET NOT NULL;

CREATE INDEX "FinancialAccount_organizationId_idx" ON "FinancialAccount"("organizationId");
CREATE INDEX "FinancialAccount_organizationId_type_idx" ON "FinancialAccount"("organizationId", "type");
CREATE INDEX "Payment_financialAccountId_idx" ON "Payment"("financialAccountId");

ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
