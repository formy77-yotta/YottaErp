/**
 * Schemi Zod per modulo finanziario (FinancialAccount, Payment, PaymentMapping, reconcile)
 */

import { z } from 'zod';
import { Decimal } from 'decimal.js';

const decimalStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Importo non valido (max 2 decimali)')
  .transform((s) => new Decimal(s))
  .refine((d) => d.greaterThan(0), 'L\'importo deve essere maggiore di zero');

/** Schema per creazione conto finanziario (output: initialBalance come Decimal per API) */
export const createFinancialAccountSchema = z.object({
  name: z.string().min(1, 'Nome obbligatorio').max(100),
  type: z.enum(['BANK', 'CASH', 'VIRTUAL']),
  iban: z.string().max(34).optional().or(z.literal('')),
  initialBalance: z
    .string()
    .regex(/^-?\d+(\.\d{1,2})?$/, 'Saldo iniziale non valido (max 2 decimali)')
    .default('0')
    .transform((s) => new Decimal(s)),
});

export type CreateFinancialAccountInput = z.infer<typeof createFinancialAccountSchema>;
/** Input grezzo (es. da form) prima della transform initialBalance → Decimal */
export type CreateFinancialAccountRawInput = z.input<typeof createFinancialAccountSchema>;

/** Schema per il form conto finanziario (initialBalance resta stringa per input) */
export const createFinancialAccountFormSchema = z.object({
  name: z.string().min(1, 'Nome obbligatorio').max(100),
  type: z.enum(['BANK', 'CASH', 'VIRTUAL']),
  iban: z.string().max(34).optional().or(z.literal('')),
  initialBalance: z
    .string()
    .regex(/^-?\d+(\.\d{1,2})?$/, 'Saldo iniziale non valido (max 2 decimali)')
    .default('0'),
});

export type CreateFinancialAccountFormValues = z.infer<typeof createFinancialAccountFormSchema>;

/** Singola allocazione: scadenza (Installment) + importo da allocare */
export const allocationItemSchema = z.object({
  installmentId: z.string().cuid(),
  amount: decimalStringSchema,
});

export const reconcilePaymentSchema = z
  .object({
    /** Se presente usa il pagamento esistente; altrimenti crea nuovo (richiede newPayment) */
    paymentId: z.string().cuid().optional(),
    /** Dati per creare un nuovo pagamento (obbligatorio se paymentId non fornito) */
    newPayment: z
      .object({
        financialAccountId: z.string().cuid('Seleziona un conto'),
        amount: decimalStringSchema,
        date: z.coerce.date(),
        direction: z.enum(['INFLOW', 'OUTFLOW']),
        paymentTypeId: z.string().cuid().optional(),
        reference: z.string().max(100).optional(),
        notes: z.string().max(500).optional(),
      })
      .optional(),
    /** Allocazioni: importi da distribuire su ogni scadenza */
    allocations: z.array(allocationItemSchema).min(1, 'Almeno un\'allocazione richiesta'),
  })
  .refine(
    (data) => {
      if (data.paymentId) return true;
      return !!data.newPayment;
    },
    { message: 'Fornire paymentId o newPayment', path: ['paymentId'] }
  );

export type ReconcilePaymentInput = z.infer<typeof reconcilePaymentSchema>;
export type AllocationItem = z.infer<typeof allocationItemSchema>;

/** Schema per il form di creazione pagamento (importo come stringa per input) */
export const newPaymentFormSchema = z.object({
  financialAccountId: z.string().cuid('Seleziona un conto'),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Importo non valido (max 2 decimali)')
    .refine((s) => new Decimal(s).greaterThan(0), 'L\'importo deve essere maggiore di zero'),
  date: z
    .union([z.string(), z.number(), z.date()])
    .transform((v): Date => (v instanceof Date ? v : new Date(v))),
  direction: z.enum(['INFLOW', 'OUTFLOW']),
  paymentTypeId: z.string().cuid().optional().or(z.literal('')),
  reference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export type NewPaymentFormValues = z.infer<typeof newPaymentFormSchema>;
