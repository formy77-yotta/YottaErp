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

/**
 * Schema per validazione Codice Fiscale italiano
 * - 16 caratteri alfanumerici (persone fisiche, formato: RSSMRA80A01H501U)
 * - 11 cifre numeriche (società, corrisponde alla P.IVA)
 * - Validazione checksum con algoritmo ufficiale
 */
export const italianFiscalCodeSchema = z
  .string()
  .refine(
    (cf) => {
      // Accetta 16 caratteri (persona fisica) o 11 cifre (società)
      return /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(cf) || /^\d{11}$/.test(cf);
    },
    {
      message: 'Codice Fiscale deve essere di 16 caratteri (persona fisica) o 11 cifre (società, P.IVA)',
    }
  )
  .refine(validateItalianFiscalCode, {
    message: 'Codice Fiscale non valido (errore nel carattere di controllo o checksum P.IVA)',
  });

// ============================================================================
// SCHEMA CLIENTE/FORNITORE ITALIANO
// ============================================================================

/**
 * Schema base per business italiano (senza refine, per permettere .partial())
 */
const italianBusinessBaseSchema = z.object({
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
});

// ============================================================================
// SCHEMA CUSTOMER (per creazione)
// ============================================================================

/**
 * Schema per creazione customer (con refine per validazione P.IVA/CF)
 */
export const createCustomerSchema = italianBusinessBaseSchema.refine(
  (data) => data.vatNumber || data.fiscalCode,
  {
    message: 'Inserire almeno P.IVA o Codice Fiscale',
    path: ['vatNumber'],
  }
);

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

// ============================================================================
// SCHEMA CUSTOMER (per aggiornamento)
// ============================================================================

/**
 * Schema per aggiornamento customer
 * 
 * NOTA: Non possiamo usare .partial() su schema con .refine()
 * quindi creiamo manualmente lo schema con tutti i campi opzionali
 */
export const updateCustomerSchema = z.object({
  id: z.string().cuid(),
  businessName: z
    .string()
    .min(2, 'Ragione sociale deve contenere almeno 2 caratteri')
    .max(255, 'Ragione sociale troppo lunga')
    .optional(),
  vatNumber: italianVatNumberSchema.optional(),
  fiscalCode: italianFiscalCodeSchema.optional(),
  address: z.string().min(5, 'Indirizzo deve contenere almeno 5 caratteri').optional(),
  city: z.string().min(2, 'Città deve contenere almeno 2 caratteri').optional(),
  province: z
    .string()
    .length(2, 'Provincia deve essere 2 caratteri (es. MI, RM, NA)')
    .regex(/^[A-Z]{2}$/, 'Provincia deve essere 2 lettere maiuscole')
    .transform((val) => val.toUpperCase())
    .optional(),
  zipCode: z.string().regex(/^\d{5}$/, 'CAP deve contenere esattamente 5 cifre').optional(),
  country: z.string().length(2, 'Codice paese deve essere 2 caratteri').optional(),
  email: z.string().email('Email non valida').optional().or(z.literal('')).optional(),
  pec: z.string().email('PEC non valida').optional().or(z.literal('')).optional(),
  phone: z.string().optional(),
  sdiCode: z
    .string()
    .length(7, 'Codice SDI deve essere 7 caratteri')
    .optional()
    .or(z.literal(''))
    .optional(),
  notes: z.string().optional(),
  active: z.boolean().optional(),
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

// ============================================================================
// SCHEMA ENTITY (Anagrafica unificata: Cliente/Fornitore/Lead)
// ============================================================================

/**
 * Enum per tipo entità (frontend)
 * NOTA: Nel database Prisma, EntityType è CLIENT, PROVIDER, BOTH
 * Mappatura: CUSTOMER -> CLIENT, SUPPLIER -> PROVIDER, LEAD -> CLIENT
 */
export const entityTypeSchema = z.enum(['CUSTOMER', 'SUPPLIER', 'LEAD'], {
  errorMap: () => ({ message: 'Tipo entità non valido' }),
});

export type EntityType = z.infer<typeof entityTypeSchema>;

/**
 * Schema base per entità
 * 
 * REGOLA: Solo la ragione sociale è obbligatoria.
 * Tutti gli altri campi sono opzionali.
 * Se viene inserita la P.IVA, viene validata e verificata l'unicità.
 */
const entityBaseSchema = z.object({
  type: entityTypeSchema,
  businessName: z
    .string()
    .min(2, 'Ragione sociale deve contenere almeno 2 caratteri')
    .max(255, 'Ragione sociale troppo lunga'),
  // P.IVA: opzionale, ma se presente deve essere valida
  vatNumber: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => {
        // Se vuoto o undefined, è valido (opzionale)
        if (!val || val.trim() === '') return true;
        // Se presente, deve essere valida
        return italianVatNumberSchema.safeParse(val).success;
      },
      {
        message: 'P.IVA non valida (deve contenere 11 cifre e passare il checksum)',
      }
    ),
  // Codice Fiscale: opzionale, ma se presente deve essere valido
  fiscalCode: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => {
        // Se vuoto o undefined, è valido (opzionale)
        if (!val || val.trim() === '') return true;
        // Se presente, deve essere valido
        return italianFiscalCodeSchema.safeParse(val).success;
      },
      {
        message: 'Codice Fiscale non valido',
      }
    ),
  // Indirizzo: opzionale, ma se presente deve avere almeno 5 caratteri
  address: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        return val.length >= 5;
      },
      {
        message: 'Indirizzo deve contenere almeno 5 caratteri',
      }
    ),
  // Città: opzionale, ma se presente deve avere almeno 2 caratteri
  city: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        return val.length >= 2;
      },
      {
        message: 'Città deve contenere almeno 2 caratteri',
      }
    ),
  // Provincia: opzionale, ma se presente deve essere 2 lettere maiuscole
  province: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        return /^[A-Z]{2}$/.test(val.toUpperCase());
      },
      {
        message: 'Provincia deve essere 2 lettere maiuscole (es. MI, RM)',
      }
    )
    .transform((val) => (val ? val.toUpperCase() : val)),
  // CAP: opzionale, ma se presente deve essere 5 cifre
  zipCode: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        return /^\d{5}$/.test(val);
      },
      {
        message: 'CAP deve contenere esattamente 5 cifre',
      }
    ),
  // Email: opzionale, ma se presente deve essere valida
  email: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        return z.string().email().safeParse(val).success;
      },
      {
        message: 'Email non valida',
      }
    ),
  // PEC: opzionale, ma se presente deve essere una email valida
  pec: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        return z.string().email().safeParse(val).success;
      },
      {
        message: 'PEC non valida (deve essere un indirizzo email valido)',
      }
    ),
  // Codice SDI: opzionale, ma se presente deve essere 7 caratteri
  sdiCode: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        return val.length === 7;
      },
      {
        message: 'Codice SDI deve essere esattamente 7 caratteri',
      }
    ),
});

