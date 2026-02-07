/**
 * Schemi Zod per Gestione Pagamenti
 * 
 * Validazione per Tipi di Pagamento (PaymentType) e Condizioni di Pagamento (PaymentCondition)
 * 
 * REGOLE ERP:
 * - Codici SDI devono seguire pattern MP[0-9]{2} (MP01-MP23)
 * - Codici SEPA opzionali per flussi bancari futuri
 * - Condizioni di pagamento con calcolo scadenze
 */

import { z } from 'zod';

/**
 * Codici SDI validi per fatturazione elettronica italiana
 * 
 * Riferimento: Allegato A - D.M. 17/06/2014 (Modalità di trasmissione)
 */
const SDI_CODES = [
  'MP01', // Contanti
  'MP02', // Assegno
  'MP03', // Assegno circolare
  'MP04', // Contanti presso Tesoreria
  'MP05', // Bonifico
  'MP06', // Vaglia cambiario
  'MP07', // Bollettino bancario
  'MP08', // Carta di pagamento
  'MP09', // RID
  'MP10', // RID utenze
  'MP11', // RID veloce
  'MP12', // RiBa
  'MP13', // MAV
  'MP14', // Quietanza erario
  'MP15', // Giroconto su conti di contabilità speciale
  'MP16', // Domiciliazione bancaria
  'MP17', // Domiciliazione postale
  'MP18', // Bollettino di c/c postale
  'MP19', // SEPA Direct Debit
  'MP20', // SEPA Direct Debit CORE
  'MP21', // SEPA Direct Debit B2B
  'MP22', // Trattenuta su somme già riscosse
  'MP23', // PagoPA
] as const;

/**
 * Schema validazione codice SDI
 * 
 * Deve essere uno dei codici MP01-MP23 validi
 */
export const sdiCodeSchema = z
  .string()
  .regex(/^MP\d{2}$/, 'Codice SDI deve essere nel formato MP01-MP23')
  .refine(
    (val) => SDI_CODES.includes(val as (typeof SDI_CODES)[number]),
    {
      message: 'Codice SDI non valido. Valori ammessi: MP01-MP23',
    }
  );

/**
 * Schema validazione codice SEPA (opzionale)
 * 
 * Codici comuni:
 * - TRF: Transfer (Bonifico)
 * - OXI: RiBa
 * - DD: Direct Debit
 */
export const sepaCodeSchema = z
  .string()
  .max(10, 'Codice SEPA troppo lungo (max 10 caratteri)')
  .regex(/^[A-Z0-9]+$/, 'Codice SEPA deve contenere solo lettere maiuscole e numeri')
  .optional()
  .or(z.literal(''));

/**
 * Schema per creazione PaymentType
 */
export const createPaymentTypeSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve contenere almeno 2 caratteri')
    .max(100, 'Nome troppo lungo (max 100 caratteri)'),
  sdiCode: sdiCodeSchema,
  sepaCode: sepaCodeSchema,
  active: z.boolean().default(true),
});

export type CreatePaymentTypeInput = z.infer<typeof createPaymentTypeSchema>;

/**
 * Schema per aggiornamento PaymentType
 */
export const updatePaymentTypeSchema = z.object({
  id: z.string().cuid(),
  name: z
    .string()
    .min(2, 'Nome deve contenere almeno 2 caratteri')
    .max(100, 'Nome troppo lungo (max 100 caratteri)')
    .optional(),
  sdiCode: sdiCodeSchema.optional(),
  sepaCode: sepaCodeSchema,
  active: z.boolean().optional(),
});

export type UpdatePaymentTypeInput = z.infer<typeof updatePaymentTypeSchema>;

/**
 * Schema per creazione PaymentCondition
 * 
 * REGOLE BUSINESS:
 * - daysToFirstDue >= 0 (può essere 0 per pagamento immediato)
 * - gapBetweenDues >= 0 (può essere 0 se numberOfDues = 1)
 * - numberOfDues >= 1 (almeno una rata)
 * - Se numberOfDues = 1, gapBetweenDues viene ignorato
 */
export const createPaymentConditionSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve contenere almeno 2 caratteri')
    .max(100, 'Nome troppo lungo (max 100 caratteri)'),
  paymentTypeId: z.string().cuid('ID tipo pagamento non valido'),
  daysToFirstDue: z
    .number()
    .int('Giorni alla prima scadenza deve essere un numero intero')
    .min(0, 'Giorni alla prima scadenza non può essere negativo')
    .max(365, 'Giorni alla prima scadenza non può superare 365'),
  gapBetweenDues: z
    .number()
    .int('Giorni tra le scadenze deve essere un numero intero')
    .min(0, 'Giorni tra le scadenze non può essere negativo')
    .max(365, 'Giorni tra le scadenze non può superare 365'),
  numberOfDues: z
    .number()
    .int('Numero rate deve essere un numero intero')
    .min(1, 'Deve esserci almeno una rata')
    .max(24, 'Numero massimo di rate: 24'),
  isEndOfMonth: z.boolean().default(false),
  active: z.boolean().default(true),
}).refine(
  (data) => {
    // Se c'è una sola rata, gapBetweenDues è irrilevante
    if (data.numberOfDues === 1) return true;
    // Se ci sono più rate, gapBetweenDues deve essere > 0
    return data.gapBetweenDues > 0;
  },
  {
    message: 'Con più di una rata, i giorni tra le scadenze devono essere maggiori di 0',
    path: ['gapBetweenDues'],
  }
);

export type CreatePaymentConditionInput = z.infer<typeof createPaymentConditionSchema>;

/**
 * Schema per aggiornamento PaymentCondition
 */
export const updatePaymentConditionSchema = z.object({
  id: z.string().cuid(),
  name: z
    .string()
    .min(2, 'Nome deve contenere almeno 2 caratteri')
    .max(100, 'Nome troppo lungo (max 100 caratteri)')
    .optional(),
  paymentTypeId: z.string().cuid('ID tipo pagamento non valido').optional(),
  daysToFirstDue: z
    .number()
    .int('Giorni alla prima scadenza deve essere un numero intero')
    .min(0, 'Giorni alla prima scadenza non può essere negativo')
    .max(365, 'Giorni alla prima scadenza non può superare 365')
    .optional(),
  gapBetweenDues: z
    .number()
    .int('Giorni tra le scadenze deve essere un numero intero')
    .min(0, 'Giorni tra le scadenze non può essere negativo')
    .max(365, 'Giorni tra le scadenze non può superare 365')
    .optional(),
  numberOfDues: z
    .number()
    .int('Numero rate deve essere un numero intero')
    .min(1, 'Deve esserci almeno una rata')
    .max(24, 'Numero massimo di rate: 24')
    .optional(),
  isEndOfMonth: z.boolean().optional(),
  active: z.boolean().optional(),
});

export type UpdatePaymentConditionInput = z.infer<typeof updatePaymentConditionSchema>;
