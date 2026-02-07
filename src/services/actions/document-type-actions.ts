/**
 * Server Actions per gestione Configurazioni Tipi Documento
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
 * IMPORTANTE: I flag hanno significato specifico:
 * - inventoryMovement: se true, il documento movimenta lo stock (es. DDT, Fattura)
 * - valuationImpact: se true, il documento impatta costi/ricavi (es. Fattura, Nota Credito)
 * - operationSign: +1 per incrementi (fattura vendita), -1 per decrementi (nota credito)
 */

'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAuthContext, canWrite, verifyOrganizationAccess, ForbiddenError } from '@/lib/auth';
import { 
  createDocumentTypeSchema, 
  updateDocumentTypeSchema,
  type CreateDocumentTypeInput,
  type UpdateDocumentTypeInput
} from '@/schemas/document-type-schema';

/**
 * Tipo di ritorno standard per Server Actions
 */
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Ottiene tutte le configurazioni tipi documento dell'organizzazione corrente
 * 
 * MULTITENANT: Filtra automaticamente per organizationId
 * 
 * @returns Array di configurazioni tipi documento
 */
export async function getDocumentTypesAction(): Promise<ActionResult<Array<{
  id: string;
  code: string;
  description: string;
  numeratorCode: string;
  inventoryMovement: boolean;
  valuationImpact: boolean;
  operationSign: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}>>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione (include organizationId)
    const ctx = await getAuthContext();

    // 2. Recupera configurazioni filtrate per organizzazione
    const types = await prisma.documentTypeConfig.findMany({
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
        numeratorCode: true,
        inventoryMovement: true,
        valuationImpact: true,
        operationSign: true,
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
    console.error('Errore recupero configurazioni tipi documento:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante il recupero delle configurazioni tipi documento',
    };
  }
}

/**
 * Crea una nuova configurazione tipo documento
 * 
 * MULTITENANT: La configurazione viene automaticamente associata all'organizzazione corrente
 * 
 * @param input - Dati configurazione da creare
 * @returns Result con configurazione creata o errore
 */
export async function createDocumentTypeAction(
  input: CreateDocumentTypeInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione (include organizationId)
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per creare configurazioni tipi documento',
      };
    }

    // 3. Validazione con Zod
    const validatedData = createDocumentTypeSchema.parse(input);

    // 4. Normalizza codice (maiuscolo, trim)
    const normalizedCode = validatedData.code.trim().toUpperCase();
    const normalizedNumeratorCode = validatedData.numeratorCode.trim().toUpperCase();

    // 5. Verifica unicità codice per organizzazione
    const existingType = await prisma.documentTypeConfig.findFirst({
      where: {
        organizationId: ctx.organizationId,
        code: normalizedCode,
      },
    });

    if (existingType) {
      return {
        success: false,
        error: 'Codice tipo documento già esistente per questa organizzazione',
      };
    }

    // 6. ✅ Creazione configurazione con organizationId
    const type = await prisma.documentTypeConfig.create({
      data: {
        organizationId: ctx.organizationId, // ✅ Associa automaticamente all'organizzazione
        code: normalizedCode,
        description: validatedData.description.trim(),
        numeratorCode: normalizedNumeratorCode,
        inventoryMovement: validatedData.inventoryMovement,
        valuationImpact: validatedData.valuationImpact,
        operationSign: validatedData.operationSign,
        active: validatedData.active,
      },
    });

    // 7. Revalidazione cache Next.js
    revalidatePath('/settings/document-types');

    return {
      success: true,
      data: { id: type.id },
    };
  } catch (error) {
    console.error('Errore creazione configurazione tipo documento:', error);

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
          error: 'Codice tipo documento già esistente per questa organizzazione',
        };
      }
      
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore sconosciuto durante la creazione della configurazione tipo documento',
    };
  }
}

/**
 * Aggiorna una configurazione tipo documento esistente
 * 
 * MULTITENANT: Verifica che la configurazione appartenga all'organizzazione corrente
 * 
 * @param input - Dati configurazione da aggiornare (include id)
 * @returns Result con successo o errore
 */
