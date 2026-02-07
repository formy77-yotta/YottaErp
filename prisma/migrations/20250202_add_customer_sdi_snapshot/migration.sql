-- AlterTable: Aggiunge colonna customerSdiSnapshot alla tabella Document
-- Questa colonna è necessaria per lo snapshot del codice SDI del cliente

-- Aggiungi colonna customerSdiSnapshot (Codice SDI cliente - snapshot)
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "customerSdiSnapshot" TEXT;
