-- AlterTable: Assicura che tutte le colonne opzionali del modello Document esistano
-- Questa migrazione aggiunge solo le colonne opzionali che potrebbero mancare

-- Colonne snapshot cliente opzionali
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "customerSdiSnapshot" TEXT;

-- Colonne per fatturazione PA (FatturaPA) - opzionali
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "codiceCIG" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "codiceCUP" TEXT;

-- Colonne opzionali già verificate in migrazioni precedenti
-- customerVatSnapshot, customerFiscalCodeSnapshot, notes, paymentTerms
-- Se mancano, verranno aggiunte automaticamente da Prisma in futuro
