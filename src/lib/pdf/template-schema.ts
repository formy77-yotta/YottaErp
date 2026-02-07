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
 * Stile tabella (intestazione e righe alternate)
 */
export const tableStyleSchema = z.object({
  headerColor: hexColor.default('#374151'),
  stripedRows: z.boolean().default(true),
});

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
  tableStyle: tableStyleSchema.default({ headerColor: '#374151', stripedRows: true }),
  columnsConfig: columnsConfigSchema.default({
    showSku: true,
    showDiscount: false,
    showVatRate: true,
    showNetAmount: true,
    showVatAmount: true,
    showGrossAmount: true,
  }),
});

export type PrintTemplateConfig = z.infer<typeof PrintTemplateConfigSchema>;
export type ColumnsConfig = z.infer<typeof columnsConfigSchema>;
export type TableStyle = z.infer<typeof tableStyleSchema>;

/** Valori di default per nuovo template */
export const defaultPrintTemplateConfig: PrintTemplateConfig = {
  primaryColor: '#1e40af',
  secondaryColor: '#64748b',
  fontSize: 10,
  layoutType: 'standard',
  showLogo: true,
  showWatermark: false,
  tableStyle: { headerColor: '#374151', stripedRows: true },
  columnsConfig: {
    showSku: true,
    showDiscount: false,
    showVatRate: true,
    showNetAmount: true,
    showVatAmount: true,
    showGrossAmount: true,
  },
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
