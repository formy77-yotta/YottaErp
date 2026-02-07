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
 *   → Se attivo, si sblocca operationSignStock (+1 incremento, -1 decremento)
 * - valuationImpact: se true, il documento impatta costi/ricavi (es. Fattura, Nota Credito)
 *   → Se attivo, si sblocca operationSignValuation (+1 incremento, -1 decremento)
 * 
 * I due segni operazione sono indipendenti e controllano comportamenti diversi:
 * - operationSignStock: controlla direzione movimenti magazzino
 * - operationSignValuation: controlla direzione impatto contabile
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
  operationSignStock: number | null;
  operationSignValuation: number | null;
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
        operationSignStock: true,
        operationSignValuation: true,
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
        operationSignStock: validatedData.inventoryMovement ? validatedData.operationSignStock : null,
        operationSignValuation: validatedData.valuationImpact ? validatedData.operationSignValuation : null,
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
        ...(validatedData.inventoryMovement !== undefined && {
          operationSignStock: validatedData.inventoryMovement 
            ? validatedData.operationSignStock ?? null
            : null
        }),
        ...(validatedData.valuationImpact !== undefined && {
          operationSignValuation: validatedData.valuationImpact 
            ? validatedData.operationSignValuation ?? null
            : null
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

/**
 * Carica configurazioni tipi documento standard per una nuova organizzazione
 * 
 * MULTITENANT: Le configurazioni vengono associate all'organizzazione corrente
 * 
 * @returns Result con numero di configurazioni create
 */
export async function seedDefaultDocumentTypesAction(): Promise<ActionResult<{ count: number }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per creare configurazioni tipi documento',
      };
    }

    // 3. Configurazioni tipi documento standard
    const defaultTypes = [
      {
        code: 'PRO',
        description: 'Preventivo',
        numeratorCode: 'PRO',
        inventoryMovement: false,
        valuationImpact: false,
        operationSignStock: null as number | null,
        operationSignValuation: null as number | null,
        active: true,
      },
      {
        code: 'ORD',
        description: 'Ordine',
        numeratorCode: 'ORD',
        inventoryMovement: false,
        valuationImpact: false,
        operationSignStock: null as number | null,
        operationSignValuation: null as number | null,
        active: true,
      },
      {
        code: 'DDT',
        description: 'DDT Vendita',
        numeratorCode: 'DDT',
        inventoryMovement: true,
        valuationImpact: false,
        operationSignStock: -1, // Scarico magazzino
        operationSignValuation: null as number | null,
        active: true,
      },
      {
        code: 'FAI',
        description: 'Fattura Immediata',
        numeratorCode: 'FAT',
        inventoryMovement: true,
        valuationImpact: true,
        operationSignStock: -1, // Scarico magazzino
        operationSignValuation: 1, // Incremento ricavi
        active: true,
      },
      {
        code: 'FAD',
        description: 'Fattura Differita',
        numeratorCode: 'FAT',
        inventoryMovement: false,
        valuationImpact: true,
        operationSignStock: null as number | null,
        operationSignValuation: 1, // Incremento ricavi
        active: true,
      },
      {
        code: 'NDC',
        description: 'Nota di Credito',
        numeratorCode: 'FAT',
        inventoryMovement: true,
        valuationImpact: true,
        operationSignStock: 1, // Carico magazzino (reso)
        operationSignValuation: -1, // Decremento ricavi
        active: true,
      },
    ];

    // 4. Crea tutte le configurazioni usando upsert per evitare duplicati
    let createdCount = 0;
    
    for (const type of defaultTypes) {
      const result = await prisma.documentTypeConfig.upsert({
        where: {
          organizationId_code: {
            organizationId: ctx.organizationId,
            code: type.code,
          },
        },
        update: {
          // Se esiste già, aggiorna solo se necessario
          description: type.description,
          numeratorCode: type.numeratorCode,
          inventoryMovement: type.inventoryMovement,
          valuationImpact: type.valuationImpact,
          operationSignStock: type.operationSignStock,
          operationSignValuation: type.operationSignValuation,
          active: type.active,
        },
        create: {
          organizationId: ctx.organizationId,
          code: type.code,
          description: type.description,
          numeratorCode: type.numeratorCode,
          inventoryMovement: type.inventoryMovement,
          valuationImpact: type.valuationImpact,
          operationSignStock: type.operationSignStock,
          operationSignValuation: type.operationSignValuation,
          active: type.active,
        },
      });
      
      console.log(`✅ Configurazione tipo documento "${type.code}" - ${type.description} creata/aggiornata`);
      createdCount++;
    }

    // 5. Revalidazione cache
    revalidatePath('/settings/document-types');

    return {
      success: true,
      data: { count: createdCount },
    };
  } catch (error) {
    console.error('Errore caricamento configurazioni tipi documento standard:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante il caricamento delle configurazioni tipi documento standard',
    };
  }
}