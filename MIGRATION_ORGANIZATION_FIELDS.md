# Migrazione Database - Campi Organizzazione e Documento

## Campi Aggiunti

### Modello Organization
- `reaUfficio` (String?) - Ufficio REA (es. "RM", "MI")
- `reaNumero` (String?) - Numero REA
- `reaCapitaleSociale` (Decimal?) - Capitale sociale in euro
- `regimeFiscale` (String?) - Regime fiscale (default: "RF01")

### Modello Document
- `codiceCIG` (String?) - Codice Identificativo Gara (per fatture verso PA)
- `codiceCUP` (String?) - Codice Unico Progetto (per fatture verso PA)

## Comando Migrazione

Eseguire manualmente la migrazione Prisma:

```bash
npx prisma migrate dev --name add_organization_rea_and_document_cig_cup
```

Oppure se si preferisce creare solo il file SQL:

```bash
npx prisma migrate dev --name add_organization_rea_and_document_cig_cup --create-only
```

Poi applicare manualmente il file SQL generato in `prisma/migrations/`.

## SQL Manuale (se necessario)

Se Prisma non funziona, eseguire questo SQL direttamente:

```sql
-- Aggiungi campi REA e RegimeFiscale a Organization
ALTER TABLE "Organization" 
ADD COLUMN "reaUfficio" TEXT,
ADD COLUMN "reaNumero" TEXT,
ADD COLUMN "reaCapitaleSociale" DECIMAL(15,2),
ADD COLUMN "regimeFiscale" TEXT DEFAULT 'RF01';

-- Aggiungi campi CodiceCIG e CodiceCUP a Document
ALTER TABLE "Document" 
ADD COLUMN "codiceCIG" TEXT,
ADD COLUMN "codiceCUP" TEXT;
```

## Dopo la Migrazione

1. Rigenerare Prisma Client: `npx prisma generate`
2. Verificare che i campi siano presenti nel database
3. Testare la pagina `/settings/organization`
4. Testare la generazione XML con i nuovi campi
