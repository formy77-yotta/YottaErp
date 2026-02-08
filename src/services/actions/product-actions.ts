/**
 * Server Actions per gestione Anagrafica Prodotti
 * 
 * MULTITENANT: Ogni operazione è isolata per organizationId
 * 
 * RESPONSABILITÀ:
 * 1. Ottenere AuthContext (con organizationId)
 * 2. Validazione input con Zod
 * 3. Verificare permessi utente
 * 4. Chiamata a business logic con filtro organizationId
 * 5. Revalidazione cache Next.js
 * 6. Gestione errori e return type-safe
 * 
 * REGOLE ERP:
 * - Prezzo sempre come Decimal (MAI number)
 * - Giacenza calcolata da StockMovement (non campo statico)
 */

'use server';

import { revalidatePath } from 'next/cache';
import { Decimal } from 'decimal.js';
import { prisma } from '@/lib/prisma';
import { getAuthContext, canWrite, verifyOrganizationAccess, ForbiddenError, UnauthorizedError } from '@/lib/auth';
import {
  parseSearchParams,
  parseSortParam,
  type SearchParams,
} from '@/lib/validations/search-params';
import type { Prisma } from '@prisma/client';
import { getStocks } from '@/services/business/stock-service';
import { 
  createProductSchema, 
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput
} from '@/schemas/product-schema';

/**
 * Tipo di ritorno standard per Server Actions
 */
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Statistiche valorizzazione anno corrente (per elenco prodotti) */
export type ProductCurrentYearStat = {
  weightedAverageCost: string;
  lastCost: string;
} | null;

/** Tipo riga prodotto per DataTable / form */
export type ProductRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  category: { id: string; code: string; description: string } | null;
  typeId: string | null;
  type: { id: string; code: string; description: string; manageStock: boolean } | null;
  price: string;
  vatRateId: string | null;
  vatRate: { id: string; name: string; value: string } | null;
  defaultWarehouseId: string | null;
  defaultWarehouse: { id: string; code: string; name: string } | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** Valorizzazione: CMP e ultimo costo anno corrente (se presenti) */
  currentYearStat: ProductCurrentYearStat;
  /** Giacenza attuale (solo se tipo gestisce magazzino), altrimenti null */
  stock: string | null;
};

const PRODUCT_SORT_FIELDS = ['code', 'name', 'categoryId', 'typeId', 'price', 'vatRateId', 'active', 'createdAt'] as const;

/**
 * Ottiene i prodotti con ricerca, ordinamento e paginazione.
 * MULTITENANT: Filtra automaticamente per organizationId.
 *
 * @param filters - Filtri opzionali (categoria, tipologia, attivo)
 * @param searchParamsRaw - Parametri URL (page, perPage, sort, q) per DataTable
 * @returns { data: ProductRow[]; count: number }
 */
