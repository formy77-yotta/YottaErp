-- AlterTable: Aggiunge colonne REA e Regime Fiscale alla tabella Organization
-- Queste colonne sono necessarie per la fatturazione elettronica italiana

-- Aggiungi colonna reaUfficio (Ufficio REA, es. "RM", "MI")
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "reaUfficio" TEXT;

-- Aggiungi colonna reaNumero (Numero REA)
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "reaNumero" TEXT;

-- Aggiungi colonna reaCapitaleSociale (Capitale sociale in euro)
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "reaCapitaleSociale" DECIMAL(15, 2);

-- Aggiungi colonna regimeFiscale (Regime fiscale per fatturazione elettronica)
-- Default: "RF01" (Ordinario)
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "regimeFiscale" TEXT DEFAULT 'RF01';
