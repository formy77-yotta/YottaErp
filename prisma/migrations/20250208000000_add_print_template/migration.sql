-- CreateTable
CREATE TABLE "PrintTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintTemplate_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add templateId to DocumentTypeConfig
ALTER TABLE "DocumentTypeConfig" ADD COLUMN "templateId" TEXT;

-- CreateIndex
CREATE INDEX "PrintTemplate_organizationId_idx" ON "PrintTemplate"("organizationId");

-- CreateIndex
CREATE INDEX "PrintTemplate_organizationId_isDefault_idx" ON "PrintTemplate"("organizationId", "isDefault");

-- CreateIndex
CREATE INDEX "DocumentTypeConfig_templateId_idx" ON "DocumentTypeConfig"("templateId");

-- AddForeignKey
ALTER TABLE "PrintTemplate" ADD CONSTRAINT "PrintTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTypeConfig" ADD CONSTRAINT "DocumentTypeConfig_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PrintTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
