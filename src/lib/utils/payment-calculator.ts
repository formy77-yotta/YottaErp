/**
 * Calcolatore Scadenze Pagamento
 * 
 * LOGICA BUSINESS:
 * - Divide l'importo totale per il numero di rate usando Decimal.js
 * - Calcola le date di scadenza in base ai parametri della condizione
 * - Gestisce il flag "fine mese" (isEndOfMonth)
 * - L'ultima rata assorbe eventuali differenze di arrotondamento
 * 
 * REGOLA FISCALE:
 * - Usa sempre Decimal.js per calcoli monetari (mai number!)
 * - Arrotondamento ROUND_HALF_UP (già configurato globalmente in decimal-utils.ts)
 */

import { Decimal } from 'decimal.js';

/**
 * Tipo per condizione di pagamento (solo i campi necessari per il calcolo)
 */
type PaymentCondition = {
  daysToFirstDue: number;
  gapBetweenDues: number;
  numberOfDues: number;
  isEndOfMonth: boolean;
};

/**
 * Interfaccia per una scadenza calcolata
 */
export interface CalculatedDeadline {
  dueDate: Date;
  amount: Decimal;
  installmentNumber: number;
}

/**
 * Calcola le scadenze di pagamento in base alla condizione
 * 
 * @param totalAmount - Importo totale da dividere (Decimal)
 * @param condition - Condizione di pagamento (PaymentCondition)
 * @param baseDate - Data base per il calcolo (default: oggi)
 * @returns Array di scadenze calcolate
 * 
 * @example
 * ```typescript
 * const total = new Decimal('1000.00');
 * const condition = {
 *   daysToFirstDue: 30,
 *   gapBetweenDues: 30,
 *   numberOfDues: 2,
 *   isEndOfMonth: false,
 * };
 * const deadlines = calculateDeadlines(total, condition, new Date('2024-01-15'));
 * // Risultato: 2 scadenze da 500.00€ ciascuna
 * ```
 */
export function calculateDeadlines(
  totalAmount: Decimal,
  condition: Pick<PaymentCondition, 'daysToFirstDue' | 'gapBetweenDues' | 'numberOfDues' | 'isEndOfMonth'>,
  baseDate: Date = new Date()
): CalculatedDeadline[] {
  // Validazione input
  if (totalAmount.lessThanOrEqualTo(0)) {
    throw new Error('Importo totale deve essere maggiore di zero');
  }

  if (condition.numberOfDues < 1) {
    throw new Error('Numero di rate deve essere almeno 1');
  }

  // Calcola importo per rata (divisione esatta)
  const numberOfDues = new Decimal(condition.numberOfDues);
  const amountPerDue = totalAmount.div(numberOfDues).toDecimalPlaces(2);

  // Calcola il totale delle prime (n-1) rate
  const firstDuesTotal = amountPerDue.mul(numberOfDues.minus(1));

  // L'ultima rata assorbe la differenza per garantire che la somma sia esatta
  const lastDueAmount = totalAmount.minus(firstDuesTotal);

  const deadlines: CalculatedDeadline[] = [];

  // Calcola la data della prima scadenza
  let currentDate = new Date(baseDate);
  currentDate.setDate(currentDate.getDate() + condition.daysToFirstDue);

  // Se isEndOfMonth è true, sposta all'ultimo giorno del mese
  if (condition.isEndOfMonth) {
    currentDate = getLastDayOfMonth(currentDate);
  }

  // Genera le scadenze
  for (let i = 0; i < condition.numberOfDues; i++) {
    const dueDate = new Date(currentDate);

    // Determina l'importo: ultima rata assorbe la differenza
    const amount = i === condition.numberOfDues - 1 
      ? lastDueAmount 
      : amountPerDue;

    deadlines.push({
      dueDate,
      amount,
      installmentNumber: i + 1,
    });

    // Calcola la data della prossima scadenza (se non è l'ultima)
    if (i < condition.numberOfDues - 1) {
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + condition.gapBetweenDues);

      // Se isEndOfMonth è true, sposta all'ultimo giorno del mese
      if (condition.isEndOfMonth) {
        currentDate = getLastDayOfMonth(currentDate);
      }
    }
  }

  return deadlines;
}

/**
 * Calcola l'ultimo giorno del mese per una data
 * 
 * @param date - Data di riferimento
 * @returns Data dell'ultimo giorno del mese
 * 
 * @example
 * ```typescript
 * const date = new Date('2024-01-15');
 * const lastDay = getLastDayOfMonth(date);
 * // Risultato: 2024-01-31
 * ```
 */
function getLastDayOfMonth(date: Date): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  // Il giorno 0 del mese successivo è l'ultimo giorno del mese corrente
  return new Date(year, month + 1, 0);
}

/**
 * Valida che la somma delle scadenze corrisponda all'importo totale
 * 
 * Utile per test e validazione
 * 
 * @param deadlines - Array di scadenze calcolate
 * @param expectedTotal - Importo totale atteso
 * @returns true se la somma corrisponde (con tolleranza di 0.01€ per arrotondamenti)
 */
export function validateDeadlinesSum(
  deadlines: CalculatedDeadline[],
  expectedTotal: Decimal
): boolean {
  const sum = deadlines.reduce(
    (acc, deadline) => acc.plus(deadline.amount),
    new Decimal(0)
  );

  // Tolleranza di 0.01€ per arrotondamenti
  const difference = sum.minus(expectedTotal).abs();
  return difference.lessThanOrEqualTo(new Decimal('0.01'));
}

/**
 * Formatta una scadenza per visualizzazione
 * 
 * @param deadline - Scadenza da formattare
 * @returns Stringa formattata (es. "Rata 1 - 31/01/2024 - € 500.00")
 */
export function formatDeadline(deadline: CalculatedDeadline): string {
  const dateStr = deadline.dueDate.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const amountStr = deadline.amount.toFixed(2);

  return `Rata ${deadline.installmentNumber} - ${dateStr} - € ${amountStr}`;
}
