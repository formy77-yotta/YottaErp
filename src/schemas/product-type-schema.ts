/**
 * Schemi Zod per Tipologie Articoli
 * 
 * Validazione per creazione e aggiornamento tipologie prodotti
 */

import { z } from 'zod';

/**
 * Schema per creazione tipologia articolo
 */
export const createProductTypeSchema = z.object({
  code: z
    .string()
    .min(2, 'Codice deve contenere almeno 2 caratteri')
    .max(20, 'Codice troppo lungo')
    .regex(/^[A-Z0-9_]+$/, 'Codice può contenere solo lettere maiuscole, numeri e underscore'),
  description: z
    .string()
    .min(2, 'Descrizione deve contenere almeno 2 caratteri')
    .max(200, 'Descrizione troppo lunga'),
  manageStock: z.boolean().default(true),
  visibleInPurchase: z.boolean().default(true),
  visibleInSale: z.boolean().default(true),
  visibleInInternal: z.boolean().default(true),
  active: z.boolean().default(true),
});

export type CreateProductTypeInput = z.infer<typeof createProductTypeSchema>;

/**
 * Schema per aggiornamento tipologia articolo
 */
export const updateProductTypeSchema = z.object({
  id: z.string().cuid(),
  code: z
    .string()
    .min(2, 'Codice deve contenere almeno 2 caratteri')
    .max(20, 'Codice troppo lungo')
    .regex(/^[A-Z0-9_]+$/, 'Codice può contenere solo lettere maiuscole, numeri e underscore')
    .optional(),
  description: z
    .string()
    .min(2, 'Descrizione deve contenere almeno 2 caratteri')
    .max(200, 'Descrizione troppo lunga')
    .optional(),
  manageStock: z.boolean().optional(),
  visibleInPurchase: z.boolean().optional(),
  visibleInSale: z.boolean().optional(),
  visibleInInternal: z.boolean().optional(),
  active: z.boolean().optional(),
});

export type UpdateProductTypeInput = z.infer<typeof updateProductTypeSchema>;
