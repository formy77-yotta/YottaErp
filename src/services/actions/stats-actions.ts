'use server';

import { revalidatePath } from 'next/cache';
import { Decimal } from 'decimal.js';
import { prisma } from '@/lib/prisma';
import { getAuthContext, verifyOrganizationAccess } from '@/lib/auth';
import { recalculateStatsForYear } from '@/services/business/stats-service';
import { getStock, getStocks } from '@/services/business/stock-service';
import {
  parseSearchParams,
  parseSortParam,
  type SearchParams,
} from '@/lib/validations/search-params';
import type { Prisma } from '@prisma/client';

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ProductStats = {
  productId: string;
  year: number;
  purchasedQuantity: string;
  purchasedTotalAmount: string;
  soldQuantity: string;
  soldTotalAmount: string;
  weightedAverageCost: string;
  lastCost: string;
  /** Giacenza attuale (somma movimenti di magazzino) */
  currentStock: string;
  /** Decimali per visualizzazione quantità (dal prodotto) */
  quantityDecimals: number;
};

export type ProductStatsRow = ProductStats & {
  id: string;
  productCode: string;
  productName: string;
};

const STATS_SORT_FIELDS = [
  'productCode',
  'productName',
  'purchasedQuantity',
  'purchasedTotalAmount',
  'soldQuantity',
  'soldTotalAmount',
  'weightedAverageCost',
  'lastCost',
] as const;

/**
 * Ritorna le statistiche annuali di un prodotto specifico.
 */