export async function updateDocumentTypeAction(
  input: UpdateDocumentTypeInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per modificare configurazioni tipi documento',
      };
    }

    // 3. Validazione con Zod
    const validatedData = updateDocumentTypeSchema.parse(input);

    // 4. ✅ Verifica esistenza E appartenenza all'organizzazione
    const existingType = await prisma.documentTypeConfig.findUnique({
      where: { id: validatedData.id },
      select: { id: true, organizationId: true, code: true },
    });

    if (!existingType) {
      return {
        success: false,
        error: 'Configurazione tipo documento non trovata',
      };
    }
    
    // ✅ Verifica che appartenga all'organizzazione corrente
    verifyOrganizationAccess(ctx, existingType);

    // 5. Normalizza codice se presente
    const normalizedCode = validatedData.code 
      ? validatedData.code.trim().toUpperCase()
      : undefined;
    const normalizedNumeratorCode = validatedData.numeratorCode
      ? validatedData.numeratorCode.trim().toUpperCase()
      : undefined;

    // 6. Verifica unicità codice se è stato modificato
    if (normalizedCode && normalizedCode !== existingType.code) {
      const duplicateType = await prisma.documentTypeConfig.findFirst({
        where: {
          organizationId: ctx.organizationId,
          code: normalizedCode,
        },
      });

      if (duplicateType && duplicateType.id !== validatedData.id) {
        return {
          success: false,
          error: 'Codice tipo documento già esistente per questa organizzazione',
        };
      }
    }

    // 7. Aggiornamento configurazione
    const updatedType = await prisma.documentTypeConfig.update({
      where: { id: validatedData.id },
      data: {
        ...(normalizedCode && { code: normalizedCode }),
        ...(validatedData.description !== undefined && { 
          description: validatedData.description.trim() 
        }),
        ...(normalizedNumeratorCode && { numeratorCode: normalizedNumeratorCode }),
        ...(validatedData.inventoryMovement !== undefined && { 
          inventoryMovement: validatedData.inventoryMovement 
        }),
        ...(validatedData.valuationImpact !== undefined && { 
          valuationImpact: validatedData.valuationImpact 
        }),
        ...(validatedData.operationSign !== undefined && { 
          operationSign: validatedData.operationSign 
        }),
        ...(validatedData.active !== undefined && { active: validatedData.active }),
      },
    });

    // 8. Revalidazione cache
    revalidatePath('/settings/document-types');

    return {
      success: true,
      data: { id: updatedType.id },
    };
  } catch (error) {
    console.error('Errore aggiornamento configurazione tipo documento:', error);

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
          error: 'Codice tipo documento già esistente per questa organizzazione',
        };
      }
      
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore sconosciuto durante l\'aggiornamento della configurazione tipo documento',
    };
  }
}

/**
 * Elimina una configurazione tipo documento
 * 
 * MULTITENANT: Verifica che la configurazione appartenga all'organizzazione corrente
 * 
 * @param id - ID configurazione da eliminare
 * @returns Result con successo o errore
 */
export async function deleteDocumentTypeAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per eliminare configurazioni tipi documento',
      };
    }

    // 3. ✅ Verifica esistenza E appartenenza all'organizzazione
    const existingType = await prisma.documentTypeConfig.findUnique({
      where: { id },
      select: { id: true, organizationId: true },
    });

    if (!existingType) {
      return {
        success: false,
        error: 'Configurazione tipo documento non trovata',
      };
    }
    
    // ✅ Verifica che appartenga all'organizzazione corrente
    verifyOrganizationAccess(ctx, existingType);

    // 4. Verifica che non ci siano documenti associati
    const documentsCount = await prisma.document.count({
      where: {
        documentTypeId: id,
      },
    });

    if (documentsCount > 0) {
      return {
        success: false,
        error: `Impossibile eliminare: ci sono ${documentsCount} documento/i associati a questa configurazione`,
      };
    }

    // 5. Eliminazione configurazione
    await prisma.documentTypeConfig.delete({
      where: { id },
    });

    // 6. Revalidazione cache
    revalidatePath('/settings/document-types');

    return {
      success: true,
      data: { id },
    };
  } catch (error) {
    console.error('Errore eliminazione configurazione tipo documento:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante l\'eliminazione della configurazione tipo documento',
    };
  }
}
