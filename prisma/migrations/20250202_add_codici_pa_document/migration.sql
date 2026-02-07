-- AlterTable: Aggiunge colonne mancanti alla tabella Document
-- Queste colonne sono necessarie per fatturazione elettronica completa

-- Aggiungi colonna customerSdiSnapshot (Codice SDI cliente - snapshot)
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "customerSdiSnapshot" TEXT;

-- Aggiungi colonna codiceCIG (Codice Identificativo Gara) - per FatturaPA
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "codiceCIG" TEXT;

-- Aggiungi colonna codiceCUP (Codice Unico Progetto) - per FatturaPA
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "codiceCUP" TEXT;
