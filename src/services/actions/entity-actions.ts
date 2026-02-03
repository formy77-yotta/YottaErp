'use server';

/**
 * Server Actions per gestione anagrafiche (Entities)
 * 
 * Le Server Actions sono il modo raccomandato in Next.js 14
 * per gestire mutazioni e operazioni server-side.
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

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAuthContext, canWrite, verifyOrganizationAccess, ForbiddenError } from '@/lib/auth';
import { createEntitySchema, updateEntitySchema } from '@/schemas/entity-schema';
import type { CreateEntityInput, UpdateEntityInput } from '@/schemas/entity-schema';

/**
 * Tipo di ritorno standard per Server Actions
 */
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Mappa tipo entità frontend (CUSTOMER, SUPPLIER, LEAD) a Prisma (CLIENT, PROVIDER, BOTH)
 */
function mapEntityTypeToPrisma(type: 'CUSTOMER' | 'SUPPLIER' | 'LEAD'): 'CLIENT' | 'PROVIDER' | 'BOTH' {
  switch (type) {
    case 'CUSTOMER':
      return 'CLIENT';
    case 'SUPPLIER':
      return 'PROVIDER';
    case 'LEAD':
      // LEAD viene mappato a CLIENT (potrebbe essere aggiunto come nuovo tipo in futuro)
      return 'CLIENT';
    default:
      return 'CLIENT';
  }
}

/**
 * Mappa tipo entità Prisma a frontend
 */
function mapEntityTypeFromPrisma(type: 'CLIENT' | 'PROVIDER' | 'BOTH'): 'CUSTOMER' | 'SUPPLIER' | 'LEAD' {
  switch (type) {
    case 'CLIENT':
      return 'CUSTOMER';
    case 'PROVIDER':
      return 'SUPPLIER';
    case 'BOTH':
      // BOTH viene mappato a CUSTOMER (potrebbe essere gestito diversamente in futuro)
      return 'CUSTOMER';
    default:
      return 'CUSTOMER';
  }
}

/**
 * Ottiene tutte le entità dell'organizzazione corrente
 * 
 * MULTITENANT: Filtra automaticamente per organizationId
 * 
 * @returns Array di entità
 */
export async function getEntitiesAction(): Promise<ActionResult<Array<{
  id: string;
  type: 'CUSTOMER' | 'SUPPLIER' | 'LEAD';
  businessName: string;
  vatNumber: string | null;
  fiscalCode: string | null;
  address: string;
  city: string;
  province: string;
  zipCode: string;
  email: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}>>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione (include organizationId)
    const ctx = await getAuthContext();

    // 2. Recupera entità filtrate per organizzazione
    const entities = await prisma.entity.findMany({
      where: {
        organizationId: ctx.organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        type: true,
        businessName: true,
        vatNumber: true,
        fiscalCode: true,
        address: true,
        city: true,
        province: true,
        zipCode: true,
        email: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 3. Mappa i tipi da Prisma a frontend
    const mappedEntities = entities.map((entity) => ({
      ...entity,
      type: mapEntityTypeFromPrisma(entity.type),
    }));

    return {
      success: true,
      data: mappedEntities,
    };
  } catch (error) {
    console.error('Errore recupero entità:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante il recupero delle entità',
    };
  }
}

/**
 * Crea una nuova entità
 * 
 * MULTITENANT: L'entità viene automaticamente associata all'organizzazione corrente
 * 
 * @param input - Dati entità da creare
 * @returns Result con entità creata o errore
 */
export async function createEntityAction(
  input: CreateEntityInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione (include organizationId)
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per creare entità',
      };
    }

    // 3. Validazione con Zod
    const validatedData = createEntitySchema.parse(input);

    // 4. Verifica unicità P.IVA per organizzazione (se presente)
    if (validatedData.vatNumber && validatedData.vatNumber.trim() !== '') {
      const existingEntity = await prisma.entity.findFirst({
        where: {
          organizationId: ctx.organizationId,
          vatNumber: validatedData.vatNumber,
        },
      });

      if (existingEntity) {
        return {
          success: false,
          error: 'P.IVA già esistente per questa organizzazione',
        };
      }
    }

    // 5. ✅ Creazione entità con organizationId
    const entity = await prisma.entity.create({
      data: {
        organizationId: ctx.organizationId, // ✅ Associa automaticamente all'organizzazione
        type: mapEntityTypeToPrisma(validatedData.type),
        businessName: validatedData.businessName,
        vatNumber: validatedData.vatNumber && validatedData.vatNumber.trim() !== '' 
          ? validatedData.vatNumber 
          : null,
        fiscalCode: validatedData.fiscalCode && validatedData.fiscalCode.trim() !== '' 
          ? validatedData.fiscalCode 
          : null,
        address: validatedData.address,
        city: validatedData.city,
        province: validatedData.province,
        zipCode: validatedData.zipCode,
        country: 'IT',
        email: validatedData.email && validatedData.email.trim() !== '' 
          ? validatedData.email 
          : null,
        active: true,
      },
    });

    // 6. Revalidazione cache Next.js
    revalidatePath('/entities');

    return {
      success: true,
      data: { id: entity.id },
    };
  } catch (error) {
    console.error('Errore creazione entità:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Gestione errori Prisma (es. unique constraint violation)
    if (error instanceof Error) {
      // Se è un errore di unique constraint per P.IVA
      if (error.message.includes('organizationId_vatNumber') || error.message.includes('Unique constraint')) {
        return {
          success: false,
          error: 'P.IVA già esistente per questa organizzazione',
        };
      }
      
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore sconosciuto durante la creazione dell\'entità',
    };
  }
}

