/**
 * Schemi Zod per Anagrafica Prodotti
 * 
 * Validazione per creazione e aggiornamento prodotti
 * 
 * REGOLE ERP:
 * - Prezzo sempre come stringa (convertito a Decimal)
 * - vatRateId opzionale (riferimento ad aliquota IVA)
 * - categoryId e typeId opzionali (classificazioni)
 */

import { z } from 'zod';
import { Decimal } from 'decimal.js';

/**
 * Schema per validazione prezzo (stringa che rappresenta un Decimal)
 * 
 * Accetta:
 * - "19.99" (2 decimali)
 * - "100" (senza decimali)
 * - "0.50" (meno di 1)
 * 
 * NON accetta:
 * - "19.999" (più di 2 decimali)
 * - "abc" (non numerico)
 */
const priceSchema = z
  .string()
  .min(1, 'Prezzo obbligatorio')
  .regex(/^\d+(\.\d{1,2})?$/, 'Prezzo non valido (formato: 19.99 o 100)')
  .refine(
    (val) => {
      try {
        const decimal = new Decimal(val);
        return decimal.gte(0); // Prezzo >= 0
      } catch {
        return false;
      }
    },
    {
      message: 'Prezzo deve essere un numero positivo',
    }
  );

/**
 * Schema per creazione prodotto
 */
export const createProductSchema = z.object({
  code: z
    .string()
    .min(1, 'Codice articolo obbligatorio')
    .max(50, 'Codice articolo troppo lungo')
    .regex(/^[A-Z0-9-_]+$/, 'Codice può contenere solo lettere maiuscole, numeri, - e _')
    .transform((val) => val.trim().toUpperCase()),

  name: z
    .string()
    .min(2, 'Nome prodotto deve contenere almeno 2 caratteri')
    .max(255, 'Nome prodotto troppo lungo')
    .transform((val) => val.trim()),

  description: z
    .string()
    .max(5000, 'Descrizione troppo lunga')
    .optional()
    .or(z.literal(''))
    .transform((val) => (val && val.trim() !== '' ? val.trim() : undefined)),

  // Classificazioni (opzionali)
  categoryId: z.string().cuid().optional().or(z.literal('')),
  typeId: z.string().cuid().optional().or(z.literal('')),

  // Prezzo (obbligatorio, sempre Decimal)
  price: priceSchema,

  // IVA predefinita (opzionale)
  vatRateId: z.string().cuid().optional().or(z.literal('')),

  // Magazzino predefinito (opzionale)
  // Se specificato, viene usato quando si crea un documento (priorità sul magazzino documento)
  defaultWarehouseId: z.string().cuid().optional().or(z.literal('')),

  // Metadata
  active: z.boolean().default(true),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

/**
 * Schema per aggiornamento prodotto
 * 
 * Tutti i campi sono opzionali tranne l'id
 */
export const updateProductSchema = z.object({
  id: z.string().cuid(),

  code: z
    .string()
    .min(1, 'Codice articolo obbligatorio')
    .max(50, 'Codice articolo troppo lungo')
    .regex(/^[A-Z0-9-_]+$/, 'Codice può contenere solo lettere maiuscole, numeri, - e _')
    .transform((val) => val.trim().toUpperCase())
    .optional(),

  name: z
    .string()
    .min(2, 'Nome prodotto deve contenere almeno 2 caratteri')
    .max(255, 'Nome prodotto troppo lungo')
    .transform((val) => val.trim())
    .optional(),

  description: z
    .string()
    .max(5000, 'Descrizione troppo lunga')
    .optional()
    .or(z.literal(''))
    .transform((val) => (val && val.trim() !== '' ? val.trim() : undefined)),

  // Classificazioni (opzionali)
  categoryId: z.string().cuid().optional().or(z.literal('')).optional(),
  typeId: z.string().cuid().optional().or(z.literal('')).optional(),

  // Prezzo (opzionale)
  price: priceSchema.optional(),

  // IVA predefinita (opzionale)
  vatRateId: z.string().cuid().optional().or(z.literal('')).optional(),

  // Magazzino predefinito (opzionale)
  defaultWarehouseId: z.string().cuid().optional().or(z.literal('')).optional(),

  // Metadata
  active: z.boolean().optional(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;
