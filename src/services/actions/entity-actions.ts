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

'use server';

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
 * 
 * Usa il campo isLead per distinguere LEAD da CUSTOMER (entrambi sono CLIENT nel DB)
 */
function mapEntityTypeFromPrisma(
  type: 'CLIENT' | 'PROVIDER' | 'BOTH',
  isLead: boolean = false
): 'CUSTOMER' | 'SUPPLIER' | 'LEAD' {
  switch (type) {
    case 'CLIENT':
      // Se isLead è true, è un LEAD, altrimenti è un CUSTOMER
      return isLead ? 'LEAD' : 'CUSTOMER';
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
 * @param type - Tipo opzionale per filtrare (CUSTOMER, SUPPLIER, LEAD)
 * @returns Array di entità
 */
export async function getEntitiesAction(
  type?: 'CUSTOMER' | 'SUPPLIER' | 'LEAD'
): Promise<ActionResult<Array<{
  id: string;
  type: 'CUSTOMER' | 'SUPPLIER' | 'LEAD';
  businessName: string;
  vatNumber: string | null;
  fiscalCode: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  zipCode: string | null;
  email: string | null;
  pec: string | null;
  sdiCode: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}>>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione (include organizationId)
    const ctx = await getAuthContext();

    // 2. Costruisci filtro tipo per Prisma
    // Usa isLead per distinguere LEAD da CUSTOMER (entrambi sono CLIENT nel DB)
    let typeFilter: { 
      type?: { in: ('CLIENT' | 'PROVIDER' | 'BOTH')[] };
      isLead?: boolean;
    } = {};
    
    if (type) {
      // Mappa tipo frontend a tipo Prisma
      switch (type) {
        case 'CUSTOMER':
          // Clienti: CLIENT o BOTH, ma ESCLUDI i LEAD (isLead = false)
          typeFilter = { 
            type: { in: ['CLIENT', 'BOTH'] },
            isLead: false, // Escludi i LEAD
          };
          break;
        case 'SUPPLIER':
          // Fornitori: PROVIDER o BOTH
          typeFilter = { type: { in: ['PROVIDER', 'BOTH'] } };
          break;
        case 'LEAD':
          // Lead: CLIENT con isLead = true
          typeFilter = { 
            type: { in: ['CLIENT'] },
            isLead: true, // Solo i LEAD
          };
          break;
      }
    }

    // 3. Recupera entità filtrate per organizzazione e tipo
    const entities = await prisma.entity.findMany({
      where: {
        organizationId: ctx.organizationId,
        ...typeFilter,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        type: true,
        isLead: true, // ✅ Include isLead per distinguere LEAD da CUSTOMER
        businessName: true,
        vatNumber: true,
        fiscalCode: true,
        address: true,
        city: true,
        province: true,
        zipCode: true,
        email: true,
        pec: true,
        sdiCode: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 4. Mappa i tipi da Prisma a frontend
    // Usa isLead per distinguere LEAD da CUSTOMER
    const mappedEntities = entities.map((entity) => ({
      ...entity,
      type: mapEntityTypeFromPrisma(entity.type, entity.isLead),
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
 * Ottiene un'entità singola per ID
 * 
 * MULTITENANT: Verifica che l'entità appartenga all'organizzazione corrente
 * 
 * @param id - ID dell'entità
 * @returns Entità o errore
 */
export async function getEntityAction(
  id: string
): Promise<ActionResult<{
  id: string;
  type: 'CUSTOMER' | 'SUPPLIER' | 'LEAD';
  businessName: string;
  vatNumber: string | null;
  fiscalCode: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  zipCode: string | null;
  email: string | null;
  pec: string | null;
  sdiCode: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();

    // 2. Recupera entità (include organizationId per verifica)
    const entity = await prisma.entity.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        isLead: true,
        businessName: true,
        vatNumber: true,
        fiscalCode: true,
        address: true,
        city: true,
        province: true,
        zipCode: true,
        email: true,
        pec: true,
        sdiCode: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        organizationId: true, // Necessario per verifyOrganizationAccess
      },
    });

    if (!entity) {
      return {
        success: false,
        error: 'Entità non trovata',
      };
    }

    // 3. ✅ Verifica che appartenga all'organizzazione corrente
    verifyOrganizationAccess(ctx, entity);

    // 4. Mappa tipo da Prisma a frontend
    return {
      success: true,
      data: {
        ...entity,
        type: mapEntityTypeFromPrisma(entity.type, entity.isLead),
      },
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
      error: 'Errore durante il recupero dell\'entità',
    };
  }
}

/**
 * Aggiorna lo stato active di un'entità
 * 
 * MULTITENANT: Verifica che l'entità appartenga all'organizzazione corrente
 * 
 * @param id - ID dell'entità
 * @param active - Nuovo stato (true = attiva, false = disattiva)
 * @returns Result con successo o errore
 */
export async function toggleEntityActiveAction(
  id: string,
  active: boolean
): Promise<ActionResult<{ id: string; active: boolean }>> {
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

    // 3. ✅ Verifica esistenza E appartenenza all'organizzazione
    const existingEntity = await prisma.entity.findUnique({
      where: { id },
      select: { id: true, organizationId: true },
    });

    if (!existingEntity) {
      return {
        success: false,
        error: 'Entità non trovata',
      };
    }
    
    // ✅ Verifica che appartenga all'organizzazione corrente
    verifyOrganizationAccess(ctx, existingEntity);

    // 4. Aggiorna stato
    const updatedEntity = await prisma.entity.update({
      where: { id },
      data: { active },
    });

    // 5. Revalidazione cache
    revalidatePath('/entities');
    revalidatePath(`/entities/${id}`);

    return {
      success: true,
      data: { id: updatedEntity.id, active: updatedEntity.active },
    };
  } catch (error) {
    console.error('Errore aggiornamento stato entità:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante l\'aggiornamento dello stato dell\'entità',
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
    // Gestione campi opzionali: converti stringhe vuote in null
    const entity = await prisma.entity.create({
      data: {
        organizationId: ctx.organizationId, // ✅ Associa automaticamente all'organizzazione
        type: mapEntityTypeToPrisma(validatedData.type),
        isLead: validatedData.type === 'LEAD', // ✅ Imposta isLead se il tipo è LEAD
        businessName: validatedData.businessName, // ✅ Obbligatorio
        vatNumber: validatedData.vatNumber && validatedData.vatNumber.trim() !== '' 
          ? validatedData.vatNumber 
          : null,
        fiscalCode: validatedData.fiscalCode && validatedData.fiscalCode.trim() !== '' 
          ? validatedData.fiscalCode 
          : null,
        address: validatedData.address && validatedData.address.trim() !== '' 
          ? validatedData.address 
          : null,
        city: validatedData.city && validatedData.city.trim() !== '' 
          ? validatedData.city 
          : null,
        province: validatedData.province && validatedData.province.trim() !== '' 
          ? validatedData.province 
          : null,
        zipCode: validatedData.zipCode && validatedData.zipCode.trim() !== '' 
          ? validatedData.zipCode 
          : null,
        country: 'IT',
        email: validatedData.email && validatedData.email.trim() !== '' 
          ? validatedData.email 
          : null,
        pec: validatedData.pec && validatedData.pec.trim() !== '' 
          ? validatedData.pec 
          : null,
        sdiCode: validatedData.sdiCode && validatedData.sdiCode.trim() !== '' 
          ? validatedData.sdiCode 
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
    // Gestione campi opzionali: converti stringhe vuote in null
    const updatedEntity = await prisma.entity.update({
      where: { id: validatedData.id },
      data: {
        ...(validatedData.type && { 
          type: mapEntityTypeToPrisma(validatedData.type),
          isLead: validatedData.type === 'LEAD', // ✅ Aggiorna isLead quando cambia il tipo
        }),
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
        ...(validatedData.address !== undefined && { 
          address: validatedData.address && validatedData.address.trim() !== '' 
            ? validatedData.address 
            : null 
        }),
        ...(validatedData.city !== undefined && { 
          city: validatedData.city && validatedData.city.trim() !== '' 
            ? validatedData.city 
            : null 
        }),
        ...(validatedData.province !== undefined && { 
          province: validatedData.province && validatedData.province.trim() !== '' 
            ? validatedData.province 
            : null 
        }),
        ...(validatedData.zipCode !== undefined && { 
          zipCode: validatedData.zipCode && validatedData.zipCode.trim() !== '' 
            ? validatedData.zipCode 
            : null 
        }),
        ...(validatedData.email !== undefined && { 
          email: validatedData.email && validatedData.email.trim() !== '' 
            ? validatedData.email 
            : null 
        }),
        ...(validatedData.pec !== undefined && { 
          pec: validatedData.pec && validatedData.pec.trim() !== '' 
            ? validatedData.pec 
            : null 
        }),
        ...(validatedData.sdiCode !== undefined && { 
          sdiCode: validatedData.sdiCode && validatedData.sdiCode.trim() !== '' 
            ? validatedData.sdiCode 
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

/**
 * Verifica se un'entità ha dipendenze (documenti collegati)
 * 
 * MULTITENANT: Verifica che l'entità appartenga all'organizzazione corrente
 * 
 * @param id - ID dell'entità
 * @returns Result con informazioni sulle dipendenze
 */
export async function checkEntityDependenciesAction(
  id: string
): Promise<ActionResult<{
  hasDependencies: boolean;
  documentCount: number;
  documentTypes: Array<{ type: string; count: number }>;
}>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();

    // 2. ✅ Verifica esistenza E appartenenza all'organizzazione
    const existingEntity = await prisma.entity.findUnique({
      where: { id },
      select: { id: true, organizationId: true, businessName: true },
    });

    if (!existingEntity) {
      return {
        success: false,
        error: 'Entità non trovata',
      };
    }
    
    // ✅ Verifica che appartenga all'organizzazione corrente
    verifyOrganizationAccess(ctx, existingEntity);

    // 3. Conta documenti collegati
    const documents = await prisma.document.findMany({
      where: {
        organizationId: ctx.organizationId,
        entityId: id,
      },
      select: {
        category: true,
      },
    });

    const documentCount = documents.length;
    const documentTypes = documents.reduce((acc, doc) => {
      const type = doc.category;
      const existing = acc.find((item) => item.type === type);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ type, count: 1 });
      }
      return acc;
    }, [] as Array<{ type: string; count: number }>);

    return {
      success: true,
      data: {
        hasDependencies: documentCount > 0,
        documentCount,
        documentTypes,
      },
    };
  } catch (error) {
    console.error('Errore verifica dipendenze entità:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante la verifica delle dipendenze',
    };
  }
}

/**
 * Elimina un'entità dopo aver verificato che non abbia dipendenze
 * 
 * MULTITENANT: Verifica che l'entità appartenga all'organizzazione corrente
 * 
 * @param id - ID dell'entità da eliminare
 * @returns Result con successo o errore
 */
export async function deleteEntityAction(
  id: string
): Promise<ActionResult<void>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per eliminare entità',
      };
    }

    // 3. ✅ Verifica esistenza E appartenenza all'organizzazione
    const existingEntity = await prisma.entity.findUnique({
      where: { id },
      select: { id: true, organizationId: true },
    });

    if (!existingEntity) {
      return {
        success: false,
        error: 'Entità non trovata',
      };
    }
    
    // ✅ Verifica che appartenga all'organizzazione corrente
    verifyOrganizationAccess(ctx, existingEntity);

    // 4. Verifica dipendenze (documenti collegati)
    const documents = await prisma.document.findFirst({
      where: {
        organizationId: ctx.organizationId,
        entityId: id,
      },
      select: {
        id: true,
        category: true,
        number: true,
      },
    });

    if (documents) {
      const documentTypeLabels: Record<string, string> = {
        QUOTE: 'preventivo',
        ORDER: 'ordine',
        DELIVERY_NOTE: 'DDT',
        INVOICE: 'fattura',
        CREDIT_NOTE: 'nota di credito',
      };

      const typeLabel = documentTypeLabels[documents.category] || 'documento';
      
      return {
        success: false,
        error: `Impossibile eliminare l'anagrafica: esistono documenti collegati (es. ${typeLabel} n. ${documents.number}). Elimina prima i documenti associati.`,
      };
    }

    // 5. Elimina entità
    await prisma.entity.delete({
      where: { id },
    });

    // 6. Revalidazione cache
    revalidatePath('/entities');
    revalidatePath(`/entities/${id}`);

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error('Errore eliminazione entità:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante l\'eliminazione dell\'entità',
    };
  }
}