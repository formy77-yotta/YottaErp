-- AlterTable FinancialAccount: add bicSwift and active (missing from original create)
ALTER TABLE "FinancialAccount" ADD COLUMN IF NOT EXISTS "bicSwift" TEXT;
ALTER TABLE "FinancialAccount" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

-- Payment: align with schema (type, description, method)
-- Rename enum so Prisma finds PaymentFlowType
ALTER TYPE "PaymentDirection" RENAME TO "PaymentFlowType";
ALTER TABLE "Payment" RENAME COLUMN "direction" TO "type";

-- Create PaymentMethod enum and add description, method
DO $$ BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM ('TRANSFER', 'CASH', 'CREDIT_CARD', 'CHECK', 'RIBA', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "method" "PaymentMethod" NOT NULL DEFAULT 'OTHER';
