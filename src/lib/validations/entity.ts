/**
 * Validazioni per entità (Anagrafiche)
 * 
 * Implementa validazione italiana per P.IVA e Codice Fiscale
 * secondo gli algoritmi ufficiali italiani.
 * 
 * REGOLE:
 * - P.IVA: 11 cifre numeriche con checksum
 * - Codice Fiscale: 16 caratteri alfanumerici (persone fisiche) o 11 cifre (società)
 * - Se il campo è presente, DEVE essere valido (non accetta stringhe vuote)
 */

import { z } from 'zod';
import { validateItalianVAT, validateItalianFiscalCode } from '@/lib/validators';

/**
 * Schema Zod per validazione entità
 * 
 * REGOLE:
 * - name (businessName): string, minimo 2 caratteri
 * - entityType: enum ['CLIENT', 'SUPPLIER', 'BOTH']
 * - vatNumber: string opzionale, regex 11 cifre
 * - fiscalCode: string opzionale, regex 16 caratteri
 * - address, city, zip, province: stringhe opzionali
 */
export const entitySchema = z.object({
  name: z
    .string()
    .min(2, 'Il nome deve contenere almeno 2 caratteri')
    .max(255, 'Il nome è troppo lungo'),
  entityType: z.enum(['CLIENT', 'SUPPLIER', 'BOTH'], {
    message: 'Tipo entità non valido. Deve essere CLIENT, SUPPLIER o BOTH',
  }),
  vatNumber: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true; // Opzionale
        return /^\d{11}$/.test(val) && validateItalianVAT(val);
      },
      {
        message: 'P.IVA deve contenere esattamente 11 cifre numeriche e passare il checksum',
      }
    ),
  fiscalCode: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true; // Opzionale
        return validateItalianFiscalCode(val);
      },
      {
        message: 'Codice Fiscale non valido (16 caratteri per persona fisica o 11 cifre per società)',
      }
    ),
  address: z.string().optional(),
  city: z.string().optional(),
  zip: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true; // Opzionale
        return /^\d{5}$/.test(val);
      },
      {
        message: 'CAP deve contenere esattamente 5 cifre',
      }
    ),
  province: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true; // Opzionale
        return /^[A-Z]{2}$/.test(val.toUpperCase());
      },
      {
        message: 'Provincia deve essere 2 lettere maiuscole (es. MI, RM)',
      }
    )
    .transform((val) => (val ? val.toUpperCase() : val)),
});

export type EntitySchemaInput = z.infer<typeof entitySchema>;

/**
 * Valida una Partita IVA italiana
 * 
 * @param vat - Partita IVA da validare
 * @returns true se valida, false altrimenti
 * 
 * @example
 * ```typescript
 * validateVATNumber('12345678901'); // true se valida
 * validateVATNumber(''); // false (stringa vuota non valida)
 * ```
 */
export function validateVATNumber(vat: string): boolean {
  // Se vuoto, non è valido (non accettiamo stringhe vuote)
  if (!vat || vat.trim() === '') {
    return false;
  }

  // Verifica formato: esattamente 11 cifre numeriche
  if (!/^\d{11}$/.test(vat)) {
    return false;
  }

  // Valida con algoritmo checksum
  return validateItalianVAT(vat);
}

/**
 * Valida un Codice Fiscale italiano
 * 
 * FORMATI ACCETTATI:
 * - 16 caratteri alfanumerici (persone fisiche)
 * - 11 cifre numeriche (società, corrisponde alla P.IVA)
 * 
 * @param cf - Codice Fiscale da validare
 * @returns true se valido, false altrimenti
 * 
 * @example
 * ```typescript
 * validateFiscalCode('RSSMRA80A01H501U'); // true se valido (persona fisica)
 * validateFiscalCode('12345678901'); // true se valido (società)
 * validateFiscalCode(''); // false (stringa vuota non valida)
 * ```
 */
export function validateFiscalCode(cf: string): boolean {
  // Se vuoto, non è valido (non accettiamo stringhe vuote)
  if (!cf || cf.trim() === '') {
    return false;
  }

  // Valida con algoritmo ufficiale
  return validateItalianFiscalCode(cf);
}

/**
 * Valida che almeno uno tra P.IVA e Codice Fiscale sia presente e valido
 * 
 * REGOLA: Un privato può avere solo CF, un'azienda estera solo VAT,
 * ma almeno uno deve essere presente e valido.
 * 
 * @param vatNumber - Partita IVA (opzionale)
 * @param fiscalCode - Codice Fiscale (opzionale)
 * @returns true se almeno uno è presente e valido, false altrimenti
 * 
 * @example
 * ```typescript
 * validateVATOrFiscalCode('12345678901', ''); // true (solo P.IVA valida)
 * validateVATOrFiscalCode('', 'RSSMRA80A01H501U'); // true (solo CF valido)
 * validateVATOrFiscalCode('12345678901', 'RSSMRA80A01H501U'); // true (entrambi validi)
 * validateVATOrFiscalCode('', ''); // false (nessuno presente)
 * ```
 */
export function validateVATOrFiscalCode(
  vatNumber: string | null | undefined,
  fiscalCode: string | null | undefined
): boolean {
  const vat = vatNumber?.trim() || '';
  const cf = fiscalCode?.trim() || '';

  // Almeno uno deve essere presente
  if (vat === '' && cf === '') {
    return false;
  }

  // Se presente, P.IVA deve essere valida
  if (vat !== '' && !validateVATNumber(vat)) {
    return false;
  }

  // Se presente, Codice Fiscale deve essere valido
  if (cf !== '' && !validateFiscalCode(cf)) {
    return false;
  }

  return true;
}

/**
 * Valida un indirizzo italiano
 * 
 * @param address - Indirizzo da validare
 * @returns true se valido (almeno 5 caratteri), false altrimenti
 */
export function validateAddress(address: string | null | undefined): boolean {
  if (!address || address.trim() === '') {
    return false;
  }
  return address.trim().length >= 5;
}

/**
 * Valida una provincia italiana
 * 
 * @param province - Provincia da validare (es. "MI", "RM")
 * @returns true se valida (2 lettere maiuscole), false altrimenti
 */
export function validateProvince(province: string | null | undefined): boolean {
  if (!province || province.trim() === '') {
    return false;
  }
  return /^[A-Z]{2}$/.test(province.toUpperCase());
}

/**
 * Valida un CAP italiano
 * 
 * @param zipCode - CAP da validare
 * @returns true se valido (5 cifre), false altrimenti
 */
export function validateZipCode(zipCode: string | null | undefined): boolean {
  if (!zipCode || zipCode.trim() === '') {
    return false;
  }
  return /^\d{5}$/.test(zipCode);
}
