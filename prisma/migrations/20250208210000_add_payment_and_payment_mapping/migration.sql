-- CreateEnum
CREATE TYPE "PaymentDirection" AS ENUM ('INFLOW', 'OUTFLOW');

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "direction" "PaymentDirection" NOT NULL,
    "paymentTypeId" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMapping" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "paymentDeadlineId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payment_organizationId_idx" ON "Payment"("organizationId");

-- CreateIndex
CREATE INDEX "Payment_organizationId_date_idx" ON "Payment"("organizationId", "date");

-- CreateIndex
CREATE INDEX "Payment_organizationId_direction_idx" ON "Payment"("organizationId", "direction");

-- CreateIndex
CREATE INDEX "Payment_paymentTypeId_idx" ON "Payment"("paymentTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMapping_paymentId_paymentDeadlineId_key" ON "PaymentMapping"("paymentId", "paymentDeadlineId");

-- CreateIndex
CREATE INDEX "PaymentMapping_paymentId_idx" ON "PaymentMapping"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentMapping_paymentDeadlineId_idx" ON "PaymentMapping"("paymentDeadlineId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentTypeId_fkey" FOREIGN KEY ("paymentTypeId") REFERENCES "PaymentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMapping" ADD CONSTRAINT "PaymentMapping_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMapping" ADD CONSTRAINT "PaymentMapping_paymentDeadlineId_fkey" FOREIGN KEY ("paymentDeadlineId") REFERENCES "PaymentDeadline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
