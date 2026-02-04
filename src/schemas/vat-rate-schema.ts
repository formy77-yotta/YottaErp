/**
 * Schemi Zod per Aliquote IVA
 * 
 * Validazione per creazione e aggiornamento aliquote IVA
 */

import { z } from 'zod';
import { Decimal } from 'decimal.js';

/**
 * Codici natura SDI per fatturazione elettronica
 * N1 = Esclusa art. 15
 * N2 = Non soggetta
 * N3 = Non imponibile
 * N4 = Esente
 * N5 = Regime del margine
 * N6 = Reverse charge
 * N7 = IVA assolta in altro stato UE
 */
export const vatNatureSchema = z.enum(['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7'], {
  errorMap: () => ({ message: 'Codice natura non valido (N1-N7)' }),
}).optional();

/**
 * Schema per valore aliquota IVA
 * 
 * Accetta valori come "22" (percentuale) e li converte in Decimal 0.2200
 * BUSINESS RULE: Il valore inserito come "22" viene salvato come 0.2200 nel DB
 */
export const vatValueSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Valore deve essere un numero (es. 22 o 22.5)')
  .transform((val) => {
    // Converte "22" in "0.22" (percentuale a decimale)
    const num = parseFloat(val);
    if (num > 100) {
      throw new Error('Valore aliquota non può essere maggiore di 100%');
    }
    // Converte percentuale in decimale: 22 -> 0.22 usando Decimal.js
    const decimal = new Decimal(num).div(100);
    // Ritorna stringa con 4 decimali: "0.2200" per conformità DB Decimal(5,4)
    return decimal.toFixed(4);
  });

/**
 * Schema per creazione aliquota IVA
 */
export const createVatRateSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve contenere almeno 2 caratteri')
    .max(100, 'Nome troppo lungo'),
  value: vatValueSchema,
  nature: vatNatureSchema,
  description: z.string().max(500, 'Descrizione troppo lunga').optional().or(z.literal('')),
  isDefault: z.boolean().default(false),
  active: z.boolean().default(true),
});

export type CreateVatRateInput = z.infer<typeof createVatRateSchema>;

/**
 * Schema per aggiornamento aliquota IVA
 */
export const updateVatRateSchema = z.object({
  id: z.string().cuid(),
  name: z
    .string()
    .min(2, 'Nome deve contenere almeno 2 caratteri')
    .max(100, 'Nome troppo lungo')
    .optional(),
  value: vatValueSchema.optional(),
  nature: vatNatureSchema,
  description: z.string().max(500, 'Descrizione troppo lunga').optional().or(z.literal('')).optional(),
  isDefault: z.boolean().optional(),
  active: z.boolean().optional(),
});

export type UpdateVatRateInput = z.infer<typeof updateVatRateSchema>;
