/**
 * Script per ottenere l'ID utente dall'email
 * 
 * UTILIZZO:
 * npx tsx scripts/get-user-id.ts
 */

// Carica variabili d'ambiente dal file .env
import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as readline from 'readline';

// Configurazione Prisma con adapter PostgreSQL
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Errore: DATABASE_URL o DIRECT_URL non configurato nel file .env');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ['error', 'warn'] });

// Utility per input da console
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function getUserId() {
  console.log('='.repeat(60));
  console.log('🔍 TROVA USER ID - YottaErp');
  console.log('='.repeat(60));
  console.log('');

  try {
    const email = await prompt('Inserisci l\'email dell\'utente: ');

    if (!email) {
      console.error('❌ Email non valida');
      process.exit(1);
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isSuperAdmin: true,
        active: true,
      },
    });

    if (!user) {
      console.error(`\n❌ Utente con email ${email} non trovato nel database.`);
      process.exit(1);
    }

    console.log('');
    console.log('✅ Utente trovato!');
    console.log('');
    console.log('📋 Dettagli:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Nome: ${user.firstName} ${user.lastName}`);
    console.log(`   Super Admin: ${user.isSuperAdmin ? '✅ Sì' : '❌ No'}`);
    console.log(`   Attivo: ${user.active ? '✅ Sì' : '❌ No'}`);
    console.log('');
    console.log('📝 Aggiungi questo ID al file .env:');
    console.log(`   SUPER_ADMIN_IDS="${user.id}"`);
    console.log('');
    console.log('💡 Se hai già altri ID, aggiungi questo separato da virgola:');
    console.log(`   SUPER_ADMIN_IDS="id1,id2,${user.id}"`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Errore:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

getUserId();