export async function getProductStats(
  productId: string,
  year: number
): Promise<ActionResult<ProductStats>> {
  try {
    const ctx = await getAuthContext();

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, organizationId: true, quantityDecimals: true },
    });

    if (!product) {
      return { success: false, error: 'Prodotto non trovato' };
    }

    verifyOrganizationAccess(ctx, product);

    const [stats, currentStock] = await Promise.all([
      prisma.productAnnualStat.findUnique({
        where: {
          organizationId_productId_year: {
            organizationId: ctx.organizationId,
            productId,
            year,
          },
        },
      }),
      getStock(productId, ctx.organizationId),
    ]);

    const qtyDecimals = product.quantityDecimals ?? 4;
    const currentStockStr = currentStock.toFixed(qtyDecimals);

    if (!stats) {
      return {
        success: true,
        data: {
          productId,
          year,
          purchasedQuantity: new Decimal(0).toFixed(qtyDecimals),
          purchasedTotalAmount: new Decimal(0).toFixed(2),
          soldQuantity: new Decimal(0).toFixed(qtyDecimals),
          soldTotalAmount: new Decimal(0).toFixed(2),
          weightedAverageCost: new Decimal(0).toFixed(2),
          lastCost: new Decimal(0).toFixed(2),
          currentStock: currentStock.toFixed(qtyDecimals),
          quantityDecimals: qtyDecimals,
        },
      };
    }

    return {
      success: true,
      data: {
        productId: stats.productId,
        year: stats.year,
        purchasedQuantity: stats.purchasedQuantity.toString(),
        purchasedTotalAmount: stats.purchasedTotalAmount.toString(),
        soldQuantity: stats.soldQuantity.toString(),
        soldTotalAmount: stats.soldTotalAmount.toString(),
        weightedAverageCost: stats.weightedAverageCost.toString(),
        lastCost: stats.lastCost.toString(),
        currentStock: currentStockStr,
        quantityDecimals: qtyDecimals,
      },
    };
  } catch (error) {
    console.error('Errore recupero statistiche prodotto:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}

/**
 * Ritorna una lista piatta per la tabella admin di valorizzazione.
 * Include i dati del prodotto (codice, nome) e le statistiche annuali.
 */
export async function getAllProductsStats(
  year: number,
  searchParamsRaw?: Record<string, string | string[] | undefined>
): Promise<ActionResult<{ data: ProductStatsRow[]; count: number }>> {
  try {
    const ctx = await getAuthContext();

    const searchParams: SearchParams = searchParamsRaw
      ? parseSearchParams(searchParamsRaw)
      : { page: 1, perPage: 10, sort: undefined, q: undefined };

    const { page, perPage, sort: sortParam, q } = searchParams;
    const skip = (page - 1) * perPage;

    const baseWhere: Prisma.ProductAnnualStatWhereInput = {
      organizationId: ctx.organizationId,
      year,
    };

    const where: Prisma.ProductAnnualStatWhereInput =
      q && q.length > 0
        ? {
            ...baseWhere,
            product: {
              OR: [
                { code: { contains: q, mode: 'insensitive' } },
                { name: { contains: q, mode: 'insensitive' } },
              ],
            },
          }
        : baseWhere;

    const parsedSort = parseSortParam(sortParam);
    let orderBy: Prisma.ProductAnnualStatOrderByWithRelationInput[] = [
      { product: { code: 'asc' } },
    ];

    if (
      parsedSort &&
      STATS_SORT_FIELDS.includes(
        parsedSort.field as (typeof STATS_SORT_FIELDS)[number]
      )
    ) {
      if (parsedSort.field === 'productCode') {
        orderBy = [{ product: { code: parsedSort.order } }];
      } else if (parsedSort.field === 'productName') {
        orderBy = [{ product: { name: parsedSort.order } }];
      } else {
        orderBy = [{ [parsedSort.field]: parsedSort.order }];
      }
    }

    const [stats, count] = await Promise.all([
      prisma.productAnnualStat.findMany({
        where,
        orderBy,
        skip,
        take: perPage,
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              quantityDecimals: true,
            },
          },
        },
      }),
      prisma.productAnnualStat.count({ where }),
    ]);

    const productIds = stats.map((s) => s.productId);
    const stocksMap = productIds.length > 0 ? await getStocks(productIds, ctx.organizationId) : {};

    const data: ProductStatsRow[] = stats.map((stat) => {
      const qtyDecimals = stat.product.quantityDecimals ?? 4;
      const currentStock = stocksMap[stat.productId] ?? new Decimal(0);
      return {
        id: stat.id,
        productId: stat.productId,
        productCode: stat.product.code,
        productName: stat.product.name,
        year: stat.year,
        purchasedQuantity: stat.purchasedQuantity.toString(),
        purchasedTotalAmount: stat.purchasedTotalAmount.toString(),
        soldQuantity: stat.soldQuantity.toString(),
        soldTotalAmount: stat.soldTotalAmount.toString(),
        weightedAverageCost: stat.weightedAverageCost.toString(),
        lastCost: stat.lastCost.toString(),
        currentStock: currentStock.toFixed(qtyDecimals),
        quantityDecimals: qtyDecimals,
      };
    });

    return {
      success: true,
      data: { data, count },
    };
  } catch (error) {
    console.error('Errore recupero valorizzazione magazzino:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}

/**
 * Ricalcola tutte le statistiche di valorizzazione per un anno.
 * Elimina i dati esistenti per l'anno e riapplica tutti i documenti con valorizzazione.
 * Utile per correggere disallineamenti.
 *
 * @param year - Anno da ricalcolare (default: anno corrente)
 * @returns Numero di documenti processati
 */
export async function recalculateStatsForYearAction(
  year?: number
): Promise<ActionResult<{ documentsProcessed: number }>> {
  try {
    const ctx = await getAuthContext();
    const targetYear = year ?? new Date().getFullYear();

    const documentsProcessed = await recalculateStatsForYear(
      ctx.organizationId,
      targetYear
    );

    revalidatePath('/products');
    revalidatePath('/admin/inventory-valuation');

    return {
      success: true,
      data: { documentsProcessed },
    };
  } catch (error) {
    console.error('Errore ricalcolo statistiche:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore durante il ricalcolo',
    };
  }
}