export async function getProductsAction(
  filters?: {
    categoryId?: string;
    typeId?: string;
    active?: boolean;
  },
  searchParamsRaw?: Record<string, string | string[] | undefined>
): Promise<ActionResult<{ data: ProductRow[]; count: number }>> {
  try {
    const ctx = await getAuthContext();

    const searchParams: SearchParams = searchParamsRaw
      ? parseSearchParams(searchParamsRaw)
      : { page: 1, perPage: 10, sort: undefined, q: undefined };

    const { page, perPage, sort: sortParam, q } = searchParams;
    const skip = (page - 1) * perPage;

    const baseWhere: Prisma.ProductWhereInput = {
      organizationId: ctx.organizationId,
      ...(filters?.categoryId && { categoryId: filters.categoryId }),
      ...(filters?.typeId && { typeId: filters.typeId }),
      ...(filters?.active !== undefined && { active: filters.active }),
    };

    const where: Prisma.ProductWhereInput =
      q && q.length > 0
        ? {
            ...baseWhere,
            OR: [
              { code: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          }
        : baseWhere;

    const parsedSort = parseSortParam(sortParam);
    let orderBy: Prisma.ProductOrderByWithRelationInput[] = [{ code: 'asc' }];
    if (parsedSort && PRODUCT_SORT_FIELDS.includes(parsedSort.field as (typeof PRODUCT_SORT_FIELDS)[number])) {
      orderBy = [{ [parsedSort.field]: parsedSort.order }];
    }

    const selectBase = {
      id: true,
      code: true,
      name: true,
      description: true,
      categoryId: true,
      typeId: true,
      price: true,
      vatRateId: true,
      defaultWarehouseId: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      category: {
        select: { id: true, code: true, description: true },
      },
      type: {
        select: { id: true, code: true, description: true, manageStock: true },
      },
      vatRate: {
        select: { id: true, name: true, value: true },
      },
      defaultWarehouse: {
        select: { id: true, code: true, name: true },
      },
    } as const;

    const [products, count] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: perPage,
        select: selectBase,
      }),
      prisma.product.count({ where }),
    ]);

    const productIdsWithStock = products
      .filter((p) => p.type?.manageStock)
      .map((p) => p.id);
    const stocksMap =
      productIdsWithStock.length > 0
        ? await getStocks(productIdsWithStock, ctx.organizationId)
        : {};

    const data: ProductRow[] = products.map((product) => ({
      ...product,
      price: product.price.toString(),
      category: product.category,
      type: product.type,
      vatRate: product.vatRate
        ? {
            id: product.vatRate.id,
            name: product.vatRate.name,
            value: product.vatRate.value.toString(),
          }
        : null,
      currentYearStat: null,
      stock: product.type?.manageStock
        ? (stocksMap[product.id]?.toFixed(2) ?? '0')
        : null,
    }));

    return {
      success: true,
      data: { data, count },
    };
  } catch (error) {
    console.error('Errore recupero prodotti:', error);

    // Gestione errori di autenticazione/autorizzazione
    if (error instanceof ForbiddenError || error instanceof UnauthorizedError) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Gestione errori generici con messaggio più dettagliato
    if (error instanceof Error) {
      console.error('Dettagli errore:', error.message, error.stack);
      return {
        success: false,
        error: `Errore durante il recupero dei prodotti: ${error.message}`,
      };
    }

    return {
      success: false,
      error: 'Errore sconosciuto durante il recupero dei prodotti',
    };
  }
}

/**
 * Ottiene un prodotto singolo per ID
 * 
 * MULTITENANT: Verifica che il prodotto appartenga all'organizzazione corrente
 * 
 * @param id - ID del prodotto
 * @returns Prodotto o errore
 */
export async function getProductAction(
  id: string
): Promise<ActionResult<{
  id: string;
  code: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  category: { id: string; code: string; description: string } | null;
  typeId: string | null;
  type: { id: string; code: string; description: string; manageStock: boolean } | null;
  price: string; // Decimal come stringa
  vatRateId: string | null;
  vatRate: { id: string; name: string; value: string } | null;
  defaultWarehouseId: string | null;
  defaultWarehouse: { id: string; code: string; name: string } | null;
  quantityDecimals: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();

    // 2. Recupera prodotto con classificazioni
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        categoryId: true,
        typeId: true,
        price: true,
        vatRateId: true,
        defaultWarehouseId: true,
        quantityDecimals: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        organizationId: true, // Per verifica multitenant
        category: {
          select: {
            id: true,
            code: true,
            description: true,
          },
        },
        type: {
          select: {
            id: true,
            code: true,
            description: true,
            manageStock: true,
          },
        },
        vatRate: {
          select: {
            id: true,
            name: true,
            value: true,
          },
        },
        defaultWarehouse: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!product) {
      return {
        success: false,
        error: 'Prodotto non trovato',
      };
    }

    // 3. ✅ Verifica che appartenga all'organizzazione corrente
    verifyOrganizationAccess(ctx, product);

    // 4. Rimuovi organizationId dalla risposta
    const { organizationId, ...productData } = product;

    return {
      success: true,
      data: {
        ...productData,
        price: productData.price.toString(), // Decimal -> string
        category: product.category,
        type: product.type,
        vatRate: product.vatRate ? {
          id: product.vatRate.id,
          name: product.vatRate.name,
          value: product.vatRate.value.toString(), // Decimal -> string
        } : null,
      },
    };
  } catch (error) {
    console.error('Errore recupero prodotto:', error);

    // Gestione errori di autenticazione/autorizzazione
    if (error instanceof ForbiddenError || error instanceof UnauthorizedError) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Gestione errori generici con messaggio più dettagliato
    if (error instanceof Error) {
      console.error('Dettagli errore:', error.message, error.stack);
      return {
        success: false,
        error: `Errore durante il recupero del prodotto: ${error.message}`,
      };
    }

    return {
      success: false,
      error: 'Errore sconosciuto durante il recupero del prodotto',
    };
  }
}

