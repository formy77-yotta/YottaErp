/**
 * Schemi Zod per Anagrafica Magazzini
 * 
 * Validazione per creazione e aggiornamento magazzini.
 */

import { z } from 'zod';

/**
 * Schema per creazione magazzino
 */
export const createWarehouseSchema = z.object({
  code: z
    .string()
    .min(1, 'Codice magazzino obbligatorio')
    .max(20, 'Codice troppo lungo (max 20 caratteri)')
    .regex(/^[A-Z0-9_]+$/, 'Codice può contenere solo lettere maiuscole, numeri e underscore'),
  name: z
    .string()
    .min(2, 'Nome magazzino deve contenere almeno 2 caratteri')
    .max(200, 'Nome troppo lungo (max 200 caratteri)'),
  address: z
    .string()
    .max(500, 'Indirizzo troppo lungo (max 500 caratteri)')
    .optional()
    .nullable(),
});

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;

/**
 * Schema per aggiornamento magazzino
 */
export const updateWarehouseSchema = z.object({
  id: z.string().cuid('ID magazzino non valido'),
  code: z
    .string()
    .min(1, 'Codice magazzino obbligatorio')
    .max(20, 'Codice troppo lungo (max 20 caratteri)')
    .regex(/^[A-Z0-9_]+$/, 'Codice può contenere solo lettere maiuscole, numeri e underscore')
    .optional(),
  name: z
    .string()
    .min(2, 'Nome magazzino deve contenere almeno 2 caratteri')
    .max(200, 'Nome troppo lungo (max 200 caratteri)')
    .optional(),
  address: z
    .string()
    .max(500, 'Indirizzo troppo lungo (max 500 caratteri)')
    .optional()
    .nullable(),
});

export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;
