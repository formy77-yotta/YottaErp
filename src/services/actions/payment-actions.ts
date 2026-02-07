/**
 * Server Actions per gestione Pagamenti
 * 
 * Gestisce Tipi di Pagamento (PaymentType) e Condizioni di Pagamento (PaymentCondition)
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
import { getAuthContext, canWrite, ForbiddenError } from '@/lib/auth';
import {
  createPaymentTypeSchema,
  updatePaymentTypeSchema,
  createPaymentConditionSchema,
  updatePaymentConditionSchema,
  type CreatePaymentTypeInput,
  type UpdatePaymentTypeInput,
  type CreatePaymentConditionInput,
  type UpdatePaymentConditionInput,
} from '@/schemas/payment-schema';

/**
 * Tipo di ritorno standard per Server Actions
 */
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ============================================================================
// PAYMENT TYPE ACTIONS
// ============================================================================

/**
 * Ottiene tutti i tipi di pagamento dell'organizzazione corrente
 * 
 * MULTITENANT: Filtra automaticamente per organizationId
 * 
 * @param activeOnly - Se true, restituisce solo i tipi attivi
 * @returns Array di tipi di pagamento
 */
export async function getPaymentTypesAction(
  activeOnly: boolean = false
): Promise<ActionResult<Array<{
  id: string;
  name: string;
  sdiCode: string;
  sepaCode: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}>>> {
  try {
    const ctx = await getAuthContext();

    const paymentTypes = await prisma.paymentType.findMany({
      where: {
        organizationId: ctx.organizationId,
        ...(activeOnly && { active: true }),
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      success: true,
      data: paymentTypes,
    };
  } catch (error) {
    console.error('Errore recupero tipi di pagamento:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante il recupero dei tipi di pagamento',
    };
  }
}

/**
 * Ottiene un tipo di pagamento per ID
 * 
 * MULTITENANT: Verifica che appartenga all'organizzazione corrente
 * 
 * @param id - ID del tipo di pagamento
 * @returns Tipo di pagamento o errore
 */
export async function getPaymentTypeAction(
  id: string
): Promise<ActionResult<{
  id: string;
  name: string;
  sdiCode: string;
  sepaCode: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}>> {
  try {
    const ctx = await getAuthContext();

    const paymentType = await prisma.paymentType.findFirst({
      where: {
        id,
        organizationId: ctx.organizationId,
      },
    });

    if (!paymentType) {
      return {
        success: false,
        error: 'Tipo di pagamento non trovato',
      };
    }

    return {
      success: true,
      data: paymentType,
    };
  } catch (error) {
    console.error('Errore recupero tipo di pagamento:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante il recupero del tipo di pagamento',
    };
  }
}

/**
 * Crea un nuovo tipo di pagamento
 * 
 * MULTITENANT: Il tipo viene automaticamente associato all'organizzazione corrente
 * 
 * @param input - Dati tipo di pagamento da creare
 * @returns Result con tipo creato o errore
 */
export async function createPaymentTypeAction(
  input: CreatePaymentTypeInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getAuthContext();

    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per creare tipi di pagamento',
      };
    }

    // Validazione con Zod
    const validatedData = createPaymentTypeSchema.parse(input);

    // Verifica unicità codice SDI per organizzazione
    const existingType = await prisma.paymentType.findFirst({
      where: {
        organizationId: ctx.organizationId,
        sdiCode: validatedData.sdiCode,
      },
    });

    if (existingType) {
      return {
        success: false,
        error: `Codice SDI ${validatedData.sdiCode} già esistente per questa organizzazione`,
      };
    }

    // Creazione tipo di pagamento
    const paymentType = await prisma.paymentType.create({
      data: {
        organizationId: ctx.organizationId,
        name: validatedData.name,
        sdiCode: validatedData.sdiCode,
        sepaCode: validatedData.sepaCode && validatedData.sepaCode.trim() !== ''
          ? validatedData.sepaCode
          : null,
        active: validatedData.active,
      },
    });

    // Revalidazione cache
    revalidatePath('/settings/payments');

    return {
      success: true,
      data: { id: paymentType.id },
    };
  } catch (error) {
    console.error('Errore creazione tipo di pagamento:', error);

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
      error: 'Errore sconosciuto durante la creazione del tipo di pagamento',
    };
  }
}

