/**
 * Server Actions per gestione Unità di Misura
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
import { Decimal } from 'decimal.js';
import { prisma } from '@/lib/prisma';
import { getAuthContext, canWrite, verifyOrganizationAccess, ForbiddenError } from '@/lib/auth';
import { 
  createUnitOfMeasureSchema, 
  updateUnitOfMeasureSchema,
  type CreateUnitOfMeasureInput,
  type UpdateUnitOfMeasureInput
} from '@/schemas/unit-of-measure-schema';

/**
 * Tipo di ritorno standard per Server Actions
 */
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Ottiene tutte le unità di misura dell'organizzazione corrente
 * 
 * MULTITENANT: Filtra automaticamente per organizationId
 * 
 * @returns Array di unità di misura
 */
export async function getUnitsOfMeasureAction(): Promise<ActionResult<Array<{
  id: string;
  code: string;
  name: string;
  measureClass: string;
  baseFactor: string; // Decimal come stringa per il frontend
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}>>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione (include organizationId)
    const ctx = await getAuthContext();

    // 2. Recupera unità di misura filtrate per organizzazione
    const units = await prisma.unitOfMeasure.findMany({
      where: {
        organizationId: ctx.organizationId,
      },
      orderBy: [
        { measureClass: 'asc' }, // Ordina per classe
        { code: 'asc' }, // Poi per codice
      ],
      select: {
        id: true,
        code: true,
        name: true,
        measureClass: true,
        baseFactor: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Converti Decimal in stringa per il frontend
    const unitsWithStringFactor = units.map(unit => ({
      ...unit,
      baseFactor: unit.baseFactor.toString(),
    }));

    return {
      success: true,
      data: unitsWithStringFactor,
    };
  } catch (error) {
    console.error('Errore recupero unità di misura:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante il recupero delle unità di misura',
    };
  }
}

/**
 * Crea una nuova unità di misura
 * 
 * MULTITENANT: L'unità di misura viene automaticamente associata all'organizzazione corrente
 * 
 * @param input - Dati unità di misura da creare
 * @returns Result con unità di misura creata o errore
 */
export async function createUnitOfMeasureAction(
  input: CreateUnitOfMeasureInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione (include organizationId)
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per creare unità di misura',
      };
    }

    // 3. Validazione con Zod
    const validatedData = createUnitOfMeasureSchema.parse(input);

    // 4. Normalizza codice (maiuscolo, trim)
    const normalizedCode = validatedData.code.trim().toUpperCase();

    // 5. Verifica unicità codice per organizzazione
    const existingUnit = await prisma.unitOfMeasure.findFirst({
      where: {
        organizationId: ctx.organizationId,
        code: normalizedCode,
      },
    });

    if (existingUnit) {
      return {
        success: false,
        error: 'Codice unità di misura già esistente per questa organizzazione',
      };
    }

    // 6. ✅ Creazione unità di misura con organizationId
    // BUSINESS RULE: validatedData.baseFactor è già una stringa (es. "1.000000")
    // Lo convertiamo in Decimal per il database
    const unit = await prisma.unitOfMeasure.create({
      data: {
        organizationId: ctx.organizationId, // ✅ Associa automaticamente all'organizzazione
        code: normalizedCode,
        name: validatedData.name.trim(),
        measureClass: validatedData.measureClass,
        baseFactor: new Decimal(validatedData.baseFactor), // ✅ Converte stringa in Decimal per DB
        active: validatedData.active,
      },
    });

    // 7. Revalidazione cache Next.js
    revalidatePath('/settings/unit-of-measure');

    return {
      success: true,
      data: { id: unit.id },
    };
  } catch (error) {
    console.error('Errore creazione unità di misura:', error);

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
          error: 'Codice unità di misura già esistente per questa organizzazione',
        };
      }
      
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore sconosciuto durante la creazione dell\'unità di misura',
    };
  }
}

