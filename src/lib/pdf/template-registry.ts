/**
 * Registry dei layout PDF: mappa baseLayout → componente React PDF
 */

import type { ComponentType } from 'react';
import { InvoiceStandardLayout } from '@/components/pdf/layouts/InvoiceStandardLayout';
import { InvoiceModernLayout } from '@/components/pdf/layouts/InvoiceModernLayout';
import { DDTMinimalLayout } from '@/components/pdf/layouts/DDTMinimalLayout';
import type { PrintTemplateConfigV2 } from './config-schema-v2';
import type { DocumentSnapshot } from '@/lib/pdf/document-snapshot';

export interface LayoutProps {
  document: DocumentSnapshot;
  config: PrintTemplateConfigV2;
  organization: {
    name: string;
    logoUrl?: string | null;
  };
}

export const LAYOUT_REGISTRY: Record<PrintTemplateConfigV2['baseLayout'], ComponentType<LayoutProps>> = {
  'invoice-standard': InvoiceStandardLayout,
  'invoice-modern': InvoiceModernLayout,
  'invoice-minimal': InvoiceStandardLayout,
  'ddt-standard': InvoiceStandardLayout,
  'ddt-minimal': DDTMinimalLayout,
  'order-standard': InvoiceStandardLayout,
};

export type LayoutKey = keyof typeof LAYOUT_REGISTRY;

export function getLayoutComponent(layoutKey: LayoutKey): ComponentType<LayoutProps> {
  return LAYOUT_REGISTRY[layoutKey] ?? LAYOUT_REGISTRY['invoice-standard'];
}