/**
 * Aggiorna un tipo di pagamento
 * 
 * MULTITENANT: Verifica che appartenga all'organizzazione corrente
 * 
 * @param input - Dati tipo di pagamento da aggiornare
 * @returns Result con tipo aggiornato o errore
 */
export async function updatePaymentTypeAction(
  input: UpdatePaymentTypeInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getAuthContext();

    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per aggiornare tipi di pagamento',
      };
    }

    // Validazione con Zod
    const validatedData = updatePaymentTypeSchema.parse(input);

    // Verifica esistenza e appartenenza all'organizzazione
    const existingType = await prisma.paymentType.findFirst({
      where: {
        id: validatedData.id,
        organizationId: ctx.organizationId,
      },
    });

    if (!existingType) {
      return {
        success: false,
        error: 'Tipo di pagamento non trovato',
      };
    }

    // Se si sta cambiando il codice SDI, verifica unicità
    if (validatedData.sdiCode && validatedData.sdiCode !== existingType.sdiCode) {
      const duplicateType = await prisma.paymentType.findFirst({
        where: {
          organizationId: ctx.organizationId,
          sdiCode: validatedData.sdiCode,
          id: { not: validatedData.id },
        },
      });

      if (duplicateType) {
        return {
          success: false,
          error: `Codice SDI ${validatedData.sdiCode} già esistente per questa organizzazione`,
        };
      }
    }

    // Aggiornamento
    await prisma.paymentType.update({
      where: { id: validatedData.id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.sdiCode && { sdiCode: validatedData.sdiCode }),
        ...(validatedData.sepaCode !== undefined && {
          sepaCode: validatedData.sepaCode && validatedData.sepaCode.trim() !== ''
            ? validatedData.sepaCode
            : null,
        }),
        ...(validatedData.active !== undefined && { active: validatedData.active }),
      },
    });

    // Revalidazione cache
    revalidatePath('/settings/payments');

    return {
      success: true,
      data: { id: validatedData.id },
    };
  } catch (error) {
    console.error('Errore aggiornamento tipo di pagamento:', error);

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
      error: 'Errore sconosciuto durante l\'aggiornamento del tipo di pagamento',
    };
  }
}

/**
 * Elimina un tipo di pagamento
 * 
 * MULTITENANT: Verifica che appartenga all'organizzazione corrente
 * 
 * @param id - ID del tipo di pagamento da eliminare
 * @returns Result con successo o errore
 */
export async function deletePaymentTypeAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getAuthContext();

    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per eliminare tipi di pagamento',
      };
    }

    // Verifica esistenza e appartenenza
    const existingType = await prisma.paymentType.findFirst({
      where: {
        id,
        organizationId: ctx.organizationId,
      },
      include: {
        conditions: true,
      },
    });

    if (!existingType) {
      return {
        success: false,
        error: 'Tipo di pagamento non trovato',
      };
    }

    // Verifica che non ci siano condizioni associate
    if (existingType.conditions.length > 0) {
      return {
        success: false,
        error: 'Impossibile eliminare: esistono condizioni di pagamento associate',
      };
    }

    // Eliminazione
    await prisma.paymentType.delete({
      where: { id },
    });

    // Revalidazione cache
    revalidatePath('/settings/payments');

    return {
      success: true,
      data: { id },
    };
  } catch (error) {
    console.error('Errore eliminazione tipo di pagamento:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante l\'eliminazione del tipo di pagamento',
    };
  }
}

// ============================================================================
// PAYMENT CONDITION ACTIONS
// ============================================================================

/**
 * Ottiene tutte le condizioni di pagamento dell'organizzazione corrente
 * 
 * MULTITENANT: Filtra automaticamente per organizationId
 * 
 * @param activeOnly - Se true, restituisce solo le condizioni attive
 * @param paymentTypeId - Filtra per tipo di pagamento (opzionale)
 * @returns Array di condizioni di pagamento
 */
