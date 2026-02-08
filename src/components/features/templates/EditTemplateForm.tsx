'use client';

import { useState } from 'react';
import { TemplateWizard } from '@/components/features/templates/TemplateWizard';
import { TemplatePreviewPdf } from '@/components/features/templates/TemplatePreviewPdf';
import { updateTemplateAction } from '@/services/actions/template-actions';
import type { PrintTemplateConfigV2 } from '@/lib/pdf/config-schema-v2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EditTemplateFormProps {
  templateId: string;
  initialName: string;
  initialConfig: PrintTemplateConfigV2;
  organizationName: string;
  organizationLogoUrl?: string | null;
  redirectPath: string;
}

export function EditTemplateForm({
  templateId,
  initialName,
  initialConfig,
  organizationName,
  organizationLogoUrl,
  redirectPath,
}: EditTemplateFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState(initialName);
  const [previewConfig, setPreviewConfig] = useState<PrintTemplateConfigV2>(initialConfig);

  const handleSave = async (config: PrintTemplateConfigV2) => {
    setError(null);
    setSaving(true);
    try {
      const result = await updateTemplateAction(templateId, {
        name: templateName.trim() || initialName,
        config: config as unknown,
      });
      if (result.success) {
        window.location.href = redirectPath;
        return;
      }
      setError(result.error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <TemplateWizard
            initialConfig={initialConfig}
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
              <TemplatePreviewPdf
                templateConfig={previewConfig}
                organizationName={organizationName}
                organizationLogoUrl={organizationLogoUrl}
              />
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
