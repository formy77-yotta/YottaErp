/**
 * Server Actions per gestione Categorie Articoli
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
 */

'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAuthContext, canWrite, verifyOrganizationAccess, ForbiddenError } from '@/lib/auth';
import { 
  createProductCategorySchema, 
  updateProductCategorySchema,
  type CreateProductCategoryInput,
  type UpdateProductCategoryInput
} from '@/schemas/product-category-schema';

/**
 * Tipo di ritorno standard per Server Actions
 */
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Ottiene tutte le categorie articoli dell'organizzazione corrente
 * 
 * MULTITENANT: Filtra automaticamente per organizationId
 * 
 * @returns Array di categorie articoli
 */
export async function getProductCategoriesAction(): Promise<ActionResult<Array<{
  id: string;
  code: string;
  description: string;
  manageStock: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}>>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione (include organizationId)
    const ctx = await getAuthContext();

    // 2. Recupera categorie filtrate per organizzazione
    const categories = await prisma.productCategory.findMany({
      where: {
        organizationId: ctx.organizationId,
      },
      orderBy: [
        { code: 'asc' }, // Ordina per codice
      ],
      select: {
        id: true,
        code: true,
        description: true,
        manageStock: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      data: categories,
    };
  } catch (error) {
    console.error('Errore recupero categorie articoli:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante il recupero delle categorie articoli',
    };
  }
}

/**
 * Crea una nuova categoria articolo
 * 
 * MULTITENANT: La categoria viene automaticamente associata all'organizzazione corrente
 * 
 * @param input - Dati categoria da creare
 * @returns Result con categoria creata o errore
 */
export async function createProductCategoryAction(
  input: CreateProductCategoryInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione (include organizationId)
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per creare categorie articoli',
      };
    }

    // 3. Validazione con Zod
    const validatedData = createProductCategorySchema.parse(input);

    // 4. Normalizza codice (maiuscolo, trim)
    const normalizedCode = validatedData.code.trim().toUpperCase();

    // 5. Verifica unicità codice per organizzazione
    const existingCategory = await prisma.productCategory.findFirst({
      where: {
        organizationId: ctx.organizationId,
        code: normalizedCode,
      },
    });

    if (existingCategory) {
      return {
        success: false,
        error: 'Codice categoria già esistente per questa organizzazione',
      };
    }

    // 6. ✅ Creazione categoria con organizationId
    const category = await prisma.productCategory.create({
      data: {
        organizationId: ctx.organizationId, // ✅ Associa automaticamente all'organizzazione
        code: normalizedCode,
        description: validatedData.description.trim(),
        manageStock: validatedData.manageStock,
        active: validatedData.active,
      },
    });

    // 7. Revalidazione cache Next.js
    revalidatePath('/settings/product-categories');

    return {
      success: true,
      data: { id: category.id },
    };
  } catch (error) {
    console.error('Errore creazione categoria articolo:', error);

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
          error: 'Codice categoria già esistente per questa organizzazione',
        };
      }
      
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore sconosciuto durante la creazione della categoria articolo',
    };
  }
}

/**
 * Aggiorna una categoria articolo esistente
 * 
 * MULTITENANT: Verifica che la categoria appartenga all'organizzazione corrente
 * 
 * @param input - Dati categoria da aggiornare (include id)
 * @returns Result con successo o errore
 */
export async function updateProductCategoryAction(
  input: UpdateProductCategoryInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per modificare categorie articoli',
      };
    }

    // 3. Validazione con Zod
    const validatedData = updateProductCategorySchema.parse(input);

    // 4. ✅ Verifica esistenza E appartenenza all'organizzazione
    const existingCategory = await prisma.productCategory.findUnique({
      where: { id: validatedData.id },
      select: { id: true, organizationId: true, code: true },
    });

    if (!existingCategory) {
      return {
        success: false,
        error: 'Categoria articolo non trovata',
      };
    }
    
    // ✅ Verifica che appartenga all'organizzazione corrente
    verifyOrganizationAccess(ctx, existingCategory);

    // 5. Normalizza codice se presente
    const normalizedCode = validatedData.code 
      ? validatedData.code.trim().toUpperCase()
      : undefined;

    // 6. Verifica unicità codice se è stato modificato
    if (normalizedCode && normalizedCode !== existingCategory.code) {
      const duplicateCategory = await prisma.productCategory.findFirst({
        where: {
          organizationId: ctx.organizationId,
          code: normalizedCode,
        },
      });

      if (duplicateCategory && duplicateCategory.id !== validatedData.id) {
        return {
          success: false,
          error: 'Codice categoria già esistente per questa organizzazione',
        };
      }
    }

    // 7. Aggiornamento categoria
    const updatedCategory = await prisma.productCategory.update({
      where: { id: validatedData.id },
      data: {
        ...(normalizedCode && { code: normalizedCode }),
        ...(validatedData.description !== undefined && { 
          description: validatedData.description.trim() 
        }),
        ...(validatedData.manageStock !== undefined && { manageStock: validatedData.manageStock }),
        ...(validatedData.active !== undefined && { active: validatedData.active }),
      },
    });

    // 8. Revalidazione cache
    revalidatePath('/settings/product-categories');

    return {
      success: true,
      data: { id: updatedCategory.id },
    };
  } catch (error) {
    console.error('Errore aggiornamento categoria articolo:', error);

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
          error: 'Codice categoria già esistente per questa organizzazione',
        };
      }
      
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore sconosciuto durante l\'aggiornamento della categoria articolo',
    };
  }
}

/**
 * Elimina una categoria articolo
 * 
 * MULTITENANT: Verifica che la categoria appartenga all'organizzazione corrente
 * 
 * @param id - ID categoria da eliminare
 * @returns Result con successo o errore
 */
export async function deleteProductCategoryAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per eliminare categorie articoli',
      };
    }

    // 3. ✅ Verifica esistenza E appartenenza all'organizzazione
    const existingCategory = await prisma.productCategory.findUnique({
      where: { id },
      select: { id: true, organizationId: true },
    });

    if (!existingCategory) {
      return {
        success: false,
        error: 'Categoria articolo non trovata',
      };
    }
    
    // ✅ Verifica che appartenga all'organizzazione corrente
    verifyOrganizationAccess(ctx, existingCategory);

    // 4. Verifica che non ci siano prodotti associati
    const productsCount = await prisma.product.count({
      where: {
        categoryId: id,
      },
    });

    if (productsCount > 0) {
      return {
        success: false,
        error: `Impossibile eliminare: ci sono ${productsCount} prodotto/i associati a questa categoria`,
      };
    }

    // 5. Eliminazione categoria
    await prisma.productCategory.delete({
      where: { id },
    });

    // 6. Revalidazione cache
    revalidatePath('/settings/product-categories');

    return {
      success: true,
      data: { id },
    };
  } catch (error) {
    console.error('Errore eliminazione categoria articolo:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante l\'eliminazione della categoria articolo',
    };
  }
}
