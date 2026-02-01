/**
 * Script di test per verificare le funzionalità Super Admin
 * 
 * Esegui con: npx tsx scripts/test-super-admin.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Setup connessione come in src/lib/prisma.ts
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

async function testSuperAdmin() {
  console.log('🧪 Test Super Admin Organizations\n');

  try {
    // Test 1: Connessione database
    console.log('1️⃣  Test connessione database...');
    await prisma.$connect();
    console.log('✅ Connessione database OK\n');

    // Test 2: Conta organizzazioni
    console.log('2️⃣  Conteggio organizzazioni...');
    const count = await prisma.organization.count();
    console.log(`✅ Trovate ${count} organizzazioni\n`);

    // Test 3: Lista organizzazioni con conteggi
    console.log('3️⃣  Recupero organizzazioni con statistiche...');
    const organizations = await prisma.organization.findMany({
      include: {
        _count: {
          select: {
            users: true,
            entities: true,
            products: true,
            documents: true,
          }
        }
      },
      take: 5, // Limita a 5 per non intasare output
    });

    if (organizations.length > 0) {
      console.log('✅ Organizzazioni trovate:\n');
      organizations.forEach((org, index) => {
        console.log(`   ${index + 1}. ${org.businessName}`);
        console.log(`      - P.IVA: ${org.vatNumber || 'N/A'}`);
        console.log(`      - Piano: ${org.plan}`);
        console.log(`      - Attiva: ${org.active ? '✅' : '❌'}`);
        console.log(`      - Utenti: ${org._count.users}`);
        console.log(`      - Clienti/Fornitori: ${org._count.entities}`);
        console.log(`      - Prodotti: ${org._count.products}`);
        console.log(`      - Documenti: ${org._count.documents}`);
        console.log('');
      });
    } else {
      console.log('⚠️  Nessuna organizzazione trovata');
      console.log('   Suggerimento: crea la prima organizzazione tramite UI');
    }

    // Test 4: Verifica unique constraint P.IVA
    console.log('4️⃣  Test unique constraint P.IVA...');
    const withVat = await prisma.organization.findMany({
      where: {
        vatNumber: { not: null }
      },
      select: {
        vatNumber: true,
        businessName: true,
      }
    });

    const vatNumbers = withVat.map(o => o.vatNumber);
    const uniqueVats = new Set(vatNumbers);
    
    if (vatNumbers.length === uniqueVats.size) {
      console.log('✅ Tutte le P.IVA sono uniche\n');
    } else {
      console.log('❌ ERRORE: P.IVA duplicate trovate!\n');
    }

    // Test 5: Statistiche globali
    console.log('5️⃣  Statistiche globali...');
    const stats = await prisma.organization.aggregate({
      _count: { id: true },
      _sum: {
        maxUsers: true,
        maxInvoicesPerYear: true,
      }
    });

    const totalUsers = await prisma.userOrganization.count();
    const totalDocuments = await prisma.document.count();
    const activeOrgs = await prisma.organization.count({
      where: { active: true }
    });

    console.log(`   📊 Organizzazioni totali: ${stats._count.id}`);
    console.log(`   ✅ Organizzazioni attive: ${activeOrgs}`);
    console.log(`   👥 Utenti totali: ${totalUsers}`);
    console.log(`   📄 Documenti totali: ${totalDocuments}`);
    console.log(`   🎯 Capacità utenti: ${stats._sum.maxUsers || 0}`);
    console.log(`   📈 Capacità fatture/anno: ${stats._sum.maxInvoicesPerYear || 0}`);

    console.log('\n✅ Tutti i test completati con successo!\n');

  } catch (error) {
    console.error('\n❌ Errore durante i test:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui test
testSuperAdmin();
