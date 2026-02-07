/**
 * Script per verificare lo stato del Super Admin
 * 
 * UTILIZZO:
 * npx tsx scripts/check-super-admin.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Errore: DATABASE_URL o DIRECT_URL non configurato');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ['error'] });

async function checkSuperAdmin() {
  try {
    console.log('🔍 Verifica Super Admin...\n');

    // Trova tutti i Super Admin
    const superAdmins = await prisma.user.findMany({
      where: { isSuperAdmin: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        active: true,
        isSuperAdmin: true,
      },
    });

    if (superAdmins.length === 0) {
      console.log('❌ Nessun Super Admin trovato nel database!\n');
      console.log('💡 Esegui: npx tsx scripts/create-super-admin.ts\n');
      process.exit(1);
    }

    console.log(`✅ Trovati ${superAdmins.length} Super Admin:\n`);

    superAdmins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.firstName} ${admin.lastName}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   ID: ${admin.id}`);
      console.log(`   Attivo: ${admin.active ? '✅' : '❌'}`);
      console.log(`   Super Admin: ${admin.isSuperAdmin ? '✅' : '❌'}`);
      console.log('');
    });

    console.log('📝 Per accedere a /organizations:');
    console.log('   1. Fai login con una di queste email');
    console.log('   2. Assicurati che l\'utente sia attivo (active: true)');
    console.log('   3. Verifica che isSuperAdmin sia true\n');

  } catch (error) {
    console.error('❌ Errore:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkSuperAdmin();
