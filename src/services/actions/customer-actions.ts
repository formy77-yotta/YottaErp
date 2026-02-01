'use server';

/**
 * Server Actions per gestione clienti
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
import { createCustomerSchema, updateCustomerSchema } from '@/schemas/entity-schema';
import type { CreateCustomerInput, UpdateCustomerInput } from '@/schemas/entity-schema';

/**
 * Tipo di ritorno standard per Server Actions
 */
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Crea un nuovo cliente
 * 
 * MULTITENANT: Il cliente viene automaticamente associato all'organizzazione corrente
 * 
 * @param input - Dati cliente da creare
 * @returns Result con cliente creato o errore
 */
export async function createCustomerAction(
  input: CreateCustomerInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione (include organizationId)
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per creare clienti',
      };
    }

    // 3. Validazione con Zod
    const validatedData = createCustomerSchema.parse(input);

    // 4. ✅ Creazione cliente con organizationId
    const customer = await prisma.entity.create({
      data: {
        organizationId: ctx.organizationId, // ✅ Associa automaticamente all'organizzazione
        type: 'CLIENT',
        businessName: validatedData.businessName,
        vatNumber: validatedData.vatNumber,
        fiscalCode: validatedData.fiscalCode,
        address: validatedData.address,
        city: validatedData.city,
        province: validatedData.province,
        zipCode: validatedData.zipCode,
        country: validatedData.country,
        email: validatedData.email || null,
        pec: validatedData.pec || null,
        phone: validatedData.phone || null,
        sdiCode: validatedData.sdiCode || null,
        notes: validatedData.notes || null,
        active: validatedData.active,
      },
    });

    // 5. Revalidazione cache Next.js
    revalidatePath('/customers');

    return {
      success: true,
      data: { id: customer.id },
    };
  } catch (error) {
    console.error('Errore creazione cliente:', error);

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
      error: 'Errore sconosciuto durante la creazione del cliente',
    };
  }
}

/**
 * Aggiorna un cliente esistente
 * 
 * MULTITENANT: Verifica che il cliente appartenga all'organizzazione corrente
 * 
 * @param input - Dati cliente da aggiornare (include id)
 * @returns Result con successo o errore
 */
export async function updateCustomerAction(
  input: UpdateCustomerInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per modificare clienti',
      };
    }

    // 3. Validazione con Zod
    const validatedData = updateCustomerSchema.parse(input);

    // 4. ✅ Verifica esistenza E appartenenza all'organizzazione
    const existingCustomer = await prisma.entity.findUnique({
      where: { id: validatedData.id },
      select: { id: true, organizationId: true },
    });

    if (!existingCustomer) {
      return {
        success: false,
        error: 'Cliente non trovato',
      };
    }
    
    // ✅ Verifica che appartenga all'organizzazione corrente
    verifyOrganizationAccess(ctx, existingCustomer);

    // 5. Aggiornamento cliente
    const updatedCustomer = await prisma.entity.update({
      where: { id: validatedData.id },
      data: {
        ...(validatedData.businessName && { businessName: validatedData.businessName }),
        ...(validatedData.vatNumber && { vatNumber: validatedData.vatNumber }),
        ...(validatedData.fiscalCode && { fiscalCode: validatedData.fiscalCode }),
        ...(validatedData.address && { address: validatedData.address }),
        ...(validatedData.city && { city: validatedData.city }),
        ...(validatedData.province && { province: validatedData.province }),
        ...(validatedData.zipCode && { zipCode: validatedData.zipCode }),
        ...(validatedData.country && { country: validatedData.country }),
        ...(validatedData.email !== undefined && { email: validatedData.email || null }),
        ...(validatedData.pec !== undefined && { pec: validatedData.pec || null }),
        ...(validatedData.phone !== undefined && { phone: validatedData.phone || null }),
        ...(validatedData.sdiCode !== undefined && { sdiCode: validatedData.sdiCode || null }),
        ...(validatedData.notes !== undefined && { notes: validatedData.notes || null }),
        ...(validatedData.active !== undefined && { active: validatedData.active }),
      },
    });

    // 6. Revalidazione cache
    revalidatePath('/customers');
    revalidatePath(`/customers/${validatedData.id}`);

    return {
      success: true,
      data: { id: updatedCustomer.id },
    };
  } catch (error) {
    console.error('Errore aggiornamento cliente:', error);

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
      error: 'Errore sconosciuto durante l\'aggiornamento del cliente',
    };
  }
}

/**
 * Elimina un cliente (soft delete)
 * 
 * MULTITENANT: Verifica che il cliente appartenga all'organizzazione corrente
 * 
 * @param id - ID del cliente da eliminare
 * @returns Result con successo o errore
 */
export async function deleteCustomerAction(
  id: string
): Promise<ActionResult<void>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per eliminare clienti',
      };
    }

    // 3. ✅ Verifica esistenza E appartenenza all'organizzazione
    const customer = await prisma.entity.findUnique({
      where: { id },
      select: { id: true, organizationId: true },
    });

    if (!customer) {
      return {
        success: false,
        error: 'Cliente non trovato',
      };
    }
    
    // ✅ Verifica che appartenga all'organizzazione corrente
    verifyOrganizationAccess(ctx, customer);

    // 4. Soft delete (imposta active = false)
    await prisma.entity.update({
      where: { id },
      data: { active: false },
    });

    // 5. Revalidazione cache
    revalidatePath('/customers');

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error('Errore eliminazione cliente:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante l\'eliminazione del cliente',
    };
  }
}
