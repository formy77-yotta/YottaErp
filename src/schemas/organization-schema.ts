/**
 * Schema Zod per validazione Organization
 * 
 * Valida tutti i dati di un'organizzazione con:
 * - Validazione P.IVA italiana (algoritmo di controllo)
 * - Validazione Codice Fiscale italiano
 * - Validazione campi obbligatori italiani (CAP, provincia, ecc.)
 */

import { z } from 'zod';
import { validateItalianVAT, validateItalianFiscalCode } from '@/lib/validators';

/**
 * Schema per validazione P.IVA italiana
 * - 11 cifre numeriche obbligatorie
 * - Validazione checksum con algoritmo ufficiale
 */
export const italianVatNumberSchema = z
  .string()
  .regex(/^\d{11}$/, 'P.IVA deve contenere esattamente 11 cifre')
  .refine(validateItalianVAT, 'P.IVA non valida (checksum errato)');

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
  .refine(validateItalianFiscalCode, 'Codice Fiscale non valido (checksum errato)');

/**
 * Schema per validazione provincia italiana
 * - 2 caratteri maiuscoli (es. MI, RM, NA)
 */
export const italianProvinceSchema = z
  .union([
    z.string().length(2, 'Provincia deve essere di 2 caratteri (es. MI)').regex(/^[A-Z]{2}$/, 'Provincia deve contenere solo lettere maiuscole'),
    z.literal('')
  ])
  .optional();

/**
 * Schema per validazione CAP italiano
 * - 5 cifre numeriche
 */
export const italianZipCodeSchema = z
  .union([
    z.string().regex(/^\d{5}$/, 'CAP deve contenere esattamente 5 cifre'),
    z.literal('')
  ])
  .optional();

/**
 * Enum per i piani di sottoscrizione
 */
export const organizationPlanSchema = z.enum(['FREE', 'BASIC', 'PREMIUM'], {
  message: 'Piano non valido. Valori ammessi: FREE, BASIC, PREMIUM',
});

/**
 * Schema completo per creazione/editing Organization
 * 
 * REGOLE:
 * - businessName obbligatoria (min 2 caratteri)
 * - Almeno uno tra P.IVA e Codice Fiscale deve essere fornito
 * - Piano di sottoscrizione obbligatorio (default: FREE)
 * - Validazione completa indirizzi italiani
 */
