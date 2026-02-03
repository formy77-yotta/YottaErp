/**
 * Script per verificare se i campi di un'organizzazione sono stati salvati correttamente
 * 
 * UTILIZZO:
 * npx tsx scripts/check-organization-fields.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as readline from 'readline';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Errore: DATABASE_URL o DIRECT_URL non configurato nel file .env');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ['error', 'warn'] });

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

async function checkOrganizationFields() {
  console.log('='.repeat(60));
  console.log('🔍 VERIFICA CAMPI ORGANIZZAZIONE - YottaErp');
  console.log('='.repeat(60));
  console.log('');

  try {
    const orgName = await prompt('Inserisci la ragione sociale dell\'organizzazione (o lascia vuoto per vedere tutte): ');

    let organizations;
    if (orgName.trim() === '') {
      organizations = await prisma.organization.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    } else {
      organizations = await prisma.organization.findMany({
        where: {
          businessName: {
            contains: orgName,
            mode: 'insensitive',
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    }

    if (organizations.length === 0) {
      console.error(`\n❌ Nessuna organizzazione trovata.`);
      process.exit(1);
    }

    console.log(`\n✅ Trovate ${organizations.length} organizzazione/i:\n`);

    for (const org of organizations) {
      console.log('📋 Organizzazione:', org.businessName);
      console.log(`   ID: ${org.id}`);
      console.log(`   P.IVA: ${org.vatNumber || 'NON IMPOSTATA'}`);
      console.log(`   Codice Fiscale: ${org.fiscalCode || 'NON IMPOSTATO'}`);
      console.log('');
      console.log('📍 Indirizzo:');
      console.log(`   Indirizzo: ${org.address || 'NON IMPOSTATO'}`);
      console.log(`   Città: ${org.city || 'NON IMPOSTATA'}`);
      console.log(`   Provincia: ${org.province || 'NON IMPOSTATA'}`);
      console.log(`   CAP: ${org.zipCode || 'NON IMPOSTATO'}`);
      console.log(`   Paese: ${org.country || 'NON IMPOSTATO'}`);
      console.log('');
      console.log('📧 Contatti:');
      console.log(`   Email: ${org.email || 'NON IMPOSTATA'}`);
      console.log(`   PEC: ${org.pec || 'NON IMPOSTATA'}`);
      console.log(`   Telefono: ${org.phone || 'NON IMPOSTATO'}`);
      console.log(`   Codice SDI: ${org.sdiCode || 'NON IMPOSTATO'}`);
      console.log('');
      console.log('─'.repeat(60));
      console.log('');
    }

  } catch (error) {
    console.error('\n❌ Errore:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrganizationFields();
