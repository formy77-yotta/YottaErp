/**
 * Server Actions per statistiche Dashboard
 * 
 * Fornisce KPI e statistiche aggregate per l'organizzazione corrente.
 * MULTITENANT: Tutte le statistiche sono filtrate per organizationId
 */

'use server';

import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth';

/**
 * Tipo di ritorno per statistiche dashboard
 */
export interface DashboardStats {
  entities: {
    total: number;
    customers: number;
    suppliers: number;
    leads: number;
  };
  documents: {
    total: number;
    quotes: number;
    orders: number;
    invoices: number;
  };
  products: {
    total: number;
    active: number;
  };
  warehouses: {
    total: number;
  };
}

/**
 * Ottiene le statistiche della dashboard per l'organizzazione corrente
 * 
 * MULTITENANT: Filtra automaticamente per organizationId
 * 
 * @returns Statistiche aggregate
 */
export async function getDashboardStats(): Promise<{
  success: true;
  data: DashboardStats;
} | {
  success: false;
  error: string;
}> {
  try {
    // 1. ✅ Ottieni contesto autenticazione (include organizationId)
    const ctx = await getAuthContext();

    // 2. Recupera statistiche in parallelo per performance
    const [
      entitiesCount,
      customersCount,
      suppliersCount,
      documentsCount,
      quotesCount,
      ordersCount,
      invoicesCount,
      productsCount,
      activeProductsCount,
      warehousesCount,
    ] = await Promise.all([
      // Totale entità
      prisma.entity.count({
        where: { organizationId: ctx.organizationId },
      }),
      // Clienti (CLIENT o BOTH)
      prisma.entity.count({
        where: {
          organizationId: ctx.organizationId,
          type: { in: ['CLIENT', 'BOTH'] },
        },
      }),
      // Fornitori (PROVIDER o BOTH)
      prisma.entity.count({
        where: {
          organizationId: ctx.organizationId,
          type: { in: ['PROVIDER', 'BOTH'] },
        },
      }),
      // Totale documenti
      prisma.document.count({
        where: { organizationId: ctx.organizationId },
      }),
      // Preventivi
      prisma.document.count({
        where: {
          organizationId: ctx.organizationId,
          documentType: {
            code: 'QUOTE',
          },
        },
      }),
      // Ordini
      prisma.document.count({
        where: {
          organizationId: ctx.organizationId,
          documentType: {
            code: 'ORDER',
          },
        },
      }),
      // Fatture
      prisma.document.count({
        where: {
          organizationId: ctx.organizationId,
          documentType: {
            code: 'INVOICE',
          },
        },
      }),
      // Totale prodotti
      prisma.product.count({
        where: { organizationId: ctx.organizationId },
      }),
      // Prodotti attivi
      prisma.product.count({
        where: {
          organizationId: ctx.organizationId,
          active: true,
        },
      }),
      // Totale magazzini
      prisma.warehouse.count({
        where: { organizationId: ctx.organizationId },
      }),
    ]);

    // 3. Calcola lead (approssimazione: entità CLIENT che non sono ancora clienti completi)
    // Per ora, consideriamo i lead come clienti (potrebbe essere migliorato in futuro)
    const leadsCount = 0; // TODO: Aggiungere campo isLead o tipo LEAD in Entity

    return {
      success: true,
      data: {
        entities: {
          total: entitiesCount,
          customers: customersCount,
          suppliers: suppliersCount,
          leads: leadsCount,
        },
        documents: {
          total: documentsCount,
          quotes: quotesCount,
          orders: ordersCount,
          invoices: invoicesCount,
        },
        products: {
          total: productsCount,
          active: activeProductsCount,
        },
        warehouses: {
          total: warehousesCount,
        },
      },
    };
  } catch (error) {
    console.error('Errore recupero statistiche dashboard:', error);
    return {
      success: false,
      error: 'Errore durante il recupero delle statistiche',
    };
  }
}
