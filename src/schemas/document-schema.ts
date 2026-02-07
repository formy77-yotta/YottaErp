import { z } from 'zod';
import { priceSchema, quantitySchema, vatRateSchema } from './common-schema';

/**
 * Schemi Zod per documenti (Invoice, Order, DDT, etc.)
 * 
 * SCHEMA UNIVERSALE: Supporta qualsiasi tipo di documento (Fattura, DDT, Carico, etc.)
 * basandosi sulla configurazione DocumentTypeConfig.
 */

// ============================================================================
// SCHEMA RIGA DOCUMENTO UNIVERSALE
// ============================================================================

/**
 * Schema riga documento universale
 * 
 * Supporta:
 * - Prodotti con snapshot (productId opzionale per riferimento)
 * - Magazzino opzionale per riga (priorità 1 nella logica a cascata)
 * - Valori monetari come stringhe (convertiti in Decimal nel service)
 */
export const documentLineSchema = z.object({
  // Riferimento prodotto (opzionale, ma se presente deve essere valido)
  productId: z.string().cuid().optional(),
  
  // Snapshot prodotto (obbligatori)
  productCode: z.string().min(1, 'Codice prodotto obbligatorio'),
  description: z.string().min(1, 'Descrizione obbligatoria'),

  // Valori monetari come stringhe (convertiti in Decimal nel service)
  unitPrice: priceSchema,
  quantity: quantitySchema,
  vatRate: vatRateSchema,
  
  // Magazzino opzionale per riga (priorità 1 nella logica a cascata)
  // Se non specificato, viene usato product.defaultWarehouseId o document.mainWarehouseId
  warehouseId: z.string().cuid().optional(),
});

export type DocumentLineInput = z.infer<typeof documentLineSchema>;

// ============================================================================
// SCHEMA DOCUMENTO UNIVERSALE (creazione)
// ============================================================================

/**
 * Schema creazione documento universale
 * 
 * Funziona per qualsiasi tipo di documento (Fattura, DDT, Carico, etc.)
 * basandosi sulla configurazione DocumentTypeConfig.
 */
export const createDocumentSchema = z.object({
  // Tipo documento (obbligatorio)
  documentTypeId: z.string().cuid('ID tipo documento non valido'),
  
  // Numero documento (opzionale, proposto automaticamente ma modificabile)
  // Se non specificato, viene generato automaticamente basandosi su numeratorCode
  number: z.string().regex(/^\d+$/, 'Il numero documento deve contenere solo cifre').optional(),
  
  // Entità (cliente/fornitore) - opzionale per documenti interni
  entityId: z.string().cuid().optional(),
  
  // Data documento
  date: z.date().or(z.string().pipe(z.coerce.date())),
  
  // Magazzino predefinito documento (priorità 3 nella logica a cascata)
  // Usato come fallback se la riga non ha warehouseId e il prodotto non ha defaultWarehouseId
  mainWarehouseId: z.string().cuid().optional(),
  
  // Righe documento (minimo 1)
  lines: z
    .array(documentLineSchema)
    .min(1, 'Il documento deve contenere almeno una riga')
    .max(1000, 'Troppe righe (max 1000)'),
  
  // Note e termini pagamento (opzionali)
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

// ============================================================================
// SCHEMA DOCUMENTO UNIVERSALE (aggiornamento)
// ============================================================================

/**
 * Schema aggiornamento documento universale
 * 
 * NOTA: Alcuni campi potrebbero non essere modificabili dopo la creazione
 * (es. numero documento, tipo documento) per garantire l'integrità dei dati.
 * 
 * Per ora permette la modifica di:
 * - Data documento
 * - Righe documento (aggiungere, rimuovere, modificare)
 * - Note e termini pagamento
 * - Magazzino principale
 */
export const updateDocumentSchema = z.object({
  id: z.string().cuid('ID documento non valido'),
  
  // Data documento (modificabile)
  date: z.date().or(z.string().pipe(z.coerce.date())).optional(),
  
  // Magazzino predefinito documento (modificabile)
  mainWarehouseId: z.string().cuid().optional(),
  
  // Righe documento (modificabili)
  lines: z
    .array(documentLineSchema)
    .min(1, 'Il documento deve contenere almeno una riga')
    .max(1000, 'Troppe righe (max 1000)')
    .optional(),
  
  // Note e termini pagamento (modificabili)
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
});

export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

// ============================================================================
// SCHEMA FATTURA (legacy - mantenuto per compatibilità)
// ============================================================================

/**
 * @deprecated Usa createDocumentSchema per nuovi documenti
 * Mantenuto per compatibilità con codice esistente
 */
export const invoiceLineSchema = documentLineSchema;

export type InvoiceLineInput = DocumentLineInput;

export const createInvoiceSchema = createDocumentSchema.extend({
  customerId: z.string().cuid('ID cliente non valido'),
}).omit({ entityId: true });

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

// ============================================================================
// SCHEMA FATTURA (aggiornamento)
// ============================================================================

export const updateInvoiceSchema = createInvoiceSchema.partial().extend({
  id: z.string().cuid(),
});

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