/**
 * Crea un nuovo prodotto
 * 
 * MULTITENANT: Il prodotto viene automaticamente associato all'organizzazione corrente
 * 
 * REGOLE ERP:
 * - Prezzo convertito a Decimal (MAI number)
 * - Verifica unicità codice per organizzazione
 * - Verifica che categoria/tipologia/vatRate appartengano all'organizzazione
 * 
 * @param input - Dati prodotto da creare
 * @returns Result con prodotto creato o errore
 */
export async function createProductAction(
  input: CreateProductInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione (include organizationId)
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per creare prodotti',
      };
    }

    // 3. Validazione con Zod
    const validatedData = createProductSchema.parse(input);

    // 4. Normalizza codice (già fatto da Zod transform)
    const normalizedCode = validatedData.code;

    // 5. Verifica unicità codice per organizzazione
    const existingProduct = await prisma.product.findFirst({
      where: {
        organizationId: ctx.organizationId,
        code: normalizedCode,
      },
    });

    if (existingProduct) {
      return {
        success: false,
        error: 'Codice prodotto già esistente per questa organizzazione',
      };
    }

    // 6. Verifica che categoria appartenga all'organizzazione (se presente)
    if (validatedData.categoryId) {
      const category = await prisma.productCategory.findUnique({
        where: { id: validatedData.categoryId },
        select: { organizationId: true },
      });

      if (!category) {
        return {
          success: false,
          error: 'Categoria prodotto non trovata',
        };
      }

      if (category.organizationId !== ctx.organizationId) {
        return {
          success: false,
          error: 'Categoria prodotto non appartiene alla tua organizzazione',
        };
      }
    }

    // 7. Verifica che tipologia appartenga all'organizzazione (se presente)
    if (validatedData.typeId) {
      const type = await prisma.productType.findUnique({
        where: { id: validatedData.typeId },
        select: { organizationId: true },
      });

      if (!type) {
        return {
          success: false,
          error: 'Tipologia prodotto non trovata',
        };
      }

      if (type.organizationId !== ctx.organizationId) {
        return {
          success: false,
          error: 'Tipologia prodotto non appartiene alla tua organizzazione',
        };
      }
    }

    // 8. Verifica che aliquota IVA appartenga all'organizzazione (se presente)
    if (validatedData.vatRateId) {
      const vatRate = await prisma.vatRate.findUnique({
        where: { id: validatedData.vatRateId },
        select: { organizationId: true },
      });

      if (!vatRate) {
        return {
          success: false,
          error: 'Aliquota IVA non trovata',
        };
      }

      if (vatRate.organizationId !== ctx.organizationId) {
        return {
          success: false,
          error: 'Aliquota IVA non appartiene alla tua organizzazione',
        };
      }
    }

    // 10. Verifica che magazzino predefinito appartenga all'organizzazione (se presente)
    if (validatedData.defaultWarehouseId) {
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: validatedData.defaultWarehouseId },
        select: { organizationId: true },
      });

      if (!warehouse) {
        return {
          success: false,
          error: 'Magazzino non trovato',
        };
      }

      if (warehouse.organizationId !== ctx.organizationId) {
        return {
          success: false,
          error: 'Magazzino non appartiene alla tua organizzazione',
        };
      }
    }

    // 11. ✅ Converti prezzo a Decimal (MAI number!)
    const priceDecimal = new Decimal(validatedData.price);

    // 12. ✅ Creazione prodotto con organizationId
    const product = await prisma.product.create({
      data: {
        organizationId: ctx.organizationId, // ✅ Associa automaticamente all'organizzazione
        code: normalizedCode,
        name: validatedData.name,
        description: validatedData.description || null,
        categoryId: validatedData.categoryId || null,
        typeId: validatedData.typeId || null,
        price: priceDecimal, // ✅ Decimal, non number!
        vatRateId: validatedData.vatRateId || null,
        defaultWarehouseId: validatedData.defaultWarehouseId || null,
        quantityDecimals: validatedData.quantityDecimals ?? 4,
        active: validatedData.active,
      },
    });

    // 12. Revalidazione cache Next.js
    revalidatePath('/products');

    return {
      success: true,
      data: { id: product.id },
    };
  } catch (error) {
    console.error('Errore creazione prodotto:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Gestione errori Prisma (es. unique constraint violation)
    if (error instanceof Error) {
      // Se è un errore di unique constraint per codice
      if (error.message.includes('organizationId_code') || error.message.includes('Unique constraint')) {
        return {
          success: false,
          error: 'Codice prodotto già esistente per questa organizzazione',
        };
      }
      
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore sconosciuto durante la creazione del prodotto',
    };
  }
}

