/**
 * Script per verificare le organizzazioni di un utente
 * 
 * UTILIZZO:
 * npx tsx scripts/check-user-organizations.ts
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

async function checkUserOrganizations() {
  console.log('='.repeat(60));
  console.log('🔍 VERIFICA ORGANIZZAZIONI UTENTE - YottaErp');
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
      include: {
        organizations: {
          include: {
            organization: {
              select: {
                id: true,
                businessName: true,
                active: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      console.error(`\n❌ Utente con email ${email} non trovato nel database.`);
      process.exit(1);
    }

    console.log('');
    console.log('✅ Utente trovato!');
    console.log('');
    console.log('📋 Dettagli Utente:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Nome: ${user.firstName} ${user.lastName}`);
    console.log(`   Super Admin: ${user.isSuperAdmin ? '✅ Sì' : '❌ No'}`);
    console.log(`   Attivo: ${user.active ? '✅ Sì' : '❌ No'}`);
    console.log('');
    console.log(`📦 Organizzazioni (${user.organizations.length}):`);
    
    if (user.organizations.length === 0) {
      console.log('   ⚠️  Nessuna organizzazione trovata!');
      console.log('');
      console.log('💡 Questo spiega perché vai sempre a /organizations se sei Super Admin.');
      console.log('   Crea un\'organizzazione o aggiungi l\'utente a un\'organizzazione esistente.');
    } else {
      user.organizations.forEach((membership, index) => {
        const org = membership.organization;
        console.log(`   ${index + 1}. ${org.businessName}`);
        console.log(`      ID: ${org.id}`);
        console.log(`      Attiva: ${org.active ? '✅ Sì' : '❌ No'}`);
        console.log(`      Ruolo: ${membership.role}`);
        console.log('');
      });
      
      console.log('✅ L\'utente HA organizzazioni, quindi dovrebbe andare a / dopo il login.');
    }
    console.log('');

  } catch (error) {
    console.error('\n❌ Errore:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserOrganizations();
