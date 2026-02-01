import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Prisma Client Singleton (Prisma 7+)
 * 
 * LOGICA:
 * In sviluppo, Next.js hot-reload può creare multiple istanze di PrismaClient,
 * causando esaurimento del pool di connessioni al database.
 * 
 * Con Prisma 7 + Supabase:
 * - Usa l'adapter PG per connessione diretta (DIRECT_URL porta 5432)
 * - Evita PgBouncer (porta 6543) che causa problemi con prepared statements
 * 
 * Questa implementazione garantisce una singola istanza globale.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Usa DIRECT_URL per evitare PgBouncer
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

// Crea il connection pool PostgreSQL
const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.pool = pool;
}

// Crea l'adapter
const adapter = new PrismaPg(pool);

// Crea il Prisma Client con l'adapter
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