/**
 * Aggiorna un'entità esistente
 * 
 * MULTITENANT: Verifica che l'entità appartenga all'organizzazione corrente
 * 
 * @param input - Dati entità da aggiornare (include id)
 * @returns Result con successo o errore
 */
export async function updateEntityAction(
  input: UpdateEntityInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per modificare entità',
      };
    }

    // 3. Validazione con Zod
    const validatedData = updateEntitySchema.parse(input);

    // 4. ✅ Verifica esistenza E appartenenza all'organizzazione
    const existingEntity = await prisma.entity.findUnique({
      where: { id: validatedData.id },
      select: { id: true, organizationId: true, vatNumber: true },
    });

    if (!existingEntity) {
      return {
        success: false,
        error: 'Entità non trovata',
      };
    }
    
    // ✅ Verifica che appartenga all'organizzazione corrente
    verifyOrganizationAccess(ctx, existingEntity);

    // 5. Verifica unicità P.IVA se è stata modificata
    if (validatedData.vatNumber && validatedData.vatNumber.trim() !== '') {
      if (existingEntity.vatNumber !== validatedData.vatNumber) {
        const duplicateEntity = await prisma.entity.findFirst({
          where: {
            organizationId: ctx.organizationId,
            vatNumber: validatedData.vatNumber,
          },
        });

        if (duplicateEntity && duplicateEntity.id !== validatedData.id) {
          return {
            success: false,
            error: 'P.IVA già esistente per questa organizzazione',
          };
        }
      }
    }

    // 6. Aggiornamento entità
    const updatedEntity = await prisma.entity.update({
      where: { id: validatedData.id },
      data: {
        ...(validatedData.type && { type: mapEntityTypeToPrisma(validatedData.type) }),
        ...(validatedData.businessName && { businessName: validatedData.businessName }),
        ...(validatedData.vatNumber !== undefined && { 
          vatNumber: validatedData.vatNumber && validatedData.vatNumber.trim() !== '' 
            ? validatedData.vatNumber 
            : null 
        }),
        ...(validatedData.fiscalCode !== undefined && { 
          fiscalCode: validatedData.fiscalCode && validatedData.fiscalCode.trim() !== '' 
            ? validatedData.fiscalCode 
            : null 
        }),
        ...(validatedData.address && { address: validatedData.address }),
        ...(validatedData.city && { city: validatedData.city }),
        ...(validatedData.province && { province: validatedData.province }),
        ...(validatedData.zipCode && { zipCode: validatedData.zipCode }),
        ...(validatedData.email !== undefined && { 
          email: validatedData.email && validatedData.email.trim() !== '' 
            ? validatedData.email 
            : null 
        }),
      },
    });

    // 7. Revalidazione cache
    revalidatePath('/entities');
    revalidatePath(`/entities/${validatedData.id}`);

    return {
      success: true,
      data: { id: updatedEntity.id },
    };
  } catch (error) {
    console.error('Errore aggiornamento entità:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (error instanceof Error) {
      // Se è un errore di unique constraint per P.IVA
      if (error.message.includes('organizationId_vatNumber') || error.message.includes('Unique constraint')) {
        return {
          success: false,
          error: 'P.IVA già esistente per questa organizzazione',
        };
      }
      
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore sconosciuto durante l\'aggiornamento dell\'entità',
    };
  }
}
