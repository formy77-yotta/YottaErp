/**
 * Helper per mappare il code di DocumentTypeConfig al DocumentCategory enum
 * 
 * Il campo 'category' (enum DocumentCategory) è presente solo nel Document,
 * non in DocumentTypeConfig. Questa funzione aiuta a mappare correttamente
 * il code della configurazione alla categoria documento quando si crea un Document.
 * 
 * @param documentTypeCode - Codice del DocumentTypeConfig
 * @returns DocumentCategory corrispondente
 */

import { DocumentCategory } from '@prisma/client';

/**
 * Mappa il code di DocumentTypeConfig al DocumentCategory enum
 * 
 * @param documentTypeCode - Codice del DocumentTypeConfig (es. "DDT", "FAI", "FAC")
 * @returns DocumentCategory corrispondente
 * 
 * @example
 * ```typescript
 * const category = mapDocumentTypeCodeToCategory('DDT'); // DELIVERY_NOTE
 * const category = mapDocumentTypeCodeToCategory('FAI'); // INVOICE
 * const category = mapDocumentTypeCodeToCategory('PRO'); // QUOTE
 * ```
 */
export function mapDocumentTypeCodeToCategory(
  documentTypeCode: string
): DocumentCategory {
  const code = documentTypeCode.toUpperCase();

  // Mappatura code -> category
  switch (code) {
    // Preventivi
    case 'PRO':
      return 'QUOTE';

    // Ordini (cliente e fornitore)
    case 'ORD': // Ordine Cliente
    case 'OF':  // Ordine Fornitore
      return 'ORDER';

    // Documenti di Trasporto (DDT e Carico Fornitore)
    case 'DDT': // DDT Vendita
    case 'CAF': // Carico Fornitore
      return 'DELIVERY_NOTE';

    // Fatture (vendita e acquisto)
    case 'FAI': // Fattura Immediata
    case 'FAD': // Fattura Differita
    case 'FAC': // Fattura Acquisto
      return 'INVOICE';

    // Note di Credito (cliente e fornitore)
    case 'NDC': // Nota di Credito
    case 'NCF': // Nota Credito Fornitore
      return 'CREDIT_NOTE';

    default:
      // Default a ORDER se code non riconosciuto
      console.warn(
        `⚠️ Codice tipo documento "${documentTypeCode}" non riconosciuto, uso ORDER come default`
      );
      return 'ORDER';
  }
}

/**
 * Ottiene la descrizione della categoria documento
 * 
 * @param category - DocumentCategory enum
 * @returns Descrizione in italiano
 */
export function getDocumentCategoryDescription(
  category: DocumentCategory
): string {
  switch (category) {
    case 'QUOTE':
      return 'Preventivo';
    case 'ORDER':
      return 'Ordine';
    case 'DELIVERY_NOTE':
      return 'DDT (Documento di Trasporto)';
    case 'INVOICE':
      return 'Fattura';
    case 'CREDIT_NOTE':
      return 'Nota di Credito';
    default:
      return 'Sconosciuto';
  }
}
