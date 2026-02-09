import { z } from 'zod';

/**
 * Schemi Zod per importazione documenti (wizard PDF/Immagine/XML)
 * Validazione client + server per upload e dati estratti (parsedData)
 */

export const uploadDocumentSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, 'File troppo grande (max 10MB)')
    .refine(
      (file) =>
        [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'text/xml',
          'application/xml',
        ].includes(file.type),
      'Tipo file non supportato (solo PDF, JPG, PNG, XML)'
    ),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;

export const parsedSupplierSchema = z.object({
  businessName: z.string().min(1, 'Ragione sociale obbligatoria'),
  vatNumber: z.string().optional(),
  fiscalCode: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  zipCode: z.string().optional(),
});

export const parsedProductSchema = z.object({
  description: z.string(),
  code: z.string().optional(),
  quantity: z.string(),
  unitPrice: z.string(),
  vatRate: z.string().optional(),
});

export const parsedDocumentSchema = z.object({
  documentNumber: z.string().optional(),
  documentDate: z.string().optional(),
  supplier: parsedSupplierSchema,
  lines: z.array(parsedProductSchema),
  netTotal: z.string().optional(),
  vatTotal: z.string().optional(),
  grossTotal: z.string().optional(),
});
