/**
 * Tipi snapshot documento per rendering PDF.
 * Usati dalla pipeline di rendering e dai layout (nessun accesso DB nel renderer).
 */

/** Snapshot riga documento (amounts come string per Decimal) */
export interface DocumentLineSnapshot {
  productCode: string;
  description: string;
  unitPrice: string;
  quantity: string;
  vatRate: string;
  netAmount: string;
  vatAmount: string;
  grossAmount: string;
  productType?: string;
}

/** Snapshot documento per rendering PDF */
export interface DocumentSnapshot {
  number: string;
  date: string;
  documentTypeDescription: string;
  customerNameSnapshot: string;
  customerVatSnapshot?: string | null;
  customerAddressSnapshot: string;
  customerCity: string;
  customerProvince: string;
  customerZip: string;
  customerCountry: string;
  netTotal: string;
  vatTotal: string;
  grossTotal: string;
  notes?: string | null;
  paymentTerms?: string | null;
  lines: DocumentLineSnapshot[];
}