/**
 * Aggiorna un prodotto esistente
 * 
 * MULTITENANT: Verifica che il prodotto appartenga all'organizzazione corrente
 * 
 * @param input - Dati prodotto da aggiornare (include id)
 * @returns Result con successo o errore
 */
export async function updateProductAction(
  input: UpdateProductInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per modificare prodotti',
      };
    }

    // 3. Validazione con Zod
    const validatedData = updateProductSchema.parse(input);

    // 4. ✅ Verifica esistenza E appartenenza all'organizzazione
    const existingProduct = await prisma.product.findUnique({
      where: { id: validatedData.id },
      select: { id: true, organizationId: true, code: true },
    });

    if (!existingProduct) {
      return {
        success: false,
        error: 'Prodotto non trovato',
      };
    }
    
    // ✅ Verifica che appartenga all'organizzazione corrente
    verifyOrganizationAccess(ctx, existingProduct);

    // 5. Normalizza codice se presente
    const normalizedCode = validatedData.code 
      ? validatedData.code.trim().toUpperCase()
      : undefined;

    // 6. Verifica unicità codice se è stato modificato
    if (normalizedCode && normalizedCode !== existingProduct.code) {
      const duplicateProduct = await prisma.product.findFirst({
        where: {
          organizationId: ctx.organizationId,
          code: normalizedCode,
        },
      });

      if (duplicateProduct && duplicateProduct.id !== validatedData.id) {
        return {
          success: false,
          error: 'Codice prodotto già esistente per questa organizzazione',
        };
      }
    }

    // 7. Verifica classificazioni se modificate
    if (validatedData.categoryId !== undefined && validatedData.categoryId !== '') {
      const category = await prisma.productCategory.findUnique({
        where: { id: validatedData.categoryId },
        select: { organizationId: true },
      });

      if (!category) {
        return {
          success: false,
          error: 'Categoria prodotto non trovata',
        };
      }

      if (category.organizationId !== ctx.organizationId) {
        return {
          success: false,
          error: 'Categoria prodotto non appartiene alla tua organizzazione',
        };
      }
    }

    if (validatedData.typeId !== undefined && validatedData.typeId !== '') {
      const type = await prisma.productType.findUnique({
        where: { id: validatedData.typeId },
        select: { organizationId: true },
      });

      if (!type) {
        return {
          success: false,
          error: 'Tipologia prodotto non trovata',
        };
      }

      if (type.organizationId !== ctx.organizationId) {
        return {
          success: false,
          error: 'Tipologia prodotto non appartiene alla tua organizzazione',
        };
      }
    }

    if (validatedData.vatRateId !== undefined && validatedData.vatRateId !== '') {
      const vatRate = await prisma.vatRate.findUnique({
        where: { id: validatedData.vatRateId },
        select: { organizationId: true },
      });

      if (!vatRate) {
        return {
          success: false,
          error: 'Aliquota IVA non trovata',
        };
      }

      if (vatRate.organizationId !== ctx.organizationId) {
        return {
          success: false,
          error: 'Aliquota IVA non appartiene alla tua organizzazione',
        };
      }
    }

    // 8. Prepara dati aggiornamento
    const updateData: {
      code?: string;
      name?: string;
      description?: string | null;
      categoryId?: string | null;
      typeId?: string | null;
      price?: Decimal;
      vatRateId?: string | null;
      defaultWarehouseId?: string | null;
      quantityDecimals?: number;
      active?: boolean;
    } = {};

    if (normalizedCode) {
      updateData.code = normalizedCode;
    }

    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name.trim();
    }

    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description || null;
    }

    if (validatedData.categoryId !== undefined) {
      updateData.categoryId = validatedData.categoryId || null;
    }

    if (validatedData.typeId !== undefined) {
      updateData.typeId = validatedData.typeId || null;
    }

    if (validatedData.price !== undefined) {
      // ✅ Converti prezzo a Decimal (MAI number!)
      updateData.price = new Decimal(validatedData.price);
    }

    if (validatedData.vatRateId !== undefined) {
      updateData.vatRateId = validatedData.vatRateId || null;
    }

    if (validatedData.defaultWarehouseId !== undefined) {
      updateData.defaultWarehouseId = validatedData.defaultWarehouseId || null;
    }

    if (validatedData.quantityDecimals !== undefined) {
      updateData.quantityDecimals = validatedData.quantityDecimals;
    }

    if (validatedData.active !== undefined) {
      updateData.active = validatedData.active;
    }

    // 9. Aggiornamento prodotto
    const updatedProduct = await prisma.product.update({
      where: { id: validatedData.id },
      data: updateData,
    });

    // 10. Revalidazione cache
    revalidatePath('/products');

    return {
      success: true,
      data: { id: updatedProduct.id },
    };
  } catch (error) {
    console.error('Errore aggiornamento prodotto:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (error instanceof Error) {
      // Se è un errore di unique constraint per codice
      if (error.message.includes('organizationId_code') || error.message.includes('Unique constraint')) {
        return {
          success: false,
          error: 'Codice prodotto già esistente per questa organizzazione',
        };
      }
      
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore sconosciuto durante l\'aggiornamento del prodotto',
    };
  }
}

