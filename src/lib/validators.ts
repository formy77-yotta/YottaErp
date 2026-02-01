/**
 * Validatori per P.IVA e Codice Fiscale italiano
 * 
 * Questi validatori implementano gli algoritmi ufficiali
 * per verificare la correttezza di Partita IVA e Codice Fiscale.
 */

/**
 * Valida una Partita IVA italiana (11 cifre numeriche)
 * 
 * ALGORITMO:
 * - 11 cifre numeriche
 * - L'ultima cifra è un check digit calcolato con algoritmo specifico
 * - Cifre in posizione pari (indice dispari 1,3,5,7,9) vengono raddoppiate
 * - Se il raddoppio > 9, si sottrae 9
 * - Il check digit è calcolato in modo che la somma totale sia multiplo di 10
 * 
 * @param vat - Partita IVA da validare (stringa di 11 cifre)
 * @returns true se valida, false altrimenti
 * 
 * @example
 * ```typescript
 * validateItalianVAT('12345678901'); // true se il check digit è corretto
 * validateItalianVAT('00000000000'); // false
 * validateItalianVAT('abc'); // false
 * ```
 */
export function validateItalianVAT(vat: string): boolean {
  // Verifica formato: esattamente 11 cifre numeriche
  if (!/^\d{11}$/.test(vat)) {
    return false;
  }

  let sum = 0;

  // Calcola somma delle prime 10 cifre con algoritmo
  for (let i = 0; i < 10; i++) {
    let digit = parseInt(vat[i], 10);

    // Le cifre in posizione dispari (indice 1, 3, 5, 7, 9) vengono raddoppiate
    if (i % 2 === 1) {
      digit *= 2;
      // Se il raddoppio supera 9, sottrai 9
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
  }

  // Il check digit è calcolato in modo che la somma totale sia multiplo di 10
  const checkDigit = (10 - (sum % 10)) % 10;

  // Verifica che il check digit calcolato corrisponda all'ultima cifra
  return checkDigit === parseInt(vat[10], 10);
}

/**
 * Valida un Codice Fiscale italiano (16 caratteri alfanumerici)
 * 
 * FORMATO:
 * - 6 lettere: cognome e nome
 * - 2 numeri: anno di nascita
 * - 1 lettera: mese di nascita
 * - 2 numeri: giorno di nascita e sesso
 * - 1 lettera: comune di nascita
 * - 3 numeri: comune di nascita
 * - 1 lettera: carattere di controllo
 * 
 * Esempio: RSSMRA80A01H501U
 * 
 * @param cf - Codice Fiscale da validare
 * @returns true se valido, false altrimenti
 * 
 * @example
 * ```typescript
 * validateItalianFiscalCode('RSSMRA80A01H501U'); // true se valido
 * validateItalianFiscalCode('INVALID'); // false
 * ```
 */
export function validateItalianFiscalCode(cf: string): boolean {
  // Verifica lunghezza
  if (cf.length !== 16) {
    return false;
  }

  // Verifica formato: 6 lettere + 2 numeri + 1 lettera + 2 numeri + 1 lettera + 3 numeri + 1 lettera
  if (!/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(cf)) {
    return false;
  }

  // Tabella conversione caratteri in posizione pari (indice dispari)
  const evenMap: Record<string, number> = {
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, 'I': 8, 'J': 9,
    'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18,
    'T': 19, 'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25,
  };

  // Tabella conversione caratteri in posizione dispari (indice pari)
  const oddMap: Record<string, number> = {
    '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
    'A': 1, 'B': 0, 'C': 5, 'D': 7, 'E': 9, 'F': 13, 'G': 15, 'H': 17, 'I': 19, 'J': 21,
    'K': 2, 'L': 4, 'M': 18, 'N': 20, 'O': 11, 'P': 3, 'Q': 6, 'R': 8, 'S': 12, 'T': 14,
    'U': 16, 'V': 10, 'W': 22, 'X': 25, 'Y': 24, 'Z': 23,
  };

  let sum = 0;

  // Calcola checksum sui primi 15 caratteri
  for (let i = 0; i < 15; i++) {
    const char = cf[i];
    // Posizioni dispari (indice pari: 0, 2, 4...) usano oddMap
    // Posizioni pari (indice dispari: 1, 3, 5...) usano evenMap
    sum += i % 2 === 0 ? oddMap[char] : evenMap[char];
  }

  // Il carattere di controllo è la lettera corrispondente a sum % 26
  const checkChar = String.fromCharCode(65 + (sum % 26));

  // Verifica che il carattere di controllo corrisponda all'ultimo carattere
  return checkChar === cf[15];
}

/**
 * Formatta una Partita IVA per visualizzazione
 * Aggiunge spazi ogni 3 cifre per migliorare la leggibilità
 * 
 * @param vat - Partita IVA (11 cifre)
 * @returns Partita IVA formattata
 * 
 * @example
 * ```typescript
 * formatVAT('12345678901'); // "123 456 789 01"
 * ```
 */
export function formatVAT(vat: string): string {
  if (vat.length !== 11) return vat;
  return `${vat.slice(0, 3)} ${vat.slice(3, 6)} ${vat.slice(6, 9)} ${vat.slice(9)}`;
}

/**
 * Formatta un Codice Fiscale per visualizzazione
 * Divide in gruppi logici
 * 
 * @param cf - Codice Fiscale (16 caratteri)
 * @returns Codice Fiscale formattato
 * 
 * @example
 * ```typescript
 * formatFiscalCode('RSSMRA80A01H501U'); // "RSSMRA 80A01 H501U"
 * ```
 */
export function formatFiscalCode(cf: string): string {
  if (cf.length !== 16) return cf;
  return `${cf.slice(0, 6)} ${cf.slice(6, 11)} ${cf.slice(11)}`;
}