/**
 * Aggiorna un'unità di misura esistente
 * 
 * MULTITENANT: Verifica che l'unità di misura appartenga all'organizzazione corrente
 * 
 * @param input - Dati unità di misura da aggiornare (include id)
 * @returns Result con successo o errore
 */
export async function updateUnitOfMeasureAction(
  input: UpdateUnitOfMeasureInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per modificare unità di misura',
      };
    }

    // 3. Validazione con Zod
    const validatedData = updateUnitOfMeasureSchema.parse(input);

    // 4. ✅ Verifica esistenza E appartenenza all'organizzazione
    const existingUnit = await prisma.unitOfMeasure.findUnique({
      where: { id: validatedData.id },
      select: { id: true, organizationId: true, code: true },
    });

    if (!existingUnit) {
      return {
        success: false,
        error: 'Unità di misura non trovata',
      };
    }
    
    // ✅ Verifica che appartenga all'organizzazione corrente
    verifyOrganizationAccess(ctx, existingUnit);

    // 5. Normalizza codice se presente
    const normalizedCode = validatedData.code 
      ? validatedData.code.trim().toUpperCase()
      : undefined;

    // 6. Verifica unicità codice se è stato modificato
    if (normalizedCode && normalizedCode !== existingUnit.code) {
      const duplicateUnit = await prisma.unitOfMeasure.findFirst({
        where: {
          organizationId: ctx.organizationId,
          code: normalizedCode,
        },
      });

      if (duplicateUnit && duplicateUnit.id !== validatedData.id) {
        return {
          success: false,
          error: 'Codice unità di misura già esistente per questa organizzazione',
        };
      }
    }

    // 7. Aggiornamento unità di misura
    const updatedUnit = await prisma.unitOfMeasure.update({
      where: { id: validatedData.id },
      data: {
        ...(normalizedCode && { code: normalizedCode }),
        ...(validatedData.name !== undefined && { 
          name: validatedData.name.trim() 
        }),
        ...(validatedData.measureClass !== undefined && { 
          measureClass: validatedData.measureClass 
        }),
        ...(validatedData.baseFactor !== undefined && { 
          baseFactor: new Decimal(validatedData.baseFactor) // ✅ Converte stringa in Decimal
        }),
        ...(validatedData.active !== undefined && { active: validatedData.active }),
      },
    });

    // 8. Revalidazione cache
    revalidatePath('/settings/unit-of-measure');

    return {
      success: true,
      data: { id: updatedUnit.id },
    };
  } catch (error) {
    console.error('Errore aggiornamento unità di misura:', error);

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
          error: 'Codice unità di misura già esistente per questa organizzazione',
        };
      }
      
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore sconosciuto durante l\'aggiornamento dell\'unità di misura',
    };
  }
}

/**
 * Elimina un'unità di misura
 * 
 * MULTITENANT: Verifica che l'unità di misura appartenga all'organizzazione corrente
 * 
 * @param id - ID unità di misura da eliminare
 * @returns Result con successo o errore
 */
export async function deleteUnitOfMeasureAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per eliminare unità di misura',
      };
    }

    // 3. ✅ Verifica esistenza E appartenenza all'organizzazione
    const existingUnit = await prisma.unitOfMeasure.findUnique({
      where: { id },
      select: { id: true, organizationId: true },
    });

    if (!existingUnit) {
      return {
        success: false,
        error: 'Unità di misura non trovata',
      };
    }
    
    // ✅ Verifica che appartenga all'organizzazione corrente
    verifyOrganizationAccess(ctx, existingUnit);

    // 4. Eliminazione unità di misura
    await prisma.unitOfMeasure.delete({
      where: { id },
    });

    // 5. Revalidazione cache
    revalidatePath('/settings/unit-of-measure');

    return {
      success: true,
      data: { id },
    };
  } catch (error) {
    console.error('Errore eliminazione unità di misura:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante l\'eliminazione dell\'unità di misura',
    };
  }
}
