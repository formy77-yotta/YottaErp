'use client';

import React, { useEffect, useState, useRef } from 'react';
import { pdf } from '@react-pdf/renderer';
import { getLayoutComponent } from '@/lib/pdf/template-registry';
import { parseTemplateConfigV2, type PrintTemplateConfigV2 } from '@/lib/pdf/config-schema-v2';
import type { DocumentSnapshot } from '@/lib/pdf/document-snapshot';
import { sampleDocument } from './sample-document';

interface TemplatePreviewPdfProps {
  /** Config template (sempre in formato modulare V2) */
  templateConfig: unknown;
  /** Documento per anteprima (default: sampleDocument) */
  document?: DocumentSnapshot;
  /** Nome organizzazione */
  organizationName?: string;
  /** URL logo organizzazione */
  organizationLogoUrl?: string | null;
  /** Debounce ms prima di rigenerare (default 400) */
  debounceMs?: number;
}

export function TemplatePreviewPdf({
  templateConfig,
  document: doc = sampleDocument,
  organizationName = 'La tua organizzazione',
  organizationLogoUrl = null,
  debounceMs = 400,
}: TemplatePreviewPdfProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const lastKeyRef = useRef<string>('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const config = parseTemplateConfigV2(templateConfig) as PrintTemplateConfigV2;
    const key = JSON.stringify(config);

    const generate = () => {
      lastKeyRef.current = key;
      const LayoutComponent = getLayoutComponent(config.baseLayout);
      const pdfDoc = React.createElement(LayoutComponent, {
        document: doc,
        config,
        organization: { name: organizationName, logoUrl: organizationLogoUrl },
      });
      pdf(pdfDoc)
        .toBlob()
        .then((blob) => {
          if (lastKeyRef.current !== key) return;
          const url = URL.createObjectURL(blob);
          if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = url;
          setBlobUrl(url);
        })
        .catch(() => {});
    };

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(generate, debounceMs);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [templateConfig, doc, organizationName, organizationLogoUrl, debounceMs]);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  if (!blobUrl) {
    return (
      <div className="flex h-[480px] items-center justify-center rounded-lg border bg-muted/30">
        <p className="text-sm text-muted-foreground">Generazione anteprima...</p>
      </div>
    );
  }

  return (
    <iframe
      src={blobUrl}
      title="Anteprima PDF"
      className="h-[480px] w-full rounded-lg border"
    />
  );
}
