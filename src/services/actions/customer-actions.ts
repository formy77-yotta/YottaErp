'use server';

/**
 * Server Actions per gestione clienti
 * 
 * Le Server Actions sono il modo raccomandato in Next.js 14
 * per gestire mutazioni e operazioni server-side.
 * 
 * RESPONSABILITÀ:
 * 1. Validazione input con Zod
 * 2. Chiamata a business logic
 * 3. Revalidazione cache Next.js
 * 4. Gestione errori e return type-safe
 */

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
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
 * @param input - Dati cliente da creare
 * @returns Result con cliente creato o errore
 */
export async function createCustomerAction(
  input: CreateCustomerInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. Validazione con Zod
    const validatedData = createCustomerSchema.parse(input);

    // 2. Creazione cliente nel database
    const customer = await prisma.customer.create({
      data: {
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

    // 3. Revalidazione cache Next.js
    revalidatePath('/customers');

    return {
      success: true,
      data: { id: customer.id },
    };
  } catch (error) {
    console.error('Errore creazione cliente:', error);

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
 * @param input - Dati cliente da aggiornare (include id)
 * @returns Result con successo o errore
 */
export async function updateCustomerAction(
  input: UpdateCustomerInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. Validazione con Zod
    const validatedData = updateCustomerSchema.parse(input);

    // 2. Verifica esistenza cliente
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: validatedData.id },
    });

    if (!existingCustomer) {
      return {
        success: false,
        error: 'Cliente non trovato',
      };
    }

    // 3. Aggiornamento cliente
    const updatedCustomer = await prisma.customer.update({
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

    // 4. Revalidazione cache
    revalidatePath('/customers');
    revalidatePath(`/customers/${validatedData.id}`);

    return {
      success: true,
      data: { id: updatedCustomer.id },
    };
  } catch (error) {
    console.error('Errore aggiornamento cliente:', error);

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
 * @param id - ID del cliente da eliminare
 * @returns Result con successo o errore
 */
export async function deleteCustomerAction(
  id: string
): Promise<ActionResult<void>> {
  try {
    // Verifica esistenza
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return {
        success: false,
        error: 'Cliente non trovato',
      };
    }

    // Soft delete (imposta active = false)
    await prisma.customer.update({
      where: { id },
      data: { active: false },
    });

    // Revalidazione cache
    revalidatePath('/customers');

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error('Errore eliminazione cliente:', error);

    return {
      success: false,
      error: 'Errore durante l\'eliminazione del cliente',
    };
  }
}