export async function getPaymentConditionsAction(
  activeOnly: boolean = false,
  paymentTypeId?: string
): Promise<ActionResult<Array<{
  id: string;
  name: string;
  paymentTypeId: string;
  paymentType: {
    id: string;
    name: string;
    sdiCode: string;
  };
  daysToFirstDue: number;
  gapBetweenDues: number;
  numberOfDues: number;
  isEndOfMonth: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}>>> {
  try {
    const ctx = await getAuthContext();

    const conditions = await prisma.paymentCondition.findMany({
      where: {
        organizationId: ctx.organizationId,
        ...(activeOnly && { active: true }),
        ...(paymentTypeId && { paymentTypeId }),
      },
      include: {
        paymentType: {
          select: {
            id: true,
            name: true,
            sdiCode: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      success: true,
      data: conditions,
    };
  } catch (error) {
    console.error('Errore recupero condizioni di pagamento:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante il recupero delle condizioni di pagamento',
    };
  }
}

/**
 * Ottiene una condizione di pagamento per ID
 * 
 * MULTITENANT: Verifica che appartenga all'organizzazione corrente
 * 
 * @param id - ID della condizione di pagamento
 * @returns Condizione di pagamento o errore
 */
export async function getPaymentConditionAction(
  id: string
): Promise<ActionResult<{
  id: string;
  name: string;
  paymentTypeId: string;
  paymentType: {
    id: string;
    name: string;
    sdiCode: string;
  };
  daysToFirstDue: number;
  gapBetweenDues: number;
  numberOfDues: number;
  isEndOfMonth: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}>> {
  try {
    const ctx = await getAuthContext();

    const condition = await prisma.paymentCondition.findFirst({
      where: {
        id,
        organizationId: ctx.organizationId,
      },
      include: {
        paymentType: {
          select: {
            id: true,
            name: true,
            sdiCode: true,
          },
        },
      },
    });

    if (!condition) {
      return {
        success: false,
        error: 'Condizione di pagamento non trovata',
      };
    }

    return {
      success: true,
      data: condition,
    };
  } catch (error) {
    console.error('Errore recupero condizione di pagamento:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante il recupero della condizione di pagamento',
    };
  }
}

/**
 * Crea una nuova condizione di pagamento
 * 
 * MULTITENANT: La condizione viene automaticamente associata all'organizzazione corrente
 * 
 * @param input - Dati condizione di pagamento da creare
 * @returns Result con condizione creata o errore
 */
export async function createPaymentConditionAction(
  input: CreatePaymentConditionInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getAuthContext();

    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per creare condizioni di pagamento',
      };
    }

    // Validazione con Zod
    const validatedData = createPaymentConditionSchema.parse(input);

    // Verifica che il PaymentType appartenga all'organizzazione
    const paymentType = await prisma.paymentType.findFirst({
      where: {
        id: validatedData.paymentTypeId,
        organizationId: ctx.organizationId,
      },
    });

    if (!paymentType) {
      return {
        success: false,
        error: 'Tipo di pagamento non trovato',
      };
    }

    // Verifica unicità nome per organizzazione
    const existingCondition = await prisma.paymentCondition.findFirst({
      where: {
        organizationId: ctx.organizationId,
        name: validatedData.name,
      },
    });

    if (existingCondition) {
      return {
        success: false,
        error: 'Condizione di pagamento con questo nome già esistente',
      };
    }

    // Creazione condizione di pagamento
    const condition = await prisma.paymentCondition.create({
      data: {
        organizationId: ctx.organizationId,
        name: validatedData.name,
        paymentTypeId: validatedData.paymentTypeId,
        daysToFirstDue: validatedData.daysToFirstDue,
        gapBetweenDues: validatedData.gapBetweenDues,
        numberOfDues: validatedData.numberOfDues,
        isEndOfMonth: validatedData.isEndOfMonth,
        active: validatedData.active,
      },
    });

    // Revalidazione cache
    revalidatePath('/settings/payments');

    return {
      success: true,
      data: { id: condition.id },
    };
  } catch (error) {
    console.error('Errore creazione condizione di pagamento:', error);

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
      error: 'Errore sconosciuto durante la creazione della condizione di pagamento',
    };
  }
}

