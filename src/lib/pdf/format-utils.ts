/**
 * Helper per formattazione italiana in report PDF (date, numeri, valuta, contrasto)
 */

import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Decimal } from 'decimal.js';

/**
 * Formatta data in locale italiano
 * @example formatDate('2025-02-08T10:00:00Z') → "8 febbraio 2025"
 */
export function formatDate(dateString: string, pattern: string = 'd MMMM yyyy'): string {
  try {
    const date = new Date(dateString);
    return format(date, pattern, { locale: it });
  } catch {
    return dateString;
  }
}

/**
 * Formatta numero decimale in stile italiano (virgola decimale, punto migliaia)
 * @example formatDecimalItalian('1234.56') → "1.234,56"
 */
export function formatDecimalItalian(value: string | number): string {
  try {
    const decimal = new Decimal(value.toString());
    const formatted = decimal.toFixed(2);
    const [integer, fraction] = formatted.split('.');
    const integerFormatted = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${integerFormatted},${fraction}`;
  } catch {
    return value.toString();
  }
}

/**
 * Formatta valuta in euro
 * @example formatCurrency('1234.56') → "€ 1.234,56"
 */
export function formatCurrency(value: string | number): string {
  return `€ ${formatDecimalItalian(value)}`;
}

/**
 * Calcola colore testo in base allo sfondo (accessibilità)
 * @param bgColor - Colore sfondo hex (#RRGGBB)
 * @returns '#000000' per sfondo chiaro, '#ffffff' per sfondo scuro
 */
export function getContrastColor(bgColor: string): string {
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}
