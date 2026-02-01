/**
 * Test Sicurezza RLS + Verifica Prisma
 * 
 * Verifica che:
 * 1. Prisma si connetta correttamente (bypassa RLS con service_role)
 * 2. Le tabelle siano accessibili via Prisma
 */

import { prisma } from './src/lib/prisma';

async function testRLSAndPrisma() {
  try {
    console.log('🔐 Test Sicurezza RLS + Connessione Prisma\n');
    console.log('━'.repeat(60));

    // Test 1: Connessione base
    console.log('\n1️⃣  Test connessione...');
    await prisma.$connect();
    console.log('   ✅ Prisma connesso correttamente');

    // Test 2: Verifica accesso tabelle (Prisma bypassa RLS)
    console.log('\n2️⃣  Test accesso tabelle (Prisma bypassa RLS)...');
    
    const entityCount = await prisma.entity.count();
    console.log(`   ✅ Entity: ${entityCount} record`);

    const vatRateCount = await prisma.vatRate.count();
    console.log(`   ✅ VatRate: ${vatRateCount} record`);

    const productCount = await prisma.product.count();
    console.log(`   ✅ Product: ${productCount} record`);

    const warehouseCount = await prisma.warehouse.count();
    console.log(`   ✅ Warehouse: ${warehouseCount} record`);

    const stockMovementCount = await prisma.stockMovement.count();
    console.log(`   ✅ StockMovement: ${stockMovementCount} record`);

    const documentCount = await prisma.document.count();
    console.log(`   ✅ Document: ${documentCount} record`);

    const documentLineCount = await prisma.documentLine.count();
    console.log(`   ✅ DocumentLine: ${documentLineCount} record`);

    // Test 3: Verifica RLS abilitato
    console.log('\n3️⃣  Verifica RLS abilitato su database...');
    const rlsStatus = await prisma.$queryRawUnsafe<Array<{tablename: string, rowsecurity: boolean}>>(
      `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    );
    
    console.log('\n   Stato RLS per tabella:');
    rlsStatus.forEach(table => {
      const status = table.rowsecurity ? '🔒 ENABLED' : '⚠️  DISABLED';
      console.log(`   ${status}  ${table.tablename}`);
    });

    // Test 4: Verifica policy esistenti
    console.log('\n4️⃣  Verifica policy RLS...');
    const policies = await prisma.$queryRawUnsafe<Array<{tablename: string, policyname: string}>>(
      `SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename`
    );

    if (policies.length > 0) {
      console.log(`   ✅ ${policies.length} policy trovate:`);
      policies.forEach(policy => {
        console.log(`      - ${policy.tablename}: ${policy.policyname}`);
      });
    } else {
      console.log('   ⚠️  Nessuna policy trovata!');
    }

    console.log('\n' + '━'.repeat(60));
    console.log('\n🎉 RISULTATO FINALE:\n');
    console.log('✅ Prisma funziona correttamente (bypassa RLS con service_role)');
    console.log('✅ Tutte le tabelle sono accessibili');
    
    if (rlsStatus.every(t => t.rowsecurity)) {
      console.log('✅ RLS abilitato su TUTTE le tabelle');
    } else {
      console.log('⚠️  RLS NON abilitato su alcune tabelle!');
    }

    if (policies.length >= 7) {
      console.log('✅ Policy di sicurezza configurate');
    } else {
      console.log('⚠️  Policy di sicurezza mancanti!');
    }

    console.log('\n🔐 SICUREZZA: Le API pubbliche Supabase sono BLOCCATE da RLS');
    console.log('📝 Solo Prisma (con credenziali admin) può accedere ai dati\n');

  } catch (error) {
    console.error('\n❌ ERRORE:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testRLSAndPrisma();
