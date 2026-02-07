/**
 * Server Actions per gestione Movimenti Magazzino
 * 
 * MULTITENANT: Ogni operazione è isolata per organizationId
 * 
 * RESPONSABILITÀ:
 * 1. Ottenere AuthContext (con organizationId)
 * 2. Verificare permessi utente
 * 3. Query movimenti con filtri opzionali
 * 4. Include relazioni (prodotto, magazzino, documento)
 * 5. Gestione errori e return type-safe
 * 
 * REGOLE ERP:
 * - Giacenza calcolata da StockMovement (Calculated Stock Rule)
 * - Movimenti immutabili (non si modificano, solo si creano)
 */

'use server';

import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth';
import {
  parseSearchParams,
  parseSortParam,
  type SearchParams,
} from '@/lib/validations/search-params';
import type { Prisma } from '@prisma/client';
import { MovementType } from '@prisma/client';

/**
 * Tipo di ritorno standard per Server Actions
 */
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Tipo movimento magazzino con relazioni
 */
export type StockMovementWithRelations = {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: string; // Decimal come stringa
  type: MovementType;
  documentTypeId: string | null;
  documentId: string | null;
  documentNumber: string | null;
  notes: string | null;
  userId: string | null;
  createdAt: Date;
  // Relazioni
  product: {
    id: string;
    code: string;
    name: string;
  };
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
  documentType: {
    id: string;
    code: string;
    description: string;
  } | null;
  document: {
    id: string;
    number: string;
    date: Date;
    category: string;
  } | null;
};

/**
 * Filtri opzionali per query movimenti
 */
export interface StockMovementFilters {
  productId?: string;
  warehouseId?: string;
  type?: MovementType;
  documentId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

const MOVEMENT_SORT_FIELDS = ['createdAt', 'quantity', 'type', 'productCode', 'warehouseCode', 'documentNumber', 'notes'] as const;

/**
 * Ottiene i movimenti magazzino con ricerca, ordinamento e paginazione.
 * MULTITENANT: Filtra automaticamente per organizationId.
 *
 * @param filters - Filtri opzionali (prodotto, magazzino, tipo, documento, date)
 * @param searchParamsRaw - Parametri URL (page, perPage, sort, q) per DataTable
 * @returns { data: StockMovementWithRelations[]; count: number }
 */
export async function getStockMovementsAction(
  filters?: StockMovementFilters,
  searchParamsRaw?: Record<string, string | string[] | undefined>
): Promise<ActionResult<{ data: StockMovementWithRelations[]; count: number }>> {
  try {
    const ctx = await getAuthContext();

    const searchParams: SearchParams = searchParamsRaw
      ? parseSearchParams(searchParamsRaw)
      : { page: 1, perPage: 10, sort: undefined, q: undefined };

    const { page, perPage, sort: sortParam, q } = searchParams;
    const skip = (page - 1) * perPage;

    const baseWhere: Prisma.StockMovementWhereInput = {
      organizationId: ctx.organizationId,
      ...(filters?.productId && { productId: filters.productId }),
      ...(filters?.warehouseId && { warehouseId: filters.warehouseId }),
      ...(filters?.type && { type: filters.type }),
      ...(filters?.documentId && { documentId: filters.documentId }),
      ...((filters?.dateFrom || filters?.dateTo) && {
        createdAt: {
          ...(filters.dateFrom && { gte: filters.dateFrom }),
          ...(filters.dateTo && { lte: filters.dateTo }),
        },
      }),
    };

    const where: Prisma.StockMovementWhereInput =
      q && q.length > 0
        ? {
            ...baseWhere,
            OR: [
              { product: { code: { contains: q, mode: 'insensitive' } } },
              { product: { name: { contains: q, mode: 'insensitive' } } },
              { document: { number: { contains: q, mode: 'insensitive' } } },
              { notes: { contains: q, mode: 'insensitive' } },
            ],
          }
        : baseWhere;

    const parsedSort = parseSortParam(sortParam);
    let orderBy: Prisma.StockMovementOrderByWithRelationInput[] = [{ createdAt: 'desc' }];
    if (parsedSort && MOVEMENT_SORT_FIELDS.includes(parsedSort.field as (typeof MOVEMENT_SORT_FIELDS)[number])) {
      if (parsedSort.field === 'productCode') {
        orderBy = [{ product: { code: parsedSort.order } }];
      } else if (parsedSort.field === 'warehouseCode') {
        orderBy = [{ warehouse: { code: parsedSort.order } }];
      } else if (parsedSort.field === 'documentNumber') {
        orderBy = [{ document: { number: parsedSort.order } }];
      } else {
        orderBy = [{ [parsedSort.field]: parsedSort.order }];
      }
    }

    const [movements, count] = await Promise.all([
      prisma.stockMovement.findMany({
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
            },
          },
          warehouse: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          documentType: {
            select: {
              id: true,
              code: true,
              description: true,
            },
          },
        },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    const documentIds = movements
      .map((m) => m.documentId)
      .filter((id): id is string => id !== null);

    const documents =
      documentIds.length > 0
        ? await prisma.document.findMany({
            where: {
              id: { in: documentIds },
              organizationId: ctx.organizationId,
            },
            select: {
              id: true,
              number: true,
              date: true,
              category: true,
            },
          })
        : [];

    const documentMap = new Map(documents.map((doc) => [doc.id, doc]));

    const data: StockMovementWithRelations[] = movements.map((movement) => ({
      ...movement,
      quantity: movement.quantity.toString(),
      document: movement.documentId ? documentMap.get(movement.documentId) || null : null,
    }));

    return {
      success: true,
      data: { data, count },
    };
  } catch (error) {
    console.error('Errore recupero movimenti magazzino:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}

/**
 * Ottiene statistiche movimenti magazzino
 * 
 * @returns Statistiche aggregate (totale movimenti, per tipo, ecc.)
 */
export async function getStockMovementStatsAction(): Promise<
  ActionResult<{
    total: number;
    byType: Record<MovementType, number>;
    lastMovementDate: Date | null;
  }>
> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();

    // 2. Query aggregate
    const [total, byType, lastMovement] = await Promise.all([
      // Totale movimenti
      prisma.stockMovement.count({
        where: { organizationId: ctx.organizationId },
      }),
      // Movimenti per tipo
      prisma.stockMovement.groupBy({
        by: ['type'],
        where: { organizationId: ctx.organizationId },
        _count: { type: true },
      }),
      // Ultimo movimento
      prisma.stockMovement.findFirst({
        where: { organizationId: ctx.organizationId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    // 3. Converti array in record
    const byTypeRecord: Record<MovementType, number> = {} as Record<
      MovementType,
      number
    >;
    for (const group of byType) {
      byTypeRecord[group.type] = group._count.type;
    }

    return {
      success: true,
      data: {
        total,
        byType: byTypeRecord,
        lastMovementDate: lastMovement?.createdAt || null,
      },
    };
  } catch (error) {
    console.error('Errore recupero statistiche movimenti:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}
