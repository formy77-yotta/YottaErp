/**
 * Server Actions per gestione Anagrafica Magazzini
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
  createWarehouseSchema,
  updateWarehouseSchema,
  type CreateWarehouseInput,
  type UpdateWarehouseInput,
} from '@/schemas/warehouse-schema';

/**
 * Tipo di ritorno standard per Server Actions
 */
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Ottiene tutti i magazzini dell'organizzazione corrente
 * 
 * MULTITENANT: Filtra automaticamente per organizationId
 * 
 * @returns Array di magazzini
 */
export async function getWarehousesAction(): Promise<
  ActionResult<
    Array<{
      id: string;
      code: string;
      name: string;
      address: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>
  >
> {
  try {
    // 1. ✅ Ottieni contesto autenticazione (include organizationId)
    const ctx = await getAuthContext();

    // 2. Recupera magazzini
    const warehouses = await prisma.warehouse.findMany({
      where: {
        organizationId: ctx.organizationId,
      },
      orderBy: [
        { code: 'asc' }, // Ordina per codice
      ],
    });

    return {
      success: true,
      data: warehouses,
    };
  } catch (error) {
    console.error('Errore recupero magazzini:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}

/**
 * Ottiene un singolo magazzino
 * 
 * MULTITENANT: Verifica che il magazzino appartenga all'organizzazione corrente
 * 
 * @param id - ID magazzino
 * @returns Magazzino o errore
 */
export async function getWarehouseAction(
  id: string
): Promise<
  ActionResult<{
    id: string;
    code: string;
    name: string;
    address: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>
> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();

    // 2. Recupera magazzino
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
    });

    if (!warehouse) {
      return {
        success: false,
        error: 'Magazzino non trovato',
      };
    }

    // 3. ✅ Verifica che appartenga all'organizzazione corrente
    await verifyOrganizationAccess(warehouse.organizationId, ctx);

    return {
      success: true,
      data: warehouse,
    };
  } catch (error) {
    console.error('Errore recupero magazzino:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}

/**
 * Crea un nuovo magazzino
 * 
 * MULTITENANT: Il magazzino viene automaticamente associato all'organizzazione corrente
 * 
 * @param input - Dati magazzino da creare
 * @returns Result con magazzino creato o errore
 */
export async function createWarehouseAction(
  input: CreateWarehouseInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione (include organizationId)
    const ctx = await getAuthContext();

    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per creare magazzini',
      };
    }

    // 3. Validazione con Zod
    const validatedData = createWarehouseSchema.parse(input);

    // 4. Verifica unicità codice per organizzazione
    const existingWarehouse = await prisma.warehouse.findFirst({
      where: {
        organizationId: ctx.organizationId,
        code: validatedData.code,
      },
    });

    if (existingWarehouse) {
      return {
        success: false,
        error: 'Codice magazzino già esistente per questa organizzazione',
      };
    }

    // 5. ✅ Creazione magazzino con organizationId
    const warehouse = await prisma.warehouse.create({
      data: {
        organizationId: ctx.organizationId, // ✅ Associa automaticamente all'organizzazione
        code: validatedData.code,
        name: validatedData.name,
        address: validatedData.address || null,
      },
    });

    // 6. Revalidazione cache Next.js
    revalidatePath('/warehouse');
    revalidatePath('/stock-movements');

    return {
      success: true,
      data: { id: warehouse.id },
    };
  } catch (error) {
    console.error('Errore creazione magazzino:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore sconosciuto durante la creazione del magazzino',
    };
  }
}

/**
 * Aggiorna un magazzino esistente
 * 
 * MULTITENANT: Verifica che il magazzino appartenga all'organizzazione corrente
 * 
 * @param input - Dati magazzino da aggiornare (include id)
 * @returns Result con magazzino aggiornato o errore
 */
export async function updateWarehouseAction(
  input: UpdateWarehouseInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();

    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per aggiornare magazzini',
      };
    }

    // 3. Validazione con Zod
    const validatedData = updateWarehouseSchema.parse(input);

    // 4. Verifica che il magazzino esista e appartenga all'organizzazione
    const existingWarehouse = await prisma.warehouse.findUnique({
      where: { id: validatedData.id },
    });

    if (!existingWarehouse) {
      return {
        success: false,
        error: 'Magazzino non trovato',
      };
    }

    // 5. ✅ Verifica accesso organizzazione
    await verifyOrganizationAccess(existingWarehouse.organizationId, ctx);

    // 6. Verifica unicità codice (se modificato)
    if (validatedData.code && validatedData.code !== existingWarehouse.code) {
      const duplicateWarehouse = await prisma.warehouse.findFirst({
        where: {
          organizationId: ctx.organizationId,
          code: validatedData.code,
          id: { not: validatedData.id },
        },
      });

      if (duplicateWarehouse) {
        return {
          success: false,
          error: 'Codice magazzino già esistente per questa organizzazione',
        };
      }
    }

    // 7. Aggiornamento magazzino
    await prisma.warehouse.update({
      where: { id: validatedData.id },
      data: {
        ...(validatedData.code && { code: validatedData.code }),
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.address !== undefined && { address: validatedData.address }),
      },
    });

    // 8. Revalidazione cache Next.js
    revalidatePath('/warehouse');
    revalidatePath('/stock-movements');

    return {
      success: true,
      data: { id: validatedData.id },
    };
  } catch (error) {
    console.error('Errore aggiornamento magazzino:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore sconosciuto durante l\'aggiornamento del magazzino',
    };
  }
}

/**
 * Elimina un magazzino
 * 
 * MULTITENANT: Verifica che il magazzino appartenga all'organizzazione corrente
 * 
 * @param id - ID magazzino da eliminare
 * @returns Result con id eliminato o errore
 */
export async function deleteWarehouseAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();

    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per eliminare magazzini',
      };
    }

    // 3. Verifica che il magazzino esista e appartenga all'organizzazione
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            stockMovements: true,
            documents: true,
            documentLines: true,
          },
        },
      },
    });

    if (!warehouse) {
      return {
        success: false,
        error: 'Magazzino non trovato',
      };
    }

    // 4. ✅ Verifica accesso organizzazione
    await verifyOrganizationAccess(warehouse.organizationId, ctx);

    // 5. Verifica che non ci siano movimenti o documenti collegati
    if (warehouse._count.stockMovements > 0) {
      return {
        success: false,
        error: 'Impossibile eliminare: ci sono movimenti di magazzino collegati',
      };
    }

    if (warehouse._count.documents > 0 || warehouse._count.documentLines > 0) {
      return {
        success: false,
        error: 'Impossibile eliminare: ci sono documenti collegati',
      };
    }

    // 6. Eliminazione magazzino
    await prisma.warehouse.delete({
      where: { id },
    });

    // 7. Revalidazione cache Next.js
    revalidatePath('/warehouse');
    revalidatePath('/stock-movements');

    return {
      success: true,
      data: { id },
    };
  } catch (error) {
    console.error('Errore eliminazione magazzino:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore sconosciuto durante l\'eliminazione del magazzino',
    };
  }
}
