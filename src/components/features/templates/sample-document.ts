import type { DocumentSnapshot } from '@/components/pdf/UniversalPdfRenderer';

/** Documento di esempio per anteprima live nell'editor modelli PDF */
export const sampleDocument: DocumentSnapshot = {
  number: '2025-001',
  date: new Date().toISOString(),
  documentTypeDescription: 'Fattura Immediata',
  customerNameSnapshot: 'Esempio S.r.l.',
  customerVatSnapshot: 'IT12345678901',
  customerAddressSnapshot: 'Via Roma 1',
  customerCity: 'Milano',
  customerProvince: 'MI',
  customerZip: '20100',
  customerCountry: 'IT',
  netTotal: '1000.00',
  vatTotal: '220.00',
  grossTotal: '1220.00',
  notes: 'Documento di anteprima.',
  paymentTerms: '30 gg fine mese',
  lines: [
    {
      productCode: 'ART-001',
      description: 'Prodotto di esempio A',
      unitPrice: '100.00',
      quantity: '5',
      vatRate: '0.22',
      netAmount: '500.00',
      vatAmount: '110.00',
      grossAmount: '610.00',
    },
    {
      productCode: 'ART-002',
      description: 'Prodotto di esempio B',
      unitPrice: '50.00',
      quantity: '10',
      vatRate: '0.22',
      netAmount: '500.00',
      vatAmount: '110.00',
      grossAmount: '610.00',
    },
  ],
};
