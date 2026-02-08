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
  /** Anno contabile usato per fatturato (da Organization.fiscalYear o anno corrente) */
  fiscalYear: number;
  /** Fatturato anno contabile: somma grossTotal documenti di vendita nell'anno */
  revenueFiscalYear: number;
  /** Crediti da documenti di vendita: residuo da incassare (scadenze non saldate) */
  creditsFromSales: number;
  /** Debiti da documenti di acquisto: residuo da pagare (scadenze non saldate) */
  debitsFromPurchases: number;
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

    // 2. Anno contabile (da organizzazione o anno corrente)
    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { fiscalYear: true },
    });
    const fiscalYear = org?.fiscalYear ?? new Date().getFullYear();
    const startFiscalYear = new Date(fiscalYear, 0, 1);
    const endFiscalYear = new Date(fiscalYear, 11, 31, 23, 59, 59, 999);

    // 3. Recupera statistiche in parallelo per performance
    const [
      revenueAggregate,
      salesDeadlines,
      purchaseDeadlines,
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
      // Fatturato anno contabile: somma grossTotal documenti di vendita nell'anno
      prisma.document.aggregate({
        where: {
          organizationId: ctx.organizationId,
          date: { gte: startFiscalYear, lte: endFiscalYear },
          documentType: { documentDirection: 'SALE' },
        },
        _sum: { grossTotal: true },
      }),
      // Scadenze non saldate da documenti di vendita (crediti) — paid = sum(PaymentMapping)
      prisma.installment.findMany({
        where: {
          organizationId: ctx.organizationId,
          document: { documentType: { documentDirection: 'SALE' } },
          status: { in: ['PENDING', 'PARTIAL'] },
        },
        select: { amount: true, payments: { select: { amount: true } } },
      }),
      // Scadenze non saldate da documenti di acquisto (debiti)
      prisma.installment.findMany({
        where: {
          organizationId: ctx.organizationId,
          document: { documentType: { documentDirection: 'PURCHASE' } },
          status: { in: ['PENDING', 'PARTIAL'] },
        },
        select: { amount: true, payments: { select: { amount: true } } },
      }),
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

    // 4. Calcola crediti e debiti (residuo = amount - sum(payments.amount))
    const toNum = (v: unknown) => (v != null ? Number(v) : 0);
    const paidOf = (d: { amount: unknown; payments: { amount: unknown }[] }) =>
      d.payments.reduce((s, p) => s + toNum(p.amount), 0);
    const creditsFromSales = salesDeadlines.reduce(
      (sum, d) => sum + toNum(d.amount) - paidOf(d),
      0
    );
    const debitsFromPurchases = purchaseDeadlines.reduce(
      (sum, d) => sum + toNum(d.amount) - paidOf(d),
      0
    );
    const revenueFiscalYear = toNum(revenueAggregate._sum.grossTotal);

    // 5. Lead (approssimazione: entità CLIENT che non sono ancora clienti completi)
    const leadsCount = 0; // TODO: Aggiungere campo isLead o tipo LEAD in Entity

    return {
      success: true,
      data: {
        fiscalYear,
        revenueFiscalYear,
        creditsFromSales,
        debitsFromPurchases,
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
