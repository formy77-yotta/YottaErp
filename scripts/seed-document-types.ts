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
    const defaultTypes = [
      {
        code: 'PRO',
        description: 'Preventivo',
        numeratorCode: 'PRO',
        inventoryMovement: false,
        valuationImpact: false,
        operationSignStock: null as number | null,
        operationSignValuation: null as number | null,
        active: true,
      },
      {
        code: 'ORD',
        description: 'Ordine',
        numeratorCode: 'ORD',
        inventoryMovement: false,
        valuationImpact: false,
        operationSignStock: null as number | null,
        operationSignValuation: null as number | null,
        active: true,
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
      },
    ];

    // 3. Crea tutte le configurazioni usando upsert per evitare duplicati
    let createdCount = 0;
    let updatedCount = 0;

    for (const type of defaultTypes) {
      const existing = await prisma.documentTypeConfig.findUnique({
        where: {
          organizationId_code: {
            organizationId: organization.id,
            code: type.code,
          },
        },
      });

      if (existing) {
        // Aggiorna se esiste già
        await prisma.documentTypeConfig.update({
          where: {
            id: existing.id,
          },
          data: {
            description: type.description,
            numeratorCode: type.numeratorCode,
            inventoryMovement: type.inventoryMovement,
            valuationImpact: type.valuationImpact,
            operationSignStock: type.operationSignStock,
            operationSignValuation: type.operationSignValuation,
            active: type.active,
          },
        });
        console.log(`🔄 Configurazione "${type.code}" - ${type.description} aggiornata`);
        updatedCount++;
      } else {
        // Crea nuova configurazione
        await prisma.documentTypeConfig.create({
          data: {
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
        console.log(`✅ Configurazione "${type.code}" - ${type.description} creata`);
        createdCount++;
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
