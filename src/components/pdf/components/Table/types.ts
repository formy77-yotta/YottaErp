import type { DocumentLineSnapshot as DocLineSnapshot } from '@/lib/pdf/document-snapshot';

/** Riga tabella (estensione snapshot con campi opzionali per sconto) */
export type DocumentLineSnapshot = DocLineSnapshot & { discount?: string };

export interface TableColumnsConfig {
  showSku: boolean;
  showDescription: boolean;
  showQuantity: boolean;
  showUnitPrice: boolean;
  showDiscount: boolean;
  showVatRate: boolean;
  showNetAmount: boolean;
  showVatAmount: boolean;
  showGrossAmount: boolean;
}

export interface TableStyleConfig {
  headerColor: string;
  stripedRows: boolean;
  showBorders: boolean;
  fontSize: '8' | '10' | '12';
}

export interface ConditionalStyle {
  target: 'row' | 'cell';
  condition: string;
  value: string;
  backgroundColor: string;
  color?: string;
}

export interface BaseTableProps {
  lines: DocumentLineSnapshot[];
  columns: TableColumnsConfig;
  style: TableStyleConfig;
  conditionalStyles?: ConditionalStyle[];
}
