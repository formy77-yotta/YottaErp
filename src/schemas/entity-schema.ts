import { z } from 'zod';
import { validateItalianVAT, validateItalianFiscalCode } from '@/lib/validators';

/**
 * Schemi Zod per entità base (Customer, Supplier, Product)
 */

// ============================================================================
// SCHEMA P.IVA ITALIANA
// ============================================================================

export const italianVatNumberSchema = z
  .string()
  .regex(/^\d{11}$/, 'P.IVA deve contenere esattamente 11 cifre')
  .refine(validateItalianVAT, {
    message: 'P.IVA non valida (errore nel check digit)',
  });

// ============================================================================
// SCHEMA CODICE FISCALE ITALIANO
// ============================================================================

export const italianFiscalCodeSchema = z
  .string()
  .regex(/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/, 'Formato Codice Fiscale non valido')
  .refine(validateItalianFiscalCode, {
    message: 'Codice Fiscale non valido (errore nel carattere di controllo)',
  });

// ============================================================================
// SCHEMA CLIENTE/FORNITORE ITALIANO
// ============================================================================

export const italianBusinessSchema = z
  .object({
    businessName: z
      .string()
      .min(2, 'Ragione sociale deve contenere almeno 2 caratteri')
      .max(255, 'Ragione sociale troppo lunga'),

    vatNumber: italianVatNumberSchema.optional(),

    fiscalCode: italianFiscalCodeSchema.optional(),

    address: z.string().min(5, 'Indirizzo deve contenere almeno 5 caratteri'),

    city: z.string().min(2, 'Città deve contenere almeno 2 caratteri'),

    province: z
      .string()
      .length(2, 'Provincia deve essere 2 caratteri (es. MI, RM, NA)')
      .regex(/^[A-Z]{2}$/, 'Provincia deve essere 2 lettere maiuscole')
      .transform((val) => val.toUpperCase()),

    zipCode: z.string().regex(/^\d{5}$/, 'CAP deve contenere esattamente 5 cifre'),

    country: z.string().length(2, 'Codice paese deve essere 2 caratteri').default('IT'),

    email: z.string().email('Email non valida').optional().or(z.literal('')),

    pec: z.string().email('PEC non valida').optional().or(z.literal('')),

    phone: z.string().optional(),

    sdiCode: z
      .string()
      .length(7, 'Codice SDI deve essere 7 caratteri')
      .optional()
      .or(z.literal('')),

    notes: z.string().optional(),

    active: z.boolean().default(true),
  })
  .refine((data) => data.vatNumber || data.fiscalCode, {
    message: 'Inserire almeno P.IVA o Codice Fiscale',
    path: ['vatNumber'],
  });

// Type inference
export type ItalianBusinessInput = z.infer<typeof italianBusinessSchema>;

// ============================================================================
// SCHEMA CUSTOMER (per creazione)
// ============================================================================

export const createCustomerSchema = italianBusinessSchema;

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

// ============================================================================
// SCHEMA CUSTOMER (per aggiornamento)
// ============================================================================

export const updateCustomerSchema = italianBusinessSchema.partial().extend({
  id: z.string().cuid(),
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

// ============================================================================
// SCHEMA PRODUCT
// ============================================================================

export const createProductSchema = z.object({
  code: z
    .string()
    .min(1, 'Codice articolo obbligatorio')
    .max(50, 'Codice articolo troppo lungo')
    .regex(/^[A-Z0-9-_]+$/, 'Codice può contenere solo lettere maiuscole, numeri, - e _'),

  name: z.string().min(2, 'Nome prodotto deve contenere almeno 2 caratteri').max(255),

  description: z.string().optional(),

  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Prezzo non valido')
    .transform((val) => val),

  vatRate: z
    .string()
    .regex(/^0(\.\d{1,4})?$/, 'Aliquota IVA non valida')
    .transform((val) => val),

  active: z.boolean().default(true),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial().extend({
  id: z.string().cuid(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;
