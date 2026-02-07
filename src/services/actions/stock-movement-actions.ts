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

/**
 * Ottiene tutti i movimenti magazzino dell'organizzazione corrente
 * 
 * MULTITENANT: Filtra automaticamente per organizationId
 * 
 * @param filters - Filtri opzionali (prodotto, magazzino, tipo, documento, date)
 * @returns Array di movimenti con relazioni complete
 */
export async function getStockMovementsAction(
  filters?: StockMovementFilters
): Promise<ActionResult<StockMovementWithRelations[]>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione (include organizationId)
    const ctx = await getAuthContext();

    // 2. Costruisci filtro where
    const where: {
      organizationId: string;
      productId?: string;
      warehouseId?: string;
      type?: MovementType;
      documentId?: string;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      organizationId: ctx.organizationId,
    };

    if (filters?.productId) {
      where.productId = filters.productId;
    }

    if (filters?.warehouseId) {
      where.warehouseId = filters.warehouseId;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.documentId) {
      where.documentId = filters.documentId;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    // 3. Recupera movimenti con relazioni
    const movements = await prisma.stockMovement.findMany({
      where,
      orderBy: [
        { createdAt: 'desc' }, // Più recenti prima
      ],
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
    });

    // 4. Recupera documenti collegati (se documentId presente)
    const documentIds = movements
      .map((m) => m.documentId)
      .filter((id): id is string => id !== null);
    
    const documents = documentIds.length > 0
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

    // 5. Crea mappa documentId -> document per lookup veloce
    const documentMap = new Map(documents.map((doc) => [doc.id, doc]));

    // 6. Converti Decimal a stringa e aggiungi documento (se presente)
    const movementsWithStringQuantity = movements.map((movement) => ({
      ...movement,
      quantity: movement.quantity.toString(),
      document: movement.documentId ? documentMap.get(movement.documentId) || null : null,
    }));

    return {
      success: true,
      data: movementsWithStringQuantity,
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