/**
 * Aggiorna una condizione di pagamento
 * 
 * MULTITENANT: Verifica che appartenga all'organizzazione corrente
 * 
 * @param input - Dati condizione di pagamento da aggiornare
 * @returns Result con condizione aggiornata o errore
 */
export async function updatePaymentConditionAction(
  input: UpdatePaymentConditionInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getAuthContext();

    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per aggiornare condizioni di pagamento',
      };
    }

    // Validazione con Zod
    const validatedData = updatePaymentConditionSchema.parse(input);

    // Verifica esistenza e appartenenza all'organizzazione
    const existingCondition = await prisma.paymentCondition.findFirst({
      where: {
        id: validatedData.id,
        organizationId: ctx.organizationId,
      },
    });

    if (!existingCondition) {
      return {
        success: false,
        error: 'Condizione di pagamento non trovata',
      };
    }

    // Se si sta cambiando il PaymentType, verifica che appartenga all'organizzazione
    if (validatedData.paymentTypeId) {
      const paymentType = await prisma.paymentType.findFirst({
        where: {
          id: validatedData.paymentTypeId,
          organizationId: ctx.organizationId,
        },
      });

      if (!paymentType) {
        return {
          success: false,
          error: 'Tipo di pagamento non trovato',
        };
      }
    }

    // Se si sta cambiando il nome, verifica unicità
    if (validatedData.name && validatedData.name !== existingCondition.name) {
      const duplicateCondition = await prisma.paymentCondition.findFirst({
        where: {
          organizationId: ctx.organizationId,
          name: validatedData.name,
          id: { not: validatedData.id },
        },
      });

      if (duplicateCondition) {
        return {
          success: false,
          error: 'Condizione di pagamento con questo nome già esistente',
        };
      }
    }

    // Aggiornamento
    await prisma.paymentCondition.update({
      where: { id: validatedData.id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.paymentTypeId && { paymentTypeId: validatedData.paymentTypeId }),
        ...(validatedData.daysToFirstDue !== undefined && { daysToFirstDue: validatedData.daysToFirstDue }),
        ...(validatedData.gapBetweenDues !== undefined && { gapBetweenDues: validatedData.gapBetweenDues }),
        ...(validatedData.numberOfDues !== undefined && { numberOfDues: validatedData.numberOfDues }),
        ...(validatedData.isEndOfMonth !== undefined && { isEndOfMonth: validatedData.isEndOfMonth }),
        ...(validatedData.active !== undefined && { active: validatedData.active }),
      },
    });

    // Revalidazione cache
    revalidatePath('/settings/payments');

    return {
      success: true,
      data: { id: validatedData.id },
    };
  } catch (error) {
    console.error('Errore aggiornamento condizione di pagamento:', error);

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
      error: 'Errore sconosciuto durante l\'aggiornamento della condizione di pagamento',
    };
  }
}

/**
 * Elimina una condizione di pagamento
 * 
 * MULTITENANT: Verifica che appartenga all'organizzazione corrente
 * 
 * @param id - ID della condizione di pagamento da eliminare
 * @returns Result con successo o errore
 */
export async function deletePaymentConditionAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getAuthContext();

    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per eliminare condizioni di pagamento',
      };
    }

    // Verifica esistenza e appartenenza
    const existingCondition = await prisma.paymentCondition.findFirst({
      where: {
        id,
        organizationId: ctx.organizationId,
      },
      include: {
        documents: true,
      },
    });

    if (!existingCondition) {
      return {
        success: false,
        error: 'Condizione di pagamento non trovata',
      };
    }

    // Verifica che non ci siano documenti associati
    if (existingCondition.documents.length > 0) {
      return {
        success: false,
        error: 'Impossibile eliminare: esistono documenti associati a questa condizione',
      };
    }

    // Eliminazione
    await prisma.paymentCondition.delete({
      where: { id },
    });

    // Revalidazione cache
    revalidatePath('/settings/payments');

    return {
      success: true,
      data: { id },
    };
  } catch (error) {
    console.error('Errore eliminazione condizione di pagamento:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante l\'eliminazione della condizione di pagamento',
    };
  }
}

/**
 * Carica tipi di pagamento standard SDI/SEPA per una nuova organizzazione
 * 
 * MULTITENANT: I tipi vengono associati all'organizzazione corrente
 * 
 * @returns Result con numero di tipi creati
 */
