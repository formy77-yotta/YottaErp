-- CreateEnum
CREATE TYPE "DocumentImportStatus" AS ENUM ('UPLOADED', 'PARSING', 'PARSED', 'REVIEWING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "DocumentImport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileStoragePath" TEXT,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" "DocumentImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "parsedData" JSONB,
    "supplierId" TEXT,
    "documentId" TEXT,
    "errorMessage" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentImport_organizationId_idx" ON "DocumentImport"("organizationId");

-- CreateIndex
CREATE INDEX "DocumentImport_organizationId_status_idx" ON "DocumentImport"("organizationId", "status");

-- CreateIndex
CREATE INDEX "DocumentImport_userId_idx" ON "DocumentImport"("userId");

-- AddForeignKey
ALTER TABLE "DocumentImport" ADD CONSTRAINT "DocumentImport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentImport" ADD CONSTRAINT "DocumentImport_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentImport" ADD CONSTRAINT "DocumentImport_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
