/**
 * Server Actions per gestione Tipologie Articoli
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
  createProductTypeSchema, 
  updateProductTypeSchema,
  type CreateProductTypeInput,
  type UpdateProductTypeInput
} from '@/schemas/product-type-schema';

/**
 * Tipo di ritorno standard per Server Actions
 */
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Ottiene tutte le tipologie articoli dell'organizzazione corrente
 * 
 * MULTITENANT: Filtra automaticamente per organizationId
 * 
 * @returns Array di tipologie articoli
 */
export async function getProductTypesAction(): Promise<ActionResult<Array<{
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

    // 2. Recupera tipologie filtrate per organizzazione
    const types = await prisma.productType.findMany({
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
      data: types,
    };
  } catch (error) {
    console.error('Errore recupero tipologie articoli:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante il recupero delle tipologie articoli',
    };
  }
}

/**
 * Crea una nuova tipologia articolo
 * 
 * MULTITENANT: La tipologia viene automaticamente associata all'organizzazione corrente
 * 
 * @param input - Dati tipologia da creare
 * @returns Result con tipologia creata o errore
 */
export async function createProductTypeAction(
  input: CreateProductTypeInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione (include organizationId)
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per creare tipologie articoli',
      };
    }

    // 3. Validazione con Zod
    const validatedData = createProductTypeSchema.parse(input);

    // 4. Normalizza codice (maiuscolo, trim)
    const normalizedCode = validatedData.code.trim().toUpperCase();

    // 5. Verifica unicità codice per organizzazione
    const existingType = await prisma.productType.findFirst({
      where: {
        organizationId: ctx.organizationId,
        code: normalizedCode,
      },
    });

    if (existingType) {
      return {
        success: false,
        error: 'Codice tipologia già esistente per questa organizzazione',
      };
    }

    // 6. ✅ Creazione tipologia con organizationId
    const type = await prisma.productType.create({
      data: {
        organizationId: ctx.organizationId, // ✅ Associa automaticamente all'organizzazione
        code: normalizedCode,
        description: validatedData.description.trim(),
        manageStock: validatedData.manageStock,
        active: validatedData.active,
      },
    });

    // 7. Revalidazione cache Next.js
    revalidatePath('/settings/product-types');

    return {
      success: true,
      data: { id: type.id },
    };
  } catch (error) {
    console.error('Errore creazione tipologia articolo:', error);

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
          error: 'Codice tipologia già esistente per questa organizzazione',
        };
      }
      
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore sconosciuto durante la creazione della tipologia articolo',
    };
  }
}

/**
 * Aggiorna una tipologia articolo esistente
 * 
 * MULTITENANT: Verifica che la tipologia appartenga all'organizzazione corrente
 * 
 * @param input - Dati tipologia da aggiornare (include id)
 * @returns Result con successo o errore
 */
export async function updateProductTypeAction(
  input: UpdateProductTypeInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per modificare tipologie articoli',
      };
    }

    // 3. Validazione con Zod
    const validatedData = updateProductTypeSchema.parse(input);

    // 4. ✅ Verifica esistenza E appartenenza all'organizzazione
    const existingType = await prisma.productType.findUnique({
      where: { id: validatedData.id },
      select: { id: true, organizationId: true, code: true },
    });

    if (!existingType) {
      return {
        success: false,
        error: 'Tipologia articolo non trovata',
      };
    }
    
    // ✅ Verifica che appartenga all'organizzazione corrente
    verifyOrganizationAccess(ctx, existingType);

    // 5. Normalizza codice se presente
    const normalizedCode = validatedData.code 
      ? validatedData.code.trim().toUpperCase()
      : undefined;

    // 6. Verifica unicità codice se è stato modificato
    if (normalizedCode && normalizedCode !== existingType.code) {
      const duplicateType = await prisma.productType.findFirst({
        where: {
          organizationId: ctx.organizationId,
          code: normalizedCode,
        },
      });

      if (duplicateType && duplicateType.id !== validatedData.id) {
        return {
          success: false,
          error: 'Codice tipologia già esistente per questa organizzazione',
        };
      }
    }

    // 7. Aggiornamento tipologia
    const updatedType = await prisma.productType.update({
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
    revalidatePath('/settings/product-types');

    return {
      success: true,
      data: { id: updatedType.id },
    };
  } catch (error) {
    console.error('Errore aggiornamento tipologia articolo:', error);

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
          error: 'Codice tipologia già esistente per questa organizzazione',
        };
      }
      
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore sconosciuto durante l\'aggiornamento della tipologia articolo',
    };
  }
}

/**
 * Elimina una tipologia articolo
 * 
 * MULTITENANT: Verifica che la tipologia appartenga all'organizzazione corrente
 * 
 * @param id - ID tipologia da eliminare
 * @returns Result con successo o errore
 */
export async function deleteProductTypeAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per eliminare tipologie articoli',
      };
    }

    // 3. ✅ Verifica esistenza E appartenenza all'organizzazione
    const existingType = await prisma.productType.findUnique({
      where: { id },
      select: { id: true, organizationId: true },
    });

    if (!existingType) {
      return {
        success: false,
        error: 'Tipologia articolo non trovata',
      };
    }
    
    // ✅ Verifica che appartenga all'organizzazione corrente
    verifyOrganizationAccess(ctx, existingType);

    // 4. Verifica che non ci siano prodotti associati
    const productsCount = await prisma.product.count({
      where: {
        typeId: id,
      },
    });

    if (productsCount > 0) {
      return {
        success: false,
        error: `Impossibile eliminare: ci sono ${productsCount} prodotto/i associati a questa tipologia`,
      };
    }

    // 5. Eliminazione tipologia
    await prisma.productType.delete({
      where: { id },
    });

    // 6. Revalidazione cache
    revalidatePath('/settings/product-types');

    return {
      success: true,
      data: { id },
    };
  } catch (error) {
    console.error('Errore eliminazione tipologia articolo:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante l\'eliminazione della tipologia articolo',
    };
  }
}
