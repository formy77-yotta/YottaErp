import { z } from 'zod';

/**
 * Schemi Zod per documenti (Invoice, Order, DDT, etc.)
 */

// ============================================================================
// SCHEMA RIGA FATTURA
// ============================================================================

export const invoiceLineSchema = z.object({
  productId: z.string().cuid().optional(),
  productCode: z.string().min(1, 'Codice prodotto obbligatorio'),
  description: z.string().min(1, 'Descrizione obbligatoria'),

  // Valori monetari come stringhe (convertiti in Decimal nel service)
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Prezzo unitario non valido'),
  quantity: z.string().regex(/^\d+(\.\d{1,4})?$/, 'Quantità non valida'),
  vatRate: z.string().regex(/^0(\.\d{1,4})?$/, 'Aliquota IVA non valida'),
});

export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;

// ============================================================================
// SCHEMA FATTURA (creazione)
// ============================================================================

export const createInvoiceSchema = z.object({
  customerId: z.string().cuid('ID cliente non valido'),

  date: z.date().or(z.string().pipe(z.coerce.date())),

  lines: z
    .array(invoiceLineSchema)
    .min(1, 'La fattura deve contenere almeno una riga')
    .max(1000, 'Troppe righe (max 1000)'),

  notes: z.string().optional(),

  paymentTerms: z.string().optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

// ============================================================================
// SCHEMA FATTURA (aggiornamento)
// ============================================================================

export const updateInvoiceSchema = createInvoiceSchema.partial().extend({
  id: z.string().cuid(),
});

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