/**
 * Schema per creazione entità
 * 
 * NOTA: Non richiede più P.IVA o Codice Fiscale obbligatori.
 * Solo la ragione sociale è obbligatoria.
 * La verifica della P.IVA duplicata viene fatta nella Server Action.
 */
export const createEntitySchema = entityBaseSchema;

export type CreateEntityInput = z.infer<typeof createEntitySchema>;

/**
 * Schema per aggiornamento entità
 * 
 * NOTA: Non possiamo usare .partial() su schema con .refine()
 * quindi creiamo manualmente lo schema con tutti i campi opzionali
 */
export const updateEntitySchema = z.object({
  id: z.string().cuid(),
  type: entityTypeSchema.optional(),
  businessName: z
    .string()
    .min(2, 'Ragione sociale deve contenere almeno 2 caratteri')
    .max(255, 'Ragione sociale troppo lunga')
    .optional(),
  vatNumber: italianVatNumberSchema.optional().or(z.literal('')).optional(),
  fiscalCode: italianFiscalCodeSchema.optional().or(z.literal('')).optional(),
  address: z.string().min(5, 'Indirizzo deve contenere almeno 5 caratteri').optional(),
  city: z.string().min(2, 'Città deve contenere almeno 2 caratteri').optional(),
  province: z
    .string()
    .length(2, 'Provincia deve essere 2 caratteri (es. MI, RM, NA)')
    .regex(/^[A-Z]{2}$/, 'Provincia deve essere 2 lettere maiuscole')
    .transform((val) => val.toUpperCase())
    .optional(),
  zipCode: z.string().regex(/^\d{5}$/, 'CAP deve contenere esattamente 5 cifre').optional(),
  email: z.string().email('Email non valida').optional().or(z.literal('')).optional(),
  pec: z.string().email('PEC non valida').optional().or(z.literal('')).optional(),
  sdiCode: z
    .string()
    .length(7, 'Codice SDI deve essere 7 caratteri')
    .optional()
    .or(z.literal(''))
    .optional(),
});

export type UpdateEntityInput = z.infer<typeof updateEntitySchema>;