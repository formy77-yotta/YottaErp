import { z } from 'zod';
import { Decimal } from 'decimal.js';

/**
 * Schemi Zod comuni per validazione
 * 
 * Questi schemi sono riutilizzabili in tutto il progetto per garantire
 * validazione consistente di valori monetari, quantità, ecc.
 */

/**
 * Schema base per Decimal
 * Accetta una stringa che rappresenta un numero decimale
 */
export const decimalSchema = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'Formato numerico non valido')
  .transform((val) => new Decimal(val));

/**
 * Schema per prezzi (valori monetari)
 * - Solo valori positivi
 * - Massimo 2 decimali
 */
export const priceSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Prezzo non valido (max 2 decimali)')
  .transform((val) => new Decimal(val))
  .refine((val) => val.greaterThanOrEqualTo(0), {
    message: 'Il prezzo deve essere positivo',
  });

/**
 * Schema per quantità
 * - Solo valori positivi maggiori di zero
 * - Massimo 4 decimali
 */
export const quantitySchema = z
  .string()
  .regex(/^\d+(\.\d{1,4})?$/, 'Quantità non valida (max 4 decimali)')
  .transform((val) => new Decimal(val))
  .refine((val) => val.greaterThan(0), {
    message: 'La quantità deve essere maggiore di zero',
  });

/**
 * Schema per aliquote IVA
 * - Valore tra 0 e 1 (es. 0.22 per 22%)
 * - Massimo 4 decimali
 */
export const vatRateSchema = z
  .string()
  .regex(/^0(\.\d{1,4})?$/, 'Aliquota IVA non valida')
  .transform((val) => new Decimal(val))
  .refine((val) => val.greaterThanOrEqualTo(0) && val.lessThanOrEqualTo(1), {
    message: 'L\'aliquota deve essere tra 0 e 1',
  });

/**
 * Aliquote IVA standard italiane
 */
export const ITALIAN_VAT_RATES = {
  STANDARD: new Decimal('0.22'), // 22%
  REDUCED: new Decimal('0.10'),  // 10%
  SUPER_REDUCED: new Decimal('0.04'), // 4%
  EXEMPT: new Decimal('0.00'),   // 0% (esente)
} as const;
