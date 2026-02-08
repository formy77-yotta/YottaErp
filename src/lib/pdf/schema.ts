/**
 * Schema Report Builder: posizionamento blocchi e colori per Report PDF.
 * L'AI controlla posizioni (header) e colori; il renderer usa questi valori.
 */

import { z } from 'zod';

/** Schema per posizionamento blocchi (header) e colori - usato dall'AI e dal report */
export const reportBlocksSchema = z.object({
  header: z.object({
    recipientPosition: z.enum(['left', 'right']),
    logoPosition: z.enum(['left', 'center', 'right']),
  }),
  colors: z.object({
    primary: z.string(),
  }),
  table: z
    .object({
      showBorders: z.boolean(),
    })
    .optional(),
});

export type ReportBlocksConfig = z.infer<typeof reportBlocksSchema>;

export {
  positionsSchema,
  type PositionsConfig,
  type PrintTemplateConfig,
  PrintTemplateConfigSchema,
  defaultPrintTemplateConfig,
  parseTemplateConfig,
} from './template-schema';
