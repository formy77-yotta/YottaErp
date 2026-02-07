/**
 * Schemi Zod per Categorie Articoli
 * 
 * Validazione per creazione e aggiornamento categorie prodotti
 */

import { z } from 'zod';

/**
 * Schema per creazione categoria articolo
 */
export const createProductCategorySchema = z.object({
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
  active: z.boolean().default(true),
});

export type CreateProductCategoryInput = z.infer<typeof createProductCategorySchema>;

/**
 * Schema per aggiornamento categoria articolo
 */
export const updateProductCategorySchema = z.object({
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
  active: z.boolean().optional(),
});

export type UpdateProductCategoryInput = z.infer<typeof updateProductCategorySchema>;
