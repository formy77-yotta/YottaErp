/**
 * Script di Diagnostica - Accesso Super Admin
 * 
 * Verifica perché un Super Admin non può accedere all'area riservata
 * 
 * USO:
 * npx tsx scripts/diagnose-admin-access.ts [email]
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

async function diagnoseAdminAccess(email?: string) {
  try {
    console.log('='.repeat(70));
    console.log('🔍 DIAGNOSTICA ACCESSO SUPER ADMIN');
    console.log('='.repeat(70));
    console.log('');

    // ===== 1. VERIFICA CONFIGURAZIONE .ENV =====
    console.log('📋 1. VERIFICA CONFIGURAZIONE .ENV');
    console.log('-'.repeat(70));
    
    const superAdminIds = process.env.SUPER_ADMIN_IDS?.split(',').map(id => id.trim()).filter(Boolean) || [];
    const devBypass = process.env.DEV_BYPASS_AUTH === 'true';
    const nodeEnv = process.env.NODE_ENV || 'development';
    
    console.log(`   SUPER_ADMIN_IDS: ${superAdminIds.length > 0 ? superAdminIds.join(', ') : '❌ NON CONFIGURATO'}`);
    console.log(`   DEV_BYPASS_AUTH: ${devBypass ? '✅ true (bypass attivo)' : '❌ false o non configurato'}`);
    console.log(`   NODE_ENV: ${nodeEnv}`);
    console.log('');

    // ===== 2. VERIFICA UTENTE NEL DATABASE =====
    console.log('👤 2. VERIFICA UTENTE NEL DATABASE');
    console.log('-'.repeat(70));

    let user;
    
    if (email) {
      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          active: true,
          isSuperAdmin: true,
        },
      });

      if (!user) {
        console.log(`   ❌ Utente con email "${email}" non trovato nel database`);
        console.log('');
        console.log('💡 Verifica che l\'email sia corretta o esegui:');
        console.log('   npx tsx scripts/check-super-admin.ts');
        process.exit(1);
      }
    } else {
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
        console.log('   ❌ Nessun Super Admin trovato nel database!');
        console.log('');
        console.log('💡 Crea un Super Admin:');
        console.log('   npx tsx scripts/create-super-admin.ts');
        process.exit(1);
      }

      if (superAdmins.length === 1) {
        user = superAdmins[0];
        console.log(`   ✅ Trovato 1 Super Admin, usando: ${user.email}`);
      } else {
        console.log(`   ⚠️  Trovati ${superAdmins.length} Super Admin.`);
        console.log('   Specifica l\'email per diagnosticare un utente specifico:');
        console.log('   npx tsx scripts/diagnose-admin-access.ts email@example.com');
        console.log('');
        console.log('   Super Admin trovati:');
        superAdmins.forEach((admin, index) => {
          console.log(`   ${index + 1}. ${admin.email} (ID: ${admin.id})`);
        });
        process.exit(0);
      }
    }

    console.log('');
    console.log('   📊 Dettagli Utente:');
    console.log(`      ID: ${user.id}`);
    console.log(`      Email: ${user.email}`);
    console.log(`      Nome: ${user.firstName} ${user.lastName}`);
    console.log(`      Attivo: ${user.active ? '✅' : '❌'}`);
    console.log(`      Super Admin: ${user.isSuperAdmin ? '✅' : '❌'}`);
    console.log('');

    // ===== 3. ANALISI PROBLEMA =====
    console.log('🔎 3. ANALISI PROBLEMA');
    console.log('-'.repeat(70));

    const problems: string[] = [];
    const solutions: string[] = [];

    // Problema 1: Utente non attivo
    if (!user.active) {
      problems.push('❌ Utente NON è attivo (active: false)');
      solutions.push('   💡 Soluzione: Attiva l\'utente nel database');
      solutions.push('      UPDATE "User" SET active = true WHERE id = \'' + user.id + '\';');
    }

    // Problema 2: Utente non è Super Admin
    if (!user.isSuperAdmin) {
      problems.push('❌ Utente NON è Super Admin (isSuperAdmin: false)');
      solutions.push('   💡 Soluzione: Rendi l\'utente Super Admin');
      solutions.push('      UPDATE "User" SET "isSuperAdmin" = true WHERE id = \'' + user.id + '\';');
    }

    // Problema 3: SUPER_ADMIN_IDS configurato ma ID non presente
    if (superAdminIds.length > 0 && !superAdminIds.includes(user.id)) {
      problems.push(`❌ SUPER_ADMIN_IDS è configurato ma non contiene l'ID dell'utente`);
      problems.push(`   ID utente: ${user.id}`);
      problems.push(`   ID configurati: ${superAdminIds.join(', ')}`);
      solutions.push('   💡 Soluzione 1 (CONSIGLIATA): Rimuovi SUPER_ADMIN_IDS dal .env');
      solutions.push('      Il layout verificherà nel database (più sicuro)');
      solutions.push('');
      solutions.push('   💡 Soluzione 2: Aggiungi l\'ID al .env');
      solutions.push(`      SUPER_ADMIN_IDS="${superAdminIds.join(',')},${user.id}"`);
      solutions.push('      Poi RIAVVIA il server Next.js');
    }

    // Problema 4: Cookie userId non corrisponde
    if (superAdminIds.length > 0 && superAdminIds.includes(user.id)) {
      console.log('   ⚠️  SUPER_ADMIN_IDS contiene l\'ID, ma verifica il cookie:');
      console.log('      - Apri DevTools → Application → Cookies');
      console.log('      - Verifica che il cookie "userId" contenga: ' + user.id);
      console.log('      - Se non corrisponde, fai logout e login di nuovo');
      console.log('');
    }

    // ===== 4. RISULTATO =====
    if (problems.length === 0) {
      console.log('   ✅ Nessun problema rilevato!');
      console.log('');
      console.log('   🔍 Se continui ad avere problemi:');
      console.log('      1. Verifica che il cookie "userId" sia presente nel browser');
      console.log('      2. Fai logout e login di nuovo');
      console.log('      3. Verifica che il server Next.js sia riavviato dopo modifiche al .env');
      console.log('      4. Controlla la console del browser per errori');
    } else {
      console.log('   ❌ PROBLEMI RILEVATI:');
      problems.forEach(problem => console.log(`      ${problem}`));
      console.log('');
      console.log('   🔧 SOLUZIONI:');
      solutions.forEach(solution => console.log(solution));
    }

    console.log('');
    console.log('='.repeat(70));
    console.log('');

    // ===== 5. RACCOMANDAZIONE =====
    if (superAdminIds.length > 0) {
      console.log('💡 RACCOMANDAZIONE:');
      console.log('');
      console.log('   Il sistema usa due livelli di verifica:');
      console.log('   1. Proxy (src/proxy.ts) - verifica SUPER_ADMIN_IDS da .env');
      console.log('   2. Layout (src/app/(admin)/layout.tsx) - verifica nel database');
      console.log('');
      console.log('   ✅ CONSIGLIATO: Rimuovi SUPER_ADMIN_IDS dal .env');
      console.log('      Il layout verificherà nel database (più sicuro e flessibile)');
      console.log('      Il proxy passerà il controllo al layout se SUPER_ADMIN_IDS è vuoto');
      console.log('');
    }

  } catch (error) {
    console.error('❌ Errore durante la diagnostica:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui diagnostica
const email = process.argv[2];
diagnoseAdminAccess(email);
