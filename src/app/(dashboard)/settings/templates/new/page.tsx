/**
 * Pagina creazione nuovo modello di stampa (Wizard)
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { TemplateWizard } from '@/components/features/templates/TemplateWizard';
import { TemplatePreviewPdf } from '@/components/features/templates/TemplatePreviewPdf';
import { createTemplateAction } from '@/services/actions/template-actions';
import type { PrintTemplateConfigV2 } from '@/lib/pdf/config-schema-v2';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewTemplatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [previewConfig, setPreviewConfig] = useState<PrintTemplateConfigV2 | null>(null);

  const handleSave = async (config: PrintTemplateConfigV2) => {
    setError(null);
    setSaving(true);
    try {
      const name = templateName.trim() || 'Modello stampa';
      const result = await createTemplateAction(name, config as unknown);
      if (result.success) {
        router.replace('/settings/templates');
        return;
      }
      setError(result.error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings/templates">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Nuovo modello di stampa</h1>
          <p className="text-muted-foreground mt-1">
            Configura layout, colori, sezioni e colonne. L’anteprima si aggiorna in tempo reale.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <TemplateWizard
            templateName={templateName}
            onTemplateNameChange={setTemplateName}
            onSave={handleSave}
            onPreviewConfigChange={setPreviewConfig}
          />
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Anteprima PDF</CardTitle>
            </CardHeader>
            <CardContent>
              {previewConfig ? (
                <TemplatePreviewPdf
                  templateConfig={previewConfig}
                  organizationName="La tua organizzazione"
                />
              ) : (
                <div className="flex h-[480px] items-center justify-center rounded-lg border bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Completa gli step del wizard per vedere l’anteprima
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {saving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
          <p className="text-sm">Salvataggio in corso...</p>
        </div>
      )}
    </div>
  );
}
