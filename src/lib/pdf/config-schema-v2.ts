/**
 * Schema Config V2 per Report PDF modulare
 * Supporta: baseLayout, sezioni, header/table/footer dettagliati, stili condizionali, custom sections.
 */

import { z } from 'zod';

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

/** Stili condizionali per righe/celle in base a campo e valore */
const ConditionalStyleSchema = z.object({
  target: z.enum(['row', 'cell']).default('row'),
  condition: z.string().min(1),
  value: z.string().min(1),
  backgroundColor: hexColor,
  color: hexColor.optional(),
});

/** Schema config template stampa PDF V2 */
export const PrintTemplateConfigSchemaV2 = z.object({
  baseLayout: z
    .enum([
      'invoice-standard',
      'invoice-modern',
      'invoice-minimal',
      'ddt-standard',
      'ddt-minimal',
      'order-standard',
    ])
    .default('invoice-standard'),

  sections: z
    .object({
      showHeader: z.boolean().default(true),
      showRecipient: z.boolean().default(true),
      showTable: z.boolean().default(true),
      showTotals: z.boolean().default(true),
      showNotes: z.boolean().default(true),
      showFooter: z.boolean().default(true),
      showWatermark: z.boolean().default(false),
      showLogo: z.boolean().default(true),
    })
    .default({} as any),

  header: z
    .object({
      variant: z.enum(['standard', 'modern', 'minimal']).default('standard'),
      logoPosition: z.enum(['left', 'center', 'right']).default('left'),
      showDate: z.boolean().default(true),
      backgroundColor: hexColor.optional(),
      textColor: hexColor.optional(),
    })
    .default({} as any),

  table: z
    .object({
      variant: z.enum(['standard', 'compact', 'detailed']).default('standard'),
      columns: z
        .object({
          showSku: z.boolean().default(true),
          showDescription: z.boolean().default(true),
          showQuantity: z.boolean().default(true),
          showUnitPrice: z.boolean().default(true),
          showDiscount: z.boolean().default(false),
          showVatRate: z.boolean().default(true),
          showNetAmount: z.boolean().default(true),
          showVatAmount: z.boolean().default(false),
          showGrossAmount: z.boolean().default(true),
        })
        .default({} as any),
      style: z
        .object({
          headerColor: hexColor.default('#1e40af'),
          stripedRows: z.boolean().default(true),
          showBorders: z.boolean().default(true),
          fontSize: z.enum(['8', '10', '12']).default('10'),
        })
        .default({} as any),
    })
    .default({} as any),

  conditionalStyles: z.array(ConditionalStyleSchema).default([]),

  customSections: z
    .object({
      customFields: z
        .array(
          z.object({
            name: z.string(),
            label: z.string(),
            value: z.string(),
            position: z.enum(['header', 'footer', 'beforeTable', 'afterTable']),
          })
        )
        .optional(),
    })
    .optional(),

  colors: z
    .object({
      primary: hexColor.default('#1e40af'),
      secondary: hexColor.default('#64748b'),
      text: hexColor.default('#0f172a'),
    })
    .default({} as any),
});

export type PrintTemplateConfigV2 = z.infer<typeof PrintTemplateConfigSchemaV2>;
export type ConditionalStyleRuleV2 = z.infer<typeof ConditionalStyleSchema>;

/** Config di default per nuovo template */
export const defaultPrintTemplateConfigV2: PrintTemplateConfigV2 = parseTemplateConfigV2({});

/** Parsing con default (partial safe) */
export function parseTemplateConfigV2(config: unknown): PrintTemplateConfigV2 {
  return PrintTemplateConfigSchemaV2.parse(config ?? {});
}