/**
 * Elimina un prodotto
 * 
 * MULTITENANT: Verifica che il prodotto appartenga all'organizzazione corrente
 * 
 * NOTA: Verifica che non ci siano documenti o movimenti di magazzino associati
 * 
 * @param id - ID prodotto da eliminare
 * @returns Result con successo o errore
 */
export async function deleteProductAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per eliminare prodotti',
      };
    }

    // 3. ✅ Verifica esistenza E appartenenza all'organizzazione
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: { id: true, organizationId: true },
    });

    if (!existingProduct) {
      return {
        success: false,
        error: 'Prodotto non trovato',
      };
    }
    
    // ✅ Verifica che appartenga all'organizzazione corrente
    verifyOrganizationAccess(ctx, existingProduct);

    // 4. Verifica che non ci siano documenti associati
    const documentsCount = await prisma.documentLine.count({
      where: {
        productId: id,
      },
    });

    if (documentsCount > 0) {
      return {
        success: false,
        error: `Impossibile eliminare: il prodotto è presente in ${documentsCount} documento/i`,
      };
    }

    // 5. Verifica che non ci siano movimenti di magazzino associati
    const stockMovementsCount = await prisma.stockMovement.count({
      where: {
        productId: id,
      },
    });

    if (stockMovementsCount > 0) {
      return {
        success: false,
        error: `Impossibile eliminare: ci sono ${stockMovementsCount} movimento/i di magazzino associati`,
      };
    }

    // 6. Eliminazione prodotto
    await prisma.product.delete({
      where: { id },
    });

    // 7. Revalidazione cache
    revalidatePath('/products');

    return {
      success: true,
      data: { id },
    };
  } catch (error) {
    console.error('Errore eliminazione prodotto:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante l\'eliminazione del prodotto',
    };
  }
}
