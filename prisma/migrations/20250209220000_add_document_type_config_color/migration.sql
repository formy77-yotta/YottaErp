-- AlterTable: add color to DocumentTypeConfig (etichetta tipo documento)
ALTER TABLE "DocumentTypeConfig" ADD COLUMN IF NOT EXISTS "color" TEXT;
