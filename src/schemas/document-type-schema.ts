/**
 * Schemi Zod per Configurazioni Tipi Documento
 * 
 * Validazione per creazione e aggiornamento configurazioni tipi documento.
 * 
 * IMPORTANTE: I flag hanno significato specifico per logica fiscale e di magazzino:
 * - inventoryMovement: se true, il documento movimenta lo stock (es. DDT, Fattura)
 *   → Se attivo, si sblocca operationSignStock (+1 incremento, -1 decremento)
 * - valuationImpact: se true, il documento impatta costi/ricavi (es. Fattura, Nota Credito)
 *   → Se attivo, si sblocca operationSignValuation (+1 incremento, -1 decremento)
 * 
 * I due segni operazione sono indipendenti e controllano comportamenti diversi:
 * - operationSignStock: controlla direzione movimenti magazzino
 * - operationSignValuation: controlla direzione impatto contabile
 */

import { z } from 'zod';

/**
 * Schema per creazione configurazione tipo documento
 */
export const createDocumentTypeSchema = z.object({
  code: z
    .string()
    .min(2, 'Codice deve contenere almeno 2 caratteri')
    .max(20, 'Codice troppo lungo')
    .regex(/^[A-Z0-9_]+$/, 'Codice può contenere solo lettere maiuscole, numeri e underscore'),
  description: z
    .string()
    .min(2, 'Descrizione deve contenere almeno 2 caratteri')
    .max(200, 'Descrizione troppo lunga'),
  numeratorCode: z
    .string()
    .min(2, 'Codice numerazione deve contenere almeno 2 caratteri')
    .max(50, 'Codice numerazione troppo lungo'),
  inventoryMovement: z.boolean().default(false),
  valuationImpact: z.boolean().default(false),
  operationSign: z
    .number()
    .int('Segno operazione deve essere un numero intero')
    .refine((val) => val === 1 || val === -1, 'Segno operazione deve essere 1 o -1')
    .default(1),
  active: z.boolean().default(true),
});

export type CreateDocumentTypeInput = z.infer<typeof createDocumentTypeSchema>;

/**
 * Schema per aggiornamento configurazione tipo documento
 */
export const updateDocumentTypeSchema = z.object({
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
  numeratorCode: z
    .string()
    .min(2, 'Codice numerazione deve contenere almeno 2 caratteri')
    .max(50, 'Codice numerazione troppo lungo')
    .optional(),
  inventoryMovement: z.boolean().optional(),
  valuationImpact: z.boolean().optional(),
  operationSign: z
    .number()
    .int('Segno operazione deve essere un numero intero')
    .refine((val) => val === 1 || val === -1, 'Segno operazione deve essere 1 o -1')
    .optional(),
  active: z.boolean().optional(),
});

export type UpdateDocumentTypeInput = z.infer<typeof updateDocumentTypeSchema>;