export async function seedDefaultPaymentTypesAction(): Promise<ActionResult<{ count: number }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per creare tipi di pagamento',
      };
    }

    // 3. Verifica se esistono già tipi di pagamento per questa organizzazione
    const existingCount = await prisma.paymentType.count({
      where: {
        organizationId: ctx.organizationId,
      },
    });

    if (existingCount > 0) {
      return {
        success: false,
        error: 'Tipi di pagamento già presenti per questa organizzazione',
      };
    }

    // 4. Tipi di pagamento standard SDI/SEPA
    const defaultPaymentTypes = [
      {
        name: 'Contanti',
        sdiCode: 'MP01',
        sepaCode: null,
        active: true,
      },
      {
        name: 'Assegno',
        sdiCode: 'MP02',
        sepaCode: null,
        active: true,
      },
      {
        name: 'Assegno Circolare',
        sdiCode: 'MP03',
        sepaCode: null,
        active: true,
      },
      {
        name: 'Contanti presso Tesoreria',
        sdiCode: 'MP04',
        sepaCode: null,
        active: true,
      },
      {
        name: 'Bonifico',
        sdiCode: 'MP05',
        sepaCode: 'TRF', // SEPA Credit Transfer
        active: true,
      },
      {
        name: 'Vaglia Cambiario',
        sdiCode: 'MP06',
        sepaCode: null,
        active: true,
      },
      {
        name: 'Bollettino Bancario',
        sdiCode: 'MP07',
        sepaCode: null,
        active: true,
      },
      {
        name: 'Carta di Pagamento',
        sdiCode: 'MP08',
        sepaCode: null,
        active: true,
      },
      {
        name: 'RID',
        sdiCode: 'MP09',
        sepaCode: null,
        active: true,
      },
      {
        name: 'RID Utenze',
        sdiCode: 'MP10',
        sepaCode: null,
        active: true,
      },
      {
        name: 'RiBa',
        sdiCode: 'MP12',
        sepaCode: 'OXI', // SEPA Credit Transfer (RiBa)
        active: true,
      },
      {
        name: 'MAV',
        sdiCode: 'MP13',
        sepaCode: null,
        active: true,
      },
      {
        name: 'Giroconto su Conti di Contabilità Speciale',
        sdiCode: 'MP15',
        sepaCode: null,
        active: true,
      },
      {
        name: 'Domiciliazione Bancaria',
        sdiCode: 'MP16',
        sepaCode: null,
        active: true,
      },
      {
        name: 'Domiciliazione Postale',
        sdiCode: 'MP17',
        sepaCode: null,
        active: true,
      },
      {
        name: 'Bollettino di C/C Postale',
        sdiCode: 'MP18',
        sepaCode: null,
        active: true,
      },
      {
        name: 'SEPA Direct Debit Core',
        sdiCode: 'MP19',
        sepaCode: 'DD', // SEPA Direct Debit Core
        active: true,
      },
      {
        name: 'SEPA Direct Debit B2B',
        sdiCode: 'MP20',
        sepaCode: 'DD', // SEPA Direct Debit B2B
        active: true,
      },
      {
        name: 'SEPA Direct Debit',
        sdiCode: 'MP21',
        sepaCode: 'DD', // SEPA Direct Debit
        active: true,
      },
      {
        name: 'PagoPA',
        sdiCode: 'MP23',
        sepaCode: null,
        active: true,
      },
    ];

    // 5. Crea tutti i tipi in transazione
    await prisma.$transaction(
      defaultPaymentTypes.map((type) =>
        prisma.paymentType.create({
          data: {
            organizationId: ctx.organizationId,
            name: type.name,
            sdiCode: type.sdiCode,
            sepaCode: type.sepaCode,
            active: type.active,
          },
        })
      )
    );

    // 6. Revalidazione cache
    revalidatePath('/settings/payments');

    return {
      success: true,
      data: { count: defaultPaymentTypes.length },
    };
  } catch (error) {
    console.error('Errore caricamento tipi di pagamento standard:', error);

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
      error: 'Errore sconosciuto durante il caricamento dei tipi di pagamento standard',
    };
  }
}
