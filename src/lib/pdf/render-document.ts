/**
 * Pipeline di rendering PDF con config V2 e layout modulari
 */

import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { getLayoutComponent } from './template-registry';
import { parseTemplateConfigV2, type PrintTemplateConfigV2 } from './config-schema-v2';
import type { DocumentSnapshot } from '@/lib/pdf/document-snapshot';

export interface RenderOptions {
  document: DocumentSnapshot;
  templateConfig: unknown;
  organization: {
    name: string;
    logoUrl?: string | null;
  };
}

/**
 * Genera il PDF come Blob usando config modulare e layout dal registry.
 * La config viene sempre normalizzata con parseTemplateConfigV2 (default dove mancano campi).
 */
export async function renderDocumentPDF(options: RenderOptions): Promise<Blob> {
  const config = parseTemplateConfigV2(options.templateConfig) as PrintTemplateConfigV2;
  const LayoutComponent = getLayoutComponent(config.baseLayout);

  const pdfDocument = React.createElement(LayoutComponent, {
    document: options.document,
    config,
    organization: options.organization,
  });

  const blob = await pdf(pdfDocument).toBlob();
  return blob;
}

/**
 * Genera URL di anteprima (object URL) per il PDF.
 * Il chiamante deve revocare l'URL con URL.revokeObjectURL quando non serve più.
 */
export async function generatePreviewURL(options: RenderOptions): Promise<string> {
  const blob = await renderDocumentPDF(options);
  return URL.createObjectURL(blob);
}