export const organizationSchema = z
  .object({
    // Dati azienda (obbligatori)
    businessName: z
      .string()
      .min(2, 'Ragione sociale obbligatoria (minimo 2 caratteri)')
      .max(255, 'Ragione sociale troppo lunga (max 255 caratteri)'),

    // Fiscali (opzionali ma almeno uno obbligatorio)
    vatNumber: italianVatNumberSchema.optional(),
    fiscalCode: italianFiscalCodeSchema.optional(),

    // Indirizzo sede legale (opzionale ma se presente deve essere completo)
    // Usa .nullish() invece di .optional() per preservare i campi anche quando sono undefined
    address: z.union([
      z.string().min(5, 'Indirizzo troppo corto (minimo 5 caratteri)').max(255),
      z.literal('')
    ]).nullish(),
    city: z.union([
      z.string().min(2, 'Città troppo corta (minimo 2 caratteri)').max(100),
      z.literal('')
    ]).nullish(),
    province: z.union([
      z.string().length(2, 'Provincia deve essere di 2 caratteri (es. MI)').regex(/^[A-Z]{2}$/, 'Provincia deve contenere solo lettere maiuscole'),
      z.literal('')
    ]).nullish(),
    zipCode: z.union([
      z.string().regex(/^\d{5}$/, 'CAP deve contenere esattamente 5 cifre'),
      z.literal('')
    ]).nullish(),
    country: z.string().length(2, 'Paese deve essere di 2 caratteri').default('IT'),

    // Contatti (opzionali)
    email: z.string().email('Email non valida').nullish().or(z.literal('')),
    pec: z.string().email('PEC non valida').nullish().or(z.literal('')),
    phone: z.string().max(50, 'Numero di telefono troppo lungo').nullish().or(z.literal('')),
    sdiCode: z
      .union([
        z.string().regex(/^[A-Z0-9]{7}$/, 'Codice SDI deve contenere 7 caratteri alfanumerici'),
        z.literal('')
      ])
      .nullish(),

    // Logo (URL opzionale)
    logoUrl: z.string().url('URL logo non valido').optional().or(z.literal('')),

    // Subscription e limiti
    plan: organizationPlanSchema.default('FREE'),
    maxUsers: z.number().int().min(1, 'Minimo 1 utente').max(1000).default(5),
    maxInvoicesPerYear: z.number().int().min(1).max(1000000).default(500),

    // Stato
    active: z.boolean().default(true),

    // Utenti admin (opzionale per creazione, obbligatorio almeno uno)
    adminUserEmails: z.array(z.string().email('Email non valida')).optional(),
  })
  .refine(
    (data) => data.vatNumber || data.fiscalCode,
    {
      message: 'Inserire almeno P.IVA o Codice Fiscale',
      path: ['vatNumber'], // Mostra errore sul campo vatNumber
    }
  )
  .refine(
    (data) => {
      // Per la creazione, almeno un admin è obbligatorio
      // Per l'update, è opzionale (non modifichiamo gli admin esistenti)
      return data.adminUserEmails === undefined || data.adminUserEmails.length > 0;
    },
    {
      message: 'Inserire almeno un utente admin',
      path: ['adminUserEmails'],
    }
  )
  .refine(
    (data) => {
      // Se uno dei campi indirizzo è presente, devono esserlo tutti
      const addressFields = [data.address, data.city, data.province, data.zipCode];
      const filledFields = addressFields.filter((field) => field && field.length > 0);

      // Se nessun campo è compilato, va bene
      if (filledFields.length === 0) return true;

      // Se almeno un campo è compilato, devono esserlo tutti
      return filledFields.length === 4;
    },
    {
      message: 'Se inserisci un indirizzo, devi compilare: indirizzo, città, provincia e CAP',
      path: ['address'],
    }
  );

/**
 * Type inference per Organization (da usare in TypeScript)
 */
export type OrganizationInput = z.infer<typeof organizationSchema>;

/**
 * Schema per aggiornamento Organization
 * Tutti i campi sono opzionali tranne l'ID
 * 
 * NOTA: Non possiamo usare .partial() su schema con .refine()
 * quindi ricreiamo lo schema base senza refinements per l'update
 */
export const updateOrganizationSchema = z.object({
  id: z.string().cuid('ID organizzazione non valido'),
  
  // Tutti i campi opzionali (per update parziale)
  businessName: z.string().min(2).max(255).optional(),
  vatNumber: italianVatNumberSchema.optional(),
  fiscalCode: italianFiscalCodeSchema.optional(),
  address: z.string().min(5).max(255).optional(),
  city: z.string().min(2).max(100).optional(),
  province: italianProvinceSchema,
  zipCode: italianZipCodeSchema,
  country: z.string().length(2).optional(),
  email: z.string().email().optional().or(z.literal('')),
  pec: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  sdiCode: z.string().regex(/^[A-Z0-9]{7}$/).optional().or(z.literal('')),
  logoUrl: z.string().url().optional().or(z.literal('')),
  plan: organizationPlanSchema.optional(),
  maxUsers: z.number().int().min(1).max(1000).optional(),
  maxInvoicesPerYear: z.number().int().min(1).max(1000000).optional(),
  active: z.boolean().optional(),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

/**
 * Schema semplificato per creazione rapida Organization (solo dati essenziali)
 * Utile per il primo onboarding
 */
export const createOrganizationQuickSchema = z.object({
  businessName: z.string().min(2, 'Ragione sociale obbligatoria (minimo 2 caratteri)'),
  vatNumber: italianVatNumberSchema.optional(),
  fiscalCode: italianFiscalCodeSchema.optional(),
  plan: organizationPlanSchema.default('FREE'),
});

export type CreateOrganizationQuickInput = z.infer<typeof createOrganizationQuickSchema>;
