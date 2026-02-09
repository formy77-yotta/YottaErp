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

const buildOperationSignSchema = (label: 'magazzino' | 'valorizzazione') =>
  z.preprocess(
    (value: unknown) => {
      if (value === '' || value === null || value === undefined) {
        return null;
      }

      if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isNaN(parsed) ? null : parsed;
      }

      if (typeof value === 'number' && Number.isNaN(value)) {
        return null;
      }

      return value;
    },
    z
      .number()
      .int(`Segno operazione ${label} deve essere un numero intero`)
      .refine((val) => val === 1 || val === -1, `Segno operazione ${label} deve essere 1 o -1`)
      .nullable()
      .optional()
  );

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
  operationSignStock: buildOperationSignSchema('magazzino'),
  operationSignValuation: buildOperationSignSchema('valorizzazione'),
  documentDirection: z.enum(['PURCHASE', 'SALE', 'INTERNAL']).default('SALE'),
  active: z.boolean().default(true),
  templateId: z.string().cuid().optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Colore in esadecimale (es. #3b82f6)')
    .optional()
    .nullable()
    .or(z.literal('')),
}).refine(
  (data) => {
    // Se inventoryMovement è true, operationSignStock deve essere definito
    if (data.inventoryMovement && (data.operationSignStock === null || data.operationSignStock === undefined)) {
      return false;
    }
    // Se inventoryMovement è false, operationSignStock deve essere null
    if (!data.inventoryMovement && data.operationSignStock !== null && data.operationSignStock !== undefined) {
      return false;
    }
    return true;
  },
  {
    message: 'Segno operazione magazzino richiesto se Movimenta Stock è attivo',
    path: ['operationSignStock'],
  }
).refine(
  (data) => {
    // Se valuationImpact è true, operationSignValuation deve essere definito
    if (data.valuationImpact && (data.operationSignValuation === null || data.operationSignValuation === undefined)) {
      return false;
    }
    // Se valuationImpact è false, operationSignValuation deve essere null
    if (!data.valuationImpact && data.operationSignValuation !== null && data.operationSignValuation !== undefined) {
      return false;
    }
    return true;
  },
  {
    message: 'Segno operazione valorizzazione richiesto se Impatto Valorizzazione è attivo',
    path: ['operationSignValuation'],
  }
);

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
  operationSignStock: buildOperationSignSchema('magazzino'),
  operationSignValuation: buildOperationSignSchema('valorizzazione'),
  documentDirection: z.enum(['PURCHASE', 'SALE', 'INTERNAL']).optional(),
  active: z.boolean().optional(),
  templateId: z.string().cuid().optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Colore deve essere in formato esadecimale (es. #3b82f6)')
    .optional()
    .nullable()
    .or(z.literal('')),
}).refine(
  (data) => {
    // Se inventoryMovement è true, operationSignStock deve essere definito
    if (data.inventoryMovement && (data.operationSignStock === null || data.operationSignStock === undefined)) {
      return false;
    }
    // Se inventoryMovement è false, operationSignStock deve essere null
    if (!data.inventoryMovement && data.operationSignStock !== null && data.operationSignStock !== undefined) {
      return false;
    }
    return true;
  },
  {
    message: 'Segno operazione magazzino richiesto se Movimenta Stock è attivo',
    path: ['operationSignStock'],
  }
).refine(
  (data) => {
    // Se valuationImpact è true, operationSignValuation deve essere definito
    if (data.valuationImpact && (data.operationSignValuation === null || data.operationSignValuation === undefined)) {
      return false;
    }
    // Se valuationImpact è false, operationSignValuation deve essere null
    if (!data.valuationImpact && data.operationSignValuation !== null && data.operationSignValuation !== undefined) {
      return false;
    }
    return true;
  },
  {
    message: 'Segno operazione valorizzazione richiesto se Impatto Valorizzazione è attivo',
    path: ['operationSignValuation'],
  }
);

export type UpdateDocumentTypeInput = z.infer<typeof updateDocumentTypeSchema>;
