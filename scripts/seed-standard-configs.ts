/**
 * Script per inizializzare le configurazioni standard nel database
 * 
 * Questo script carica le configurazioni standard attuali (hardcoded)
 * nel database StandardConfig, permettendo al Super Admin di modificarle.
 * 
 * Esecuzione:
 * npx tsx scripts/seed-standard-configs.ts
 */

import { prisma } from '../src/lib/prisma';
import { Decimal } from 'decimal.js';

async function main() {
  console.log('🌱 Inizio seed configurazioni standard...\n');

  try {
    // 1. Aliquote IVA standard
    console.log('📋 Caricamento aliquote IVA standard...');
    const vatRatesData = [
      {
        name: 'Standard 22%',
        value: '0.2200',
        nature: null,
        description: 'Aliquota IVA standard italiana',
        isDefault: true,
        active: true,
      },
      {
        name: 'Ridotta 10%',
        value: '0.1000',
        nature: null,
        description: 'Aliquota IVA ridotta',
        isDefault: false,
        active: true,
      },
      {
        name: 'Ridotta 5%',
        value: '0.0500',
        nature: null,
        description: 'Aliquota IVA ridotta',
        isDefault: false,
        active: true,
      },
      {
        name: 'Super Ridotta 4%',
        value: '0.0400',
        nature: null,
        description: 'Aliquota IVA super ridotta',
        isDefault: false,
        active: true,
      },
      {
        name: 'Esente',
        value: '0.0000',
        nature: 'N4',
        description: 'Operazione esente IVA',
        isDefault: false,
        active: true,
      },
    ];

    // Disattiva configurazioni esistenti
    await prisma.standardConfig.updateMany({
      where: { type: 'VAT_RATES', active: true },
      data: { active: false },
    });

    // Crea nuova configurazione
    await prisma.standardConfig.create({
      data: {
        type: 'VAT_RATES',
        data: vatRatesData,
        version: 1,
        description: 'Aliquote IVA standard italiane',
        active: true,
      },
    });
    console.log(`✅ Aliquote IVA: ${vatRatesData.length} aliquote caricate\n`);

    // 2. Unità di misura standard
    console.log('📋 Caricamento unità di misura standard...');
    const unitsOfMeasureData = [
      // PESO (WEIGHT) - Base: Grammi (G)
      {
        code: 'G',
        name: 'Grammi',
        measureClass: 'WEIGHT',
        baseFactor: '1.000000',
        active: true,
      },
      {
        code: 'KG',
        name: 'Chilogrammi',
        measureClass: 'WEIGHT',
        baseFactor: '1000.000000',
        active: true,
      },
      {
        code: 'T',
        name: 'Tonnellate',
        measureClass: 'WEIGHT',
        baseFactor: '1000000.000000',
        active: true,
      },
      {
        code: 'MG',
        name: 'Milligrammi',
        measureClass: 'WEIGHT',
        baseFactor: '0.001000',
        active: true,
      },
      // LUNGHEZZA (LENGTH) - Base: Millimetri (MM)
      {
        code: 'MM',
        name: 'Millimetri',
        measureClass: 'LENGTH',
        baseFactor: '1.000000',
        active: true,
      },
      {
        code: 'CM',
        name: 'Centimetri',
        measureClass: 'LENGTH',
        baseFactor: '10.000000',
        active: true,
      },
      {
        code: 'M',
        name: 'Metri',
        measureClass: 'LENGTH',
        baseFactor: '1000.000000',
        active: true,
      },
      {
        code: 'KM',
        name: 'Chilometri',
        measureClass: 'LENGTH',
        baseFactor: '1000000.000000',
        active: true,
      },
      // VOLUME (VOLUME) - Base: Millilitri (ML)
      {
        code: 'ML',
        name: 'Millilitri',
        measureClass: 'VOLUME',
        baseFactor: '1.000000',
        active: true,
      },
      {
        code: 'L',
        name: 'Litri',
        measureClass: 'VOLUME',
        baseFactor: '1000.000000',
        active: true,
      },
      {
        code: 'M3',
        name: 'Metri cubi',
        measureClass: 'VOLUME',
        baseFactor: '1000000.000000',
        active: true,
      },
      // PEZZI (PIECE) - Base: Pezzi (PZ)
      {
        code: 'PZ',
        name: 'Pezzi',
        measureClass: 'PIECE',
        baseFactor: '1.000000',
        active: true,
      },
      {
        code: 'CT',
        name: 'Cartoni',
        measureClass: 'PIECE',
        baseFactor: '1.000000',
        active: true,
      },
      {
        code: 'SC',
        name: 'Scatole',
        measureClass: 'PIECE',
        baseFactor: '1.000000',
        active: true,
      },
      // SUPERFICIE (AREA) - Base: Metri quadri (M2)
      {
        code: 'M2',
        name: 'Metri quadri',
        measureClass: 'AREA',
        baseFactor: '1.000000',
        active: true,
      },
      {
        code: 'HA',
        name: 'Ettari',
        measureClass: 'AREA',
        baseFactor: '10000.000000',
        active: true,
      },
    ];

    // Disattiva configurazioni esistenti
    await prisma.standardConfig.updateMany({
      where: { type: 'UNITS_OF_MEASURE', active: true },
      data: { active: false },
    });

    // Crea nuova configurazione
    await prisma.standardConfig.create({
      data: {
        type: 'UNITS_OF_MEASURE',
        data: unitsOfMeasureData,
        version: 1,
        description: 'Unità di misura standard italiane',
        active: true,
      },
    });
    console.log(`✅ Unità di misura: ${unitsOfMeasureData.length} unità caricate\n`);

    // 3. Tipi documento standard
    console.log('📋 Caricamento tipi documento standard...');
    const documentTypesData = [
      // CICLO ATTIVO (VENDITA)
      {
        code: 'PRO',
        description: 'Preventivo',
        numeratorCode: 'PRO',
        inventoryMovement: false,
        valuationImpact: false,
        operationSignStock: null,
        operationSignValuation: null,
        active: true,
      },
      {
        code: 'ORD',
        description: 'Ordine Cliente',
        numeratorCode: 'ORD',
        inventoryMovement: false,
        valuationImpact: false,
        operationSignStock: null,
        operationSignValuation: null,
        active: true,
      },
      {
        code: 'DDT',
        description: 'DDT Vendita',
        numeratorCode: 'DDT',
        inventoryMovement: true,
        valuationImpact: false,
        operationSignStock: -1,
        operationSignValuation: null,
        active: true,
      },
      {
        code: 'FAI',
        description: 'Fattura Immediata',
        numeratorCode: 'FAT',
        inventoryMovement: true,
        valuationImpact: true,
        operationSignStock: -1,
        operationSignValuation: 1,
        active: true,
      },
      {
        code: 'FAD',
        description: 'Fattura Differita',
        numeratorCode: 'FAT',
        inventoryMovement: false,
        valuationImpact: true,
        operationSignStock: null,
        operationSignValuation: 1,
        active: true,
      },
      {
        code: 'NDC',
        description: 'Nota di Credito',
        numeratorCode: 'FAT',
        inventoryMovement: true,
        valuationImpact: true,
        operationSignStock: 1,
        operationSignValuation: -1,
        active: true,
      },
      // CICLO PASSIVO (ACQUISTO)
      {
        code: 'OF',
        description: 'Ordine Fornitore',
        numeratorCode: 'OF',
        inventoryMovement: false,
        valuationImpact: false,
        operationSignStock: null,
        operationSignValuation: null,
        active: true,
      },
      {
        code: 'CAF',
        description: 'Carico Fornitore',
        numeratorCode: 'CAF',
        inventoryMovement: true,
        valuationImpact: false,
        operationSignStock: 1,
        operationSignValuation: null,
        active: true,
      },
      {
        code: 'FAC',
        description: 'Fattura Acquisto',
        numeratorCode: 'FAC',
        inventoryMovement: true,
        valuationImpact: true,
        operationSignStock: 1,
        operationSignValuation: 1,
        active: true,
      },
      {
        code: 'NCF',
        description: 'Nota Credito Fornitore',
        numeratorCode: 'FAC',
        inventoryMovement: true,
        valuationImpact: true,
        operationSignStock: -1,
        operationSignValuation: -1,
        active: true,
      },
    ];

    // Disattiva configurazioni esistenti
    await prisma.standardConfig.updateMany({
      where: { type: 'DOCUMENT_TYPES', active: true },
      data: { active: false },
    });

    // Crea nuova configurazione
    await prisma.standardConfig.create({
      data: {
        type: 'DOCUMENT_TYPES',
        data: documentTypesData,
        version: 1,
        description: 'Tipi documento standard per ciclo attivo e passivo',
        active: true,
      },
    });
    console.log(`✅ Tipi documento: ${documentTypesData.length} tipi caricati\n`);

    console.log('✅ Seed configurazioni standard completato con successo!');
    console.log('\n📝 Prossimi passi:');
    console.log('   1. Accedi come Super Admin');
    console.log('   2. Vai su /admin/standard-configs');
    console.log('   3. Modifica le configurazioni standard come necessario');
  } catch (error) {
    console.error('❌ Errore durante il seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
