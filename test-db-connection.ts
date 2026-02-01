/**
 * Script di test connessione Supabase
 * 
 * Esegui: node --loader ts-node/esm test-db-connection.ts
 * Oppure: npx tsx test-db-connection.ts
 */

import { prisma } from './src/lib/prisma';

async function testConnection() {
  try {
    console.log('🔍 Testando connessione a Supabase...\n');

    // Test connessione base
    await prisma.$connect();
    console.log('✅ Connessione a Supabase riuscita!\n');

    // Test query semplice
    const result = await prisma.$queryRaw`SELECT version(), current_database()`;
    console.log('📊 Informazioni database:');
    console.log(result);

    // Verifica tabelle esistenti
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    console.log('\n📋 Tabelle nel database:');
    console.log(tables);

  } catch (error) {
    console.error('❌ Errore connessione:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
