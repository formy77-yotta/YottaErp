-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'USER', 'READONLY');

-- CreateTable: Organization (Multitenant)
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "vatNumber" TEXT,
    "fiscalCode" TEXT,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "zipCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'IT',
    "email" TEXT,
    "pec" TEXT,
    "phone" TEXT,
    "sdiCode" TEXT,
    "logoUrl" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "maxUsers" INTEGER NOT NULL DEFAULT 5,
    "maxInvoicesPerYear" INTEGER NOT NULL DEFAULT 500,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable: UserOrganization (Many-to-Many User-Organization)
CREATE TABLE "UserOrganization" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserOrganization_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Entity - Add organizationId
ALTER TABLE "Entity" 
ADD COLUMN "organizationId" TEXT;

-- AlterTable: VatRate - Add organizationId
ALTER TABLE "VatRate" 
ADD COLUMN "organizationId" TEXT;

-- AlterTable: Product - Add organizationId
ALTER TABLE "Product" 
ADD COLUMN "organizationId" TEXT;

-- AlterTable: Warehouse - Add organizationId
ALTER TABLE "Warehouse" 
ADD COLUMN "organizationId" TEXT;

-- AlterTable: StockMovement - Add organizationId
ALTER TABLE "StockMovement" 
ADD COLUMN "organizationId" TEXT;

-- AlterTable: Document - Add organizationId
ALTER TABLE "Document" 
ADD COLUMN "organizationId" TEXT;

-- 🚨 IMPORTANTE: Creazione organizzazione di default per dati esistenti
-- Se ci sono già dati nel database, associali a un'organizzazione di default
DO $$
DECLARE
    default_org_id TEXT;
BEGIN
    -- Controlla se ci sono tabelle con dati
    IF EXISTS (SELECT 1 FROM "Entity" LIMIT 1) OR 
       EXISTS (SELECT 1 FROM "Product" LIMIT 1) OR
       EXISTS (SELECT 1 FROM "Document" LIMIT 1) THEN
        
        -- Crea organizzazione di default
        INSERT INTO "Organization" ("id", "businessName", "createdAt", "updatedAt")
        VALUES ('default_org_migration', 'Organizzazione Predefinita', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING "id" INTO default_org_id;
        
        -- Associa tutti i record esistenti all'organizzazione di default
        UPDATE "Entity" SET "organizationId" = default_org_id WHERE "organizationId" IS NULL;
        UPDATE "VatRate" SET "organizationId" = default_org_id WHERE "organizationId" IS NULL;
        UPDATE "Product" SET "organizationId" = default_org_id WHERE "organizationId" IS NULL;
        UPDATE "Warehouse" SET "organizationId" = default_org_id WHERE "organizationId" IS NULL;
        UPDATE "StockMovement" SET "organizationId" = default_org_id WHERE "organizationId" IS NULL;
        UPDATE "Document" SET "organizationId" = default_org_id WHERE "organizationId" IS NULL;
    END IF;
END $$;

-- Rendi organizationId NOT NULL dopo aver associato i dati esistenti
ALTER TABLE "Entity" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "VatRate" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Warehouse" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "StockMovement" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Document" ALTER COLUMN "organizationId" SET NOT NULL;

-- CreateIndex: Organization
CREATE UNIQUE INDEX "Organization_vatNumber_key" ON "Organization"("vatNumber");
CREATE INDEX "Organization_businessName_idx" ON "Organization"("businessName");

-- CreateIndex: UserOrganization
CREATE INDEX "UserOrganization_userId_idx" ON "UserOrganization"("userId");
CREATE INDEX "UserOrganization_organizationId_idx" ON "UserOrganization"("organizationId");
CREATE UNIQUE INDEX "UserOrganization_userId_organizationId_key" ON "UserOrganization"("userId", "organizationId");

-- Drop old unique indexes and create new composite ones
ALTER TABLE "Entity" DROP CONSTRAINT IF EXISTS "Entity_vatNumber_key";
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_code_key";
ALTER TABLE "VatRate" DROP CONSTRAINT IF EXISTS "VatRate_name_key";
ALTER TABLE "Warehouse" DROP CONSTRAINT IF EXISTS "Warehouse_code_key";
ALTER TABLE "Document" DROP CONSTRAINT IF EXISTS "Document_number_key";

-- CreateIndex: Entity (with organizationId)
CREATE INDEX "Entity_organizationId_idx" ON "Entity"("organizationId");
CREATE INDEX "Entity_organizationId_businessName_idx" ON "Entity"("organizationId", "businessName");
CREATE INDEX "Entity_organizationId_type_idx" ON "Entity"("organizationId", "type");
CREATE UNIQUE INDEX "Entity_organizationId_vatNumber_key" ON "Entity"("organizationId", "vatNumber");

-- CreateIndex: VatRate (with organizationId)
CREATE INDEX "VatRate_organizationId_idx" ON "VatRate"("organizationId");
CREATE INDEX "VatRate_organizationId_isDefault_idx" ON "VatRate"("organizationId", "isDefault");
CREATE UNIQUE INDEX "VatRate_organizationId_name_key" ON "VatRate"("organizationId", "name");

-- CreateIndex: Product (with organizationId)
CREATE INDEX "Product_organizationId_idx" ON "Product"("organizationId");
CREATE INDEX "Product_organizationId_name_idx" ON "Product"("organizationId", "name");
CREATE UNIQUE INDEX "Product_organizationId_code_key" ON "Product"("organizationId", "code");

-- CreateIndex: Warehouse (with organizationId)
CREATE INDEX "Warehouse_organizationId_idx" ON "Warehouse"("organizationId");
CREATE UNIQUE INDEX "Warehouse_organizationId_code_key" ON "Warehouse"("organizationId", "code");

-- CreateIndex: StockMovement (with organizationId)
CREATE INDEX "StockMovement_organizationId_idx" ON "StockMovement"("organizationId");
CREATE INDEX "StockMovement_organizationId_productId_idx" ON "StockMovement"("organizationId", "productId");
CREATE INDEX "StockMovement_organizationId_warehouseId_idx" ON "StockMovement"("organizationId", "warehouseId");
CREATE INDEX "StockMovement_organizationId_createdAt_idx" ON "StockMovement"("organizationId", "createdAt");
CREATE INDEX "StockMovement_organizationId_documentId_idx" ON "StockMovement"("organizationId", "documentId");

-- CreateIndex: Document (with organizationId)
CREATE INDEX "Document_organizationId_idx" ON "Document"("organizationId");
CREATE INDEX "Document_organizationId_date_idx" ON "Document"("organizationId", "date");
CREATE INDEX "Document_organizationId_entityId_idx" ON "Document"("organizationId", "entityId");
CREATE INDEX "Document_organizationId_type_idx" ON "Document"("organizationId", "type");
CREATE UNIQUE INDEX "Document_organizationId_number_key" ON "Document"("organizationId", "number");

-- AddForeignKey: UserOrganization -> Organization
ALTER TABLE "UserOrganization" ADD CONSTRAINT "UserOrganization_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Entity -> Organization
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: VatRate -> Organization
ALTER TABLE "VatRate" ADD CONSTRAINT "VatRate_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Product -> Organization
ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Warehouse -> Organization
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: StockMovement -> Organization
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Document -> Organization
ALTER TABLE "Document" ADD CONSTRAINT "Document_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
