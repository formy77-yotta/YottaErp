/**
 * Schemi Zod per Unità di Misura
 * 
 * Validazione per creazione e aggiornamento unità di misura
 */

import { z } from 'zod';
import { Decimal } from 'decimal.js';

/**
 * Classi di misura supportate
 */
export const MEASURE_CLASSES = [
  'WEIGHT',    // Peso (G, KG, T)
  'LENGTH',    // Lunghezza (M, KM, CM)
  'VOLUME',    // Volume (L, ML, M3)
  'PIECE',     // Pezzi (PZ, CT, SC)
  'AREA',      // Superficie (M2, HA)
  'TIME',      // Tempo (H, MIN, SEC)
] as const;

export type MeasureClass = typeof MEASURE_CLASSES[number];

/**
 * Schema per creazione unità di misura
 */
export const createUnitOfMeasureSchema = z.object({
  code: z
    .string()
    .min(1, 'Codice obbligatorio')
    .max(10, 'Codice troppo lungo')
    .regex(/^[A-Z0-9_]+$/, 'Codice può contenere solo lettere maiuscole, numeri e underscore'),
  name: z
    .string()
    .min(2, 'Nome deve contenere almeno 2 caratteri')
    .max(100, 'Nome troppo lungo'),
  measureClass: z.enum(MEASURE_CLASSES, {
    message: 'Classe di misura non valida',
  }),
  baseFactor: z
    .string()
    .min(1, 'Fattore di conversione obbligatorio')
    .refine(
      (val) => {
        try {
          const decimal = new Decimal(val);
          return decimal.gt(0); // Deve essere maggiore di 0
        } catch {
          return false;
        }
      },
      { message: 'Fattore di conversione deve essere un numero positivo' }
    ),
  active: z.boolean().default(true),
});

export type CreateUnitOfMeasureInput = z.infer<typeof createUnitOfMeasureSchema>;

/**
 * Schema per aggiornamento unità di misura
 */
export const updateUnitOfMeasureSchema = z.object({
  id: z.string().cuid(),
  code: z
    .string()
    .min(1, 'Codice obbligatorio')
    .max(10, 'Codice troppo lungo')
    .regex(/^[A-Z0-9_]+$/, 'Codice può contenere solo lettere maiuscole, numeri e underscore')
    .optional(),
  name: z
    .string()
    .min(2, 'Nome deve contenere almeno 2 caratteri')
    .max(100, 'Nome troppo lungo')
    .optional(),
  measureClass: z.enum(MEASURE_CLASSES, {
    message: 'Classe di misura non valida',
  }).optional(),
  baseFactor: z
    .string()
    .min(1, 'Fattore di conversione obbligatorio')
    .refine(
      (val) => {
        try {
          const decimal = new Decimal(val);
          return decimal.gt(0); // Deve essere maggiore di 0
        } catch {
          return false;
        }
      },
      { message: 'Fattore di conversione deve essere un numero positivo' }
    )
    .optional(),
  active: z.boolean().optional(),
});

export type UpdateUnitOfMeasureInput = z.infer<typeof updateUnitOfMeasureSchema>;
