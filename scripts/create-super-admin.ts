/**
 * Script per creare il primo Super Admin
 * 
 * UTILIZZO:
 * npx tsx scripts/create-super-admin.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as readline from 'readline';

const prisma = new PrismaClient();

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

async function createSuperAdmin() {
  console.log('='.repeat(60));
  console.log('📛 CREAZIONE SUPER ADMIN - YottaErp');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Verifica se esiste già un Super Admin
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { isSuperAdmin: true },
    });

    if (existingSuperAdmin) {
      console.log('⚠️  Esiste già un Super Admin:');
      console.log(`   Email: ${existingSuperAdmin.email}`);
      console.log(`   Nome: ${existingSuperAdmin.firstName} ${existingSuperAdmin.lastName}`);
      console.log('');
      
      const confirm = await prompt('Vuoi crearne un altro? (yes/no): ');
      if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
        console.log('Operazione annullata.');
        process.exit(0);
      }
    }

    // Raccogli dati
    console.log('Inserisci i dati del Super Admin:\n');
    
    const firstName = await prompt('Nome: ');
    const lastName = await prompt('Cognome: ');
    const email = await prompt('Email: ');
    const password = await prompt('Password (min 8 caratteri): ');

    // Validazione
    if (!firstName || !lastName || !email || password.length < 8) {
      console.error('\n❌ Errore: Tutti i campi sono obbligatori e la password deve avere almeno 8 caratteri.');
      process.exit(1);
    }

    // Verifica email non già usata
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      console.error(`\n❌ Errore: Email ${email} già registrata.`);
      process.exit(1);
    }

    // Hash password
    console.log('\n⏳ Creazione Super Admin in corso...');
    const passwordHash = await bcrypt.hash(password, 10);

    // Crea Super Admin
    const superAdmin = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        isSuperAdmin: true,
        active: true,
        emailVerified: true,
      },
    });

    console.log('');
    console.log('✅ Super Admin creato con successo!');
    console.log('');
    console.log('📋 Dettagli:');
    console.log(`   ID: ${superAdmin.id}`);
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Nome: ${superAdmin.firstName} ${superAdmin.lastName}`);
    console.log('');
    console.log('🔐 Ora puoi accedere su:');
    console.log('   http://localhost:3000/login');
    console.log('');
    console.log('📍 Dopo il login avrai accesso a:');
    console.log('   http://localhost:3000/organizations (God Page)');
    console.log('');

  } catch (error) {
    console.error('\n❌ Errore durante la creazione:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();
