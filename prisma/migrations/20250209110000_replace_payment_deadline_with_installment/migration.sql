-- CreateEnum: InstallmentStatus (scadenze)
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateTable: Installment (sostituisce PaymentDeadline)
CREATE TABLE "Installment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Installment_pkey" PRIMARY KEY ("id")
);

-- Migrate data: PaymentDeadline -> Installment (stesso id per mantenere riferimenti in PaymentMapping)
-- status = PENDING (il "pagato" si calcola da PaymentMapping)
INSERT INTO "Installment" ("id", "organizationId", "documentId", "dueDate", "amount", "status", "notes", "createdAt", "updatedAt")
SELECT
    pd."id",
    d."organizationId",
    pd."documentId",
    pd."dueDate",
    pd."amount",
    'PENDING'::"InstallmentStatus",
    NULL,
    pd."createdAt",
    pd."updatedAt"
FROM "PaymentDeadline" pd
JOIN "Document" d ON d."id" = pd."documentId";

-- PaymentMapping: rimuovi FK verso PaymentDeadline, rinomina colonna, riattacca FK a Installment
ALTER TABLE "PaymentMapping" DROP CONSTRAINT IF EXISTS "PaymentMapping_paymentDeadlineId_fkey";

ALTER TABLE "PaymentMapping" RENAME COLUMN "paymentDeadlineId" TO "installmentId";

DROP INDEX IF EXISTS "PaymentMapping_paymentId_paymentDeadlineId_key";
CREATE UNIQUE INDEX "PaymentMapping_paymentId_installmentId_key" ON "PaymentMapping"("paymentId", "installmentId");

DROP INDEX IF EXISTS "PaymentMapping_paymentDeadlineId_idx";
CREATE INDEX "PaymentMapping_installmentId_idx" ON "PaymentMapping"("installmentId");

ALTER TABLE "PaymentMapping" ADD CONSTRAINT "PaymentMapping_installmentId_fkey"
    FOREIGN KEY ("installmentId") REFERENCES "Installment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indici Installment
CREATE INDEX "Installment_organizationId_idx" ON "Installment"("organizationId");
CREATE INDEX "Installment_documentId_idx" ON "Installment"("documentId");
CREATE INDEX "Installment_dueDate_idx" ON "Installment"("dueDate");
CREATE INDEX "Installment_status_idx" ON "Installment"("status");

ALTER TABLE "Installment" ADD CONSTRAINT "Installment_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rimuovi tabella e vincoli PaymentDeadline (Document non ha più FK a PaymentDeadline, è solo la tabella)
DROP TABLE "PaymentDeadline";
