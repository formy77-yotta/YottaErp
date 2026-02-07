import { Decimal } from 'decimal.js';

/**
 * Utility per calcoli monetari con Decimal.js
 * 
 * REGOLA ERP FONDAMENTALE:
 * MAI usare `number` per valori monetari!
 * JavaScript number usa floating-point (IEEE 754) che causa errori di arrotondamento.
 * 
 * Esempio problema:
 * 0.1 + 0.2 = 0.30000000000000004 ❌
 * 
 * Con Decimal.js:
 * new Decimal('0.1').plus('0.2') = 0.3 ✅
 */

// ✅ Configurazione globale arrotondamento fiscale italiano
// ROUND_HALF_UP è obbligatorio per conformità fiscale
Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

/**
 * Calcola l'importo IVA da un importo netto
 * 
 * @param netAmount - Importo netto (senza IVA)
 * @param vatRate - Aliquota IVA (es. new Decimal('0.22') per 22%)
 * @returns Importo IVA arrotondato a 2 decimali
 * 
 * @example
 * ```typescript
 * const net = new Decimal('100.00');
 * const rate = new Decimal('0.22');
 * const vat = calculateVAT(net, rate); // 22.00
 * ```
 */
export function calculateVAT(netAmount: Decimal, vatRate: Decimal): Decimal {
  return netAmount.mul(vatRate).toDecimalPlaces(2);
}

/**
 * Calcola l'importo lordo (netto + IVA)
 * 
 * @param netAmount - Importo netto
 * @param vatRate - Aliquota IVA
 * @returns Importo lordo arrotondato a 2 decimali
 * 
 * @example
 * ```typescript
 * const net = new Decimal('100.00');
 * const rate = new Decimal('0.22');
 * const gross = calculateGross(net, rate); // 122.00
 * ```
 */
export function calculateGross(netAmount: Decimal, vatRate: Decimal): Decimal {
  return netAmount.plus(calculateVAT(netAmount, vatRate)).toDecimalPlaces(2);
}

/**
 * Scorporo IVA: calcola netto e IVA partendo dall'importo lordo
 * 
 * LOGICA DI BUSINESS:
 * Quando un cliente paga 122€ con IVA al 22%:
 * - Imponibile = 122 / 1.22 = 100.00€
 * - IVA = 122 - 100 = 22.00€
 * 
 * L'arrotondamento ROUND_HALF_UP è obbligatorio per legge italiana.
 * Se si usa ROUND_DOWN, l'Agenzia delle Entrate può contestare la fattura!
 * 
 * @param grossAmount - Importo lordo (IVA inclusa)
 * @param vatRate - Aliquota IVA (es. 0.22 per 22%)
 * @returns Oggetto con imponibile e IVA separati
 * 
 * @example
 * ```typescript
 * const gross = new Decimal('122.00');
 * const rate = new Decimal('0.22');
 * const { net, vat } = extractVAT(gross, rate);
 * // net = 100.00, vat = 22.00
 * ```
 */
export function extractVAT(
  grossAmount: Decimal,
  vatRate: Decimal
): { net: Decimal; vat: Decimal } {
  const divisor = new Decimal(1).plus(vatRate);
  const net = grossAmount.div(divisor).toDecimalPlaces(2);
  const vat = grossAmount.minus(net).toDecimalPlaces(2);
  return { net, vat };
}

/**
 * Conversione sicura da string/number/Decimal a Decimal
 * 
 * Utile quando ricevi dati da form o API e vuoi assicurarti
 * che siano convertiti correttamente a Decimal.
 * 
 * @param value - Valore da convertire
 * @returns Istanza Decimal
 * 
 * @example
 * ```typescript
 * const d1 = toDecimal('19.99');
 * const d2 = toDecimal(19.99);
 * const d3 = toDecimal(new Decimal('19.99'));
 * ```
 */
export function toDecimal(value: string | number | Decimal): Decimal {
  if (value instanceof Decimal) return value;
  return new Decimal(value.toString());
}

/**
 * Formatta un Decimal per visualizzazione valuta
 * 
 * @param value - Valore Decimal
 * @param currency - Simbolo valuta (default: '€')
 * @returns Stringa formattata
 * 
 * @example
 * ```typescript
 * const price = new Decimal('19.99');
 * formatCurrency(price); // "€ 19.99"
 * formatCurrency(price, '$'); // "$ 19.99"
 * ```
 */
export function formatCurrency(value: Decimal, currency: string = '€'): string {
  return `${currency} ${value.toFixed(2)}`;
}

/**
 * Formatta un Decimal in formato italiano (virgola decimale, 2 decimali)
 * Per PDF e stampa conforme alle convenzioni italiane.
 */
export function formatDecimalItalian(value: Decimal): string {
  return value.toFixed(2).replace('.', ',');
}

/**
 * Calcola i totali di una riga fattura
 * 
 * @param quantity - Quantità
 * @param unitPrice - Prezzo unitario
 * @param vatRate - Aliquota IVA
 * @returns Oggetto con netto, IVA e lordo
 */
export function calculateLineTotal(
  quantity: Decimal,
  unitPrice: Decimal,
  vatRate: Decimal
): {
  netAmount: Decimal;
  vatAmount: Decimal;
  grossAmount: Decimal;
} {
  const netAmount = quantity.mul(unitPrice).toDecimalPlaces(2);
  const vatAmount = netAmount.mul(vatRate).toDecimalPlaces(2);
  const grossAmount = netAmount.plus(vatAmount).toDecimalPlaces(2);

  return { netAmount, vatAmount, grossAmount };
}
