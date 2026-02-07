/**
 * Script per popolare la tabella DocumentTypeConfig con tipi documento standard
 * 
 * Recupera la prima Organization disponibile e crea le configurazioni standard.
 * Usa upsert per evitare duplicati se lo script viene eseguito più volte.
 * 
 * Esecuzione:
 * npx tsx scripts/seed-document-types.ts
 */

import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('🌱 Inizio seed configurazioni tipi documento standard...\n');

  try {
    // 1. Recupera la prima Organization disponibile
    const organization = await prisma.organization.findFirst({
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!organization) {
      console.error('❌ Nessuna organizzazione trovata nel database.');
      console.error('   Crea prima un\'organizzazione prima di eseguire questo script.');
      process.exit(1);
    }

    console.log(`✅ Organizzazione trovata: ${organization.businessName} (ID: ${organization.id})\n`);

    // 2. Configurazioni tipi documento standard
    // 
    // NOTA: Il campo 'category' (enum DocumentCategory) è presente solo nel Document,
    // non in DocumentTypeConfig. Quando si crea un Document, mappare il code come segue:
    // - PRO, ORD -> ORDER (per ordini cliente)
    // - OF -> ORDER (per ordini fornitore)
    // - DDT, CAF -> DELIVERY_NOTE
    // - FAI, FAD, FAC -> INVOICE
    // - NDC, NCF -> CREDIT_NOTE
    // - PRO (preventivo) -> QUOTE
    //
    const defaultTypes = [
      // ============================================================================
      // CICLO ATTIVO (VENDITA)
      // ============================================================================
      {
        code: 'PRO',
        description: 'Preventivo',
        numeratorCode: 'PRO',
        inventoryMovement: false,
        valuationImpact: false,
        operationSignStock: null as number | null,
        operationSignValuation: null as number | null,
        active: true,
        // category: QUOTE (quando si crea Document)
      },
      {
        code: 'ORD',
        description: 'Ordine Cliente',
        numeratorCode: 'ORD',
        inventoryMovement: false,
        valuationImpact: false,
        operationSignStock: null as number | null,
        operationSignValuation: null as number | null,
        active: true,
        // category: ORDER (quando si crea Document)
      },
      {
        code: 'DDT',
        description: 'DDT Vendita',
        numeratorCode: 'DDT',
        inventoryMovement: true,
        valuationImpact: false,
        operationSignStock: -1, // Scarico magazzino
        operationSignValuation: null as number | null,
        active: true,
        // category: DELIVERY_NOTE (quando si crea Document)
      },
      {
        code: 'FAI',
        description: 'Fattura Immediata',
        numeratorCode: 'FAT',
        inventoryMovement: true,
        valuationImpact: true,
        operationSignStock: -1, // Scarico magazzino
        operationSignValuation: 1, // Incremento ricavi
        active: true,
        // category: INVOICE (quando si crea Document)
      },
      {
        code: 'FAD',
        description: 'Fattura Differita',
        numeratorCode: 'FAT',
        inventoryMovement: false,
        valuationImpact: true,
        operationSignStock: null as number | null,
        operationSignValuation: 1, // Incremento ricavi
        active: true,
        // category: INVOICE (quando si crea Document)
      },
      {
        code: 'NDC',
        description: 'Nota di Credito',
        numeratorCode: 'FAT',
        inventoryMovement: true,
        valuationImpact: true,
        operationSignStock: 1, // Carico magazzino (reso)
        operationSignValuation: -1, // Decremento ricavi
        active: true,
        // category: CREDIT_NOTE (quando si crea Document)
      },
      
      // ============================================================================
      // CICLO PASSIVO (ACQUISTO)
      // ============================================================================
      {
        code: 'OF',
        description: 'Ordine Fornitore',
        numeratorCode: 'OF',
        inventoryMovement: false,
        valuationImpact: false,
        operationSignStock: null as number | null,
        operationSignValuation: null as number | null,
        active: true,
        // category: ORDER (quando si crea Document)
      },
      {
        code: 'CAF',
        description: 'Carico Fornitore',
        numeratorCode: 'CAF',
        inventoryMovement: true,
        valuationImpact: false,
        operationSignStock: 1, // Carico magazzino
        operationSignValuation: null as number | null,
        active: true,
        // category: DELIVERY_NOTE (quando si crea Document)
      },
      {
        code: 'FAC',
        description: 'Fattura Acquisto',
        numeratorCode: 'FAC',
        inventoryMovement: true,
        valuationImpact: true,
        operationSignStock: 1, // Carico magazzino (se non già fatto da CAF)
        operationSignValuation: 1, // Incremento costi
        active: true,
        // category: INVOICE (quando si crea Document)
      },
      {
        code: 'NCF',
        description: 'Nota Credito Fornitore',
        numeratorCode: 'FAC',
        inventoryMovement: true,
        valuationImpact: true,
        operationSignStock: -1, // Scarico magazzino (reso)
        operationSignValuation: -1, // Decremento costi
        active: true,
        // category: CREDIT_NOTE (quando si crea Document)
      },
    ];

    // 3. Crea tutte le configurazioni usando upsert per evitare duplicati
    let createdCount = 0;
    let updatedCount = 0;

    for (const type of defaultTypes) {
      // Usa upsert per evitare duplicati
      const result = await prisma.documentTypeConfig.upsert({
        where: {
          organizationId_code: {
            organizationId: organization.id,
            code: type.code,
          },
        },
        update: {
          // Se esiste già, aggiorna tutti i campi
          description: type.description,
          numeratorCode: type.numeratorCode,
          inventoryMovement: type.inventoryMovement,
          valuationImpact: type.valuationImpact,
          operationSignStock: type.operationSignStock,
          operationSignValuation: type.operationSignValuation,
          active: type.active,
        },
        create: {
          // Crea nuova configurazione
          organizationId: organization.id,
          code: type.code,
          description: type.description,
          numeratorCode: type.numeratorCode,
          inventoryMovement: type.inventoryMovement,
          valuationImpact: type.valuationImpact,
          operationSignStock: type.operationSignStock,
          operationSignValuation: type.operationSignValuation,
          active: type.active,
        },
      });

      // Verifica se è stato creato o aggiornato controllando la data di creazione
      const isNew = result.createdAt.getTime() === result.updatedAt.getTime();
      
      if (isNew) {
        console.log(`✅ Configurazione "${type.code}" - ${type.description} creata`);
        createdCount++;
      } else {
        console.log(`🔄 Configurazione "${type.code}" - ${type.description} aggiornata`);
        updatedCount++;
      }
    }

    console.log(`\n📊 Riepilogo:`);
    console.log(`   - Configurazioni create: ${createdCount}`);
    console.log(`   - Configurazioni aggiornate: ${updatedCount}`);
    console.log(`   - Totale: ${defaultTypes.length}`);
    console.log(`\n✅ Seed completato con successo!`);
  } catch (error) {
    console.error('❌ Errore durante il seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
