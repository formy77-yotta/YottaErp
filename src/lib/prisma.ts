import { PrismaClient } from '@prisma/client';
import { driverAdapters } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Prisma Client Singleton (Prisma 7+)
 * 
 * LOGICA:
 * In sviluppo, Next.js hot-reload può creare multiple istanze di PrismaClient,
 * causando esaurimento del pool di connessioni al database.
 * 
 * Con Prisma 7, dobbiamo usare un adapter per la connessione PostgreSQL.
 * 
 * Questa implementazione garantisce una singola istanza globale.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Crea il connection pool PostgreSQL
const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.pool = pool;
}

// Crea l'adapter
const adapter = driverAdapters.createPgAdapter(pool);

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
