/**
 * Server Actions per gestione Aliquote IVA
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
import { createVatRateSchema, updateVatRateSchema } from '@/schemas/vat-rate-schema';
import type { CreateVatRateInput, UpdateVatRateInput } from '@/schemas/vat-rate-schema';

/**
 * Tipo di ritorno standard per Server Actions
 */
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Ottiene tutte le aliquote IVA dell'organizzazione corrente
 * 
 * MULTITENANT: Filtra automaticamente per organizationId
 * 
 * @returns Array di aliquote IVA
 */
export async function getVatRatesAction(): Promise<ActionResult<Array<{
  id: string;
  name: string;
  value: string; // Decimal come stringa per il frontend
  nature: string | null;
  description: string | null;
  active: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}>>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione (include organizationId)
    const ctx = await getAuthContext();

    // 2. Recupera aliquote filtrate per organizzazione
    const vatRates = await prisma.vatRate.findMany({
      where: {
        organizationId: ctx.organizationId,
      },
      orderBy: [
        { isDefault: 'desc' }, // Default prima
        { value: 'desc' }, // Poi per valore decrescente
      ],
      select: {
        id: true,
        name: true,
        value: true, // Decimal dal DB
        nature: true,
        description: true,
        active: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 3. Converti Decimal in stringa per il frontend
    const mappedVatRates = vatRates.map((rate) => ({
      ...rate,
      value: rate.value.toString(), // Decimal -> string
    }));

    return {
      success: true,
      data: mappedVatRates,
    };
  } catch (error) {
    console.error('Errore recupero aliquote IVA:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante il recupero delle aliquote IVA',
    };
  }
}

/**
 * Crea una nuova aliquota IVA
 * 
 * MULTITENANT: L'aliquota viene automaticamente associata all'organizzazione corrente
 * 
 * @param input - Dati aliquota da creare
 * @returns Result con aliquota creata o errore
 */
export async function createVatRateAction(
  input: CreateVatRateInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione (include organizationId)
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per creare aliquote IVA',
      };
    }

    // 3. Validazione con Zod
    const validatedData = createVatRateSchema.parse(input);

    // 4. Verifica unicità nome per organizzazione
    const existingRate = await prisma.vatRate.findFirst({
      where: {
        organizationId: ctx.organizationId,
        name: validatedData.name,
      },
    });

    if (existingRate) {
      return {
        success: false,
        error: 'Nome aliquota già esistente per questa organizzazione',
      };
    }

    // 5. Se questa è la default, rimuovi default dalle altre
    if (validatedData.isDefault) {
      await prisma.vatRate.updateMany({
        where: {
          organizationId: ctx.organizationId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // 6. ✅ Creazione aliquota con organizationId
    // BUSINESS RULE: validatedData.value è già una stringa "0.2200" (convertita da Zod)
    // Lo convertiamo in Decimal per il database
    const vatRate = await prisma.vatRate.create({
      data: {
        organizationId: ctx.organizationId, // ✅ Associa automaticamente all'organizzazione
        name: validatedData.name,
        value: new Decimal(validatedData.value), // ✅ Converte "0.2200" in Decimal per DB
        nature: validatedData.nature && validatedData.nature.trim() !== '' 
          ? validatedData.nature 
          : null,
        description: validatedData.description && validatedData.description.trim() !== '' 
          ? validatedData.description 
          : null,
        isDefault: validatedData.isDefault,
        active: validatedData.active,
      },
    });

    // 7. Revalidazione cache Next.js
    revalidatePath('/settings/vat-rates');

    return {
      success: true,
      data: { id: vatRate.id },
    };
  } catch (error) {
    console.error('Errore creazione aliquota IVA:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Gestione errori Prisma (es. unique constraint violation)
    if (error instanceof Error) {
      // Se è un errore di unique constraint per nome
      if (error.message.includes('organizationId_name') || error.message.includes('Unique constraint')) {
        return {
          success: false,
          error: 'Nome aliquota già esistente per questa organizzazione',
        };
      }
      
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore sconosciuto durante la creazione dell\'aliquota IVA',
    };
  }
}

/**
 * Aggiorna un'aliquota IVA esistente
 * 
 * MULTITENANT: Verifica che l'aliquota appartenga all'organizzazione corrente
 * 
 * @param input - Dati aliquota da aggiornare (include id)
 * @returns Result con successo o errore
 */
export async function updateVatRateAction(
  input: UpdateVatRateInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per modificare aliquote IVA',
      };
    }

    // 3. Validazione con Zod
    const validatedData = updateVatRateSchema.parse(input);

    // 4. ✅ Verifica esistenza E appartenenza all'organizzazione
    const existingRate = await prisma.vatRate.findUnique({
      where: { id: validatedData.id },
      select: { id: true, organizationId: true, name: true },
    });

    if (!existingRate) {
      return {
        success: false,
        error: 'Aliquota IVA non trovata',
      };
    }
    
    // ✅ Verifica che appartenga all'organizzazione corrente
    verifyOrganizationAccess(ctx, existingRate);

    // 5. Verifica unicità nome se è stato modificato
    if (validatedData.name && validatedData.name !== existingRate.name) {
      const duplicateRate = await prisma.vatRate.findFirst({
        where: {
          organizationId: ctx.organizationId,
          name: validatedData.name,
        },
      });

      if (duplicateRate && duplicateRate.id !== validatedData.id) {
        return {
          success: false,
          error: 'Nome aliquota già esistente per questa organizzazione',
        };
      }
    }

    // 6. Se questa diventa la default, rimuovi default dalle altre
    if (validatedData.isDefault === true) {
      await prisma.vatRate.updateMany({
        where: {
          organizationId: ctx.organizationId,
          isDefault: true,
          id: { not: validatedData.id },
        },
        data: {
          isDefault: false,
        },
      });
    }

    // 7. Aggiornamento aliquota
    const updatedRate = await prisma.vatRate.update({
      where: { id: validatedData.id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.value && { value: new Decimal(validatedData.value) }), // ✅ Converte stringa in Decimal
        ...(validatedData.nature !== undefined && { 
          nature: validatedData.nature && validatedData.nature.trim() !== '' 
            ? validatedData.nature 
            : null 
        }),
        ...(validatedData.description !== undefined && { 
          description: validatedData.description && validatedData.description.trim() !== '' 
            ? validatedData.description 
            : null 
        }),
        ...(validatedData.isDefault !== undefined && { isDefault: validatedData.isDefault }),
        ...(validatedData.active !== undefined && { active: validatedData.active }),
      },
    });

    // 8. Revalidazione cache
    revalidatePath('/settings/vat-rates');

    return {
      success: true,
      data: { id: updatedRate.id },
    };
  } catch (error) {
    console.error('Errore aggiornamento aliquota IVA:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (error instanceof Error) {
      // Se è un errore di unique constraint per nome
      if (error.message.includes('organizationId_name') || error.message.includes('Unique constraint')) {
        return {
          success: false,
          error: 'Nome aliquota già esistente per questa organizzazione',
        };
      }
      
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore sconosciuto durante l\'aggiornamento dell\'aliquota IVA',
    };
  }
}

