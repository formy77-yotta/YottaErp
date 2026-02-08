-- CreateEnum
CREATE TYPE "EntityAddressType" AS ENUM ('LEGAL_HEADQUARTER', 'SHIPPING');

-- CreateTable
CREATE TABLE "EntityAddress" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "type" "EntityAddressType" NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'IT',
    "receiverName" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntityAddress_pkey" PRIMARY KEY ("id")
);

-- AlterTable Document: add shipping snapshot columns
ALTER TABLE "Document" ADD COLUMN "shippingReceiverName" TEXT;
ALTER TABLE "Document" ADD COLUMN "shippingStreet" TEXT;
ALTER TABLE "Document" ADD COLUMN "shippingCity" TEXT;
ALTER TABLE "Document" ADD COLUMN "shippingZipCode" TEXT;
ALTER TABLE "Document" ADD COLUMN "shippingProvince" TEXT;
ALTER TABLE "Document" ADD COLUMN "shippingCountry" TEXT DEFAULT 'IT';
ALTER TABLE "Document" ADD COLUMN "shippingAddressId" TEXT;

-- CreateIndex
CREATE INDEX "EntityAddress_entityId_idx" ON "EntityAddress"("entityId");
CREATE INDEX "EntityAddress_entityId_type_idx" ON "EntityAddress"("entityId", "type");
CREATE INDEX "EntityAddress_entityId_isDefault_idx" ON "EntityAddress"("entityId", "isDefault");

CREATE INDEX "Document_shippingAddressId_idx" ON "Document"("shippingAddressId");

-- AddForeignKey
ALTER TABLE "EntityAddress" ADD CONSTRAINT "EntityAddress_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "EntityAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;
