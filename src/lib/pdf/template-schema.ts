/**
 * Schema Zod per configurazione modelli di stampa PDF (PrintTemplate)
 *
 * Ogni salvataggio del JSON config deve passare per SafeParse di Zod.
 * Usato da: PrintTemplate.config, AI bridge, TemplateEditor.
 */

import { z } from 'zod';

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Colore deve essere in formato hex (#RRGGBB)');

/**
 * Configurazione visibilità colonne tabella documento
 */
export const columnsConfigSchema = z.object({
  showSku: z.boolean().default(true),
  showDiscount: z.boolean().default(false),
  showVatRate: z.boolean().default(true),
  showNetAmount: z.boolean().default(true),
  showVatAmount: z.boolean().default(true),
  showGrossAmount: z.boolean().default(true),
});

/**
 * Stile tabella (intestazione, righe alternate, bordi)
 */
export const tableStyleSchema = z.object({
  headerColor: hexColor.default('#374151'),
  stripedRows: z.boolean().default(true),
  showBorders: z.boolean().default(true),
});

/**
 * Posizionamento dinamico per Report Builder (destinatario e logo)
 * - recipient: 'right' per buste con finestra italiane
 * - logo: posizione nell'header
 */
export const positionsSchema = z.object({
  recipient: z.enum(['left', 'right']).default('left'),
  logo: z.enum(['left', 'right', 'center']).default('left'),
});

/**
 * Stile condizionale: applicato a riga o cella quando la condizione è vera.
 * - target: 'row' = intera riga, 'cell' = singola cella
 * - condition: campo da controllare (es. 'productType', 'productCategoryCode')
 * - value: valore che attiva la regola (es. 'SERVICE')
 * - backgroundColor: colore sfondo (preferire pastello per leggibilità)
 * - color: colore testo (se sfondo scuro usare '#ffffff')
 */
export const conditionalStyleSchema = z.object({
  target: z.enum(['row', 'cell']).default('row'),
  condition: z.string().min(1),
  value: z.string().min(1),
  backgroundColor: hexColor,
  color: hexColor.optional(),
});
export type ConditionalStyleRule = z.infer<typeof conditionalStyleSchema>;

/**
 * Schema completo configurazione template stampa PDF
 */
export const PrintTemplateConfigSchema = z.object({
  primaryColor: hexColor.default('#1e40af'),
  secondaryColor: hexColor.default('#64748b'),
  fontSize: z.union([z.literal(8), z.literal(10), z.literal(12)]).default(10),
  layoutType: z
    .enum(['standard', 'modern', 'minimal'])
    .default('standard'),
  showLogo: z.boolean().default(true),
  showWatermark: z.boolean().default(false),
  tableStyle: tableStyleSchema.default({ headerColor: '#374151', stripedRows: true, showBorders: true }),
  columnsConfig: columnsConfigSchema.default({
    showSku: true,
    showDiscount: false,
    showVatRate: true,
    showNetAmount: true,
    showVatAmount: true,
    showGrossAmount: true,
  }),
  positions: positionsSchema.default({ recipient: 'left', logo: 'left' }),
  conditionalStyles: z.array(conditionalStyleSchema).default([]),
});

export type PrintTemplateConfig = z.infer<typeof PrintTemplateConfigSchema>;
export type ColumnsConfig = z.infer<typeof columnsConfigSchema>;
export type TableStyle = z.infer<typeof tableStyleSchema>;
export type PositionsConfig = z.infer<typeof positionsSchema>;

/** Valori di default per nuovo template */
export const defaultPrintTemplateConfig: PrintTemplateConfig = {
  primaryColor: '#1e40af',
  secondaryColor: '#64748b',
  fontSize: 10,
  layoutType: 'standard',
  showLogo: true,
  showWatermark: false,
  tableStyle: { headerColor: '#374151', stripedRows: true, showBorders: true },
  columnsConfig: {
    showSku: true,
    showDiscount: false,
    showVatRate: true,
    showNetAmount: true,
    showVatAmount: true,
    showGrossAmount: true,
  },
  positions: { recipient: 'left', logo: 'left' },
  conditionalStyles: [],
};

/**
 * Template di test "Alert Service": evidenzia le righe con productType === 'SERVICE'
 * in rosso pastello (#fecaca). Usato per verificare stili condizionali in anteprima PDF.
 */
export const alertServiceTemplateConfig: PrintTemplateConfig = {
  ...defaultPrintTemplateConfig,
  conditionalStyles: [
    {
      target: 'row',
      condition: 'productType',
      value: 'SERVICE',
      backgroundColor: '#fecaca',
    },
  ],
};

/**
 * Parsing sicuro del JSON config da DB.
 * Restituisce config validato o default in caso di errore.
 */
export function parseTemplateConfig(
  raw: unknown
): { success: true; data: PrintTemplateConfig } | { success: false; error: z.ZodError; data: PrintTemplateConfig } {
  const result = PrintTemplateConfigSchema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error,
    data: defaultPrintTemplateConfig,
  };
}