/**
 * Carica aliquote IVA standard italiane per una nuova organizzazione
 * 
 * MULTITENANT: Le aliquote vengono associate all'organizzazione corrente
 * 
 * @returns Result con numero di aliquote create
 */
export async function seedDefaultVatRatesAction(): Promise<ActionResult<{ count: number }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per creare aliquote IVA',
      };
    }

    // 3. Verifica se esistono già aliquote per questa organizzazione
    const existingCount = await prisma.vatRate.count({
      where: {
        organizationId: ctx.organizationId,
      },
    });

    if (existingCount > 0) {
      return {
        success: false,
        error: 'Aliquote IVA già presenti per questa organizzazione',
      };
    }

    // 4. ✅ Recupera configurazione standard dal database (Super Admin)
    const standardConfig = await prisma.standardConfig.findFirst({
      where: {
        type: 'VAT_RATES',
        active: true,
      },
      orderBy: {
        version: 'desc',
      },
    });

    // 5. Se non esiste configurazione standard, usa fallback hardcoded
    let defaultRates: Array<{
      name: string;
      value: Decimal;
      nature: string | null;
      description: string | null;
      isDefault: boolean;
      active: boolean;
    }>;

    if (standardConfig && Array.isArray(standardConfig.data)) {
      // ✅ Usa configurazione dal database
      defaultRates = (standardConfig.data as Array<{
        name: string;
        value: string;
        nature: string | null;
        description: string | null;
        isDefault: boolean;
        active: boolean;
      }>).map((rate) => ({
        name: rate.name,
        value: new Decimal(rate.value),
        nature: rate.nature,
        description: rate.description,
        isDefault: rate.isDefault,
        active: rate.active,
      }));
    } else {
      // Fallback: Aliquote standard italiane hardcoded
      defaultRates = [
        {
          name: 'Standard 22%',
          value: new Decimal('0.2200'), // 22%
          nature: null,
          description: 'Aliquota IVA standard italiana',
          isDefault: true,
          active: true,
        },
        {
          name: 'Ridotta 10%',
          value: new Decimal('0.1000'), // 10%
          nature: null,
          description: 'Aliquota IVA ridotta',
          isDefault: false,
          active: true,
        },
        {
          name: 'Ridotta 5%',
          value: new Decimal('0.0500'), // 5%
          nature: null,
          description: 'Aliquota IVA ridotta',
          isDefault: false,
          active: true,
        },
        {
          name: 'Super Ridotta 4%',
          value: new Decimal('0.0400'), // 4%
          nature: null,
          description: 'Aliquota IVA super ridotta',
          isDefault: false,
          active: true,
        },
        {
          name: 'Esente',
          value: new Decimal('0.0000'), // 0%
          nature: 'N4',
          description: 'Operazione esente IVA',
          isDefault: false,
          active: true,
        },
      ];
    }

    // 6. Crea tutte le aliquote in transazione
    await prisma.vatRate.createMany({
      data: defaultRates.map((rate) => ({
        organizationId: ctx.organizationId,
        ...rate,
      })),
    });

    // 7. Revalidazione cache
    revalidatePath('/settings/vat-rates');

    return {
      success: true,
      data: { count: defaultRates.length },
    };
  } catch (error) {
    console.error('Errore caricamento aliquote standard:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante il caricamento delle aliquote standard',
    };
  }
}
