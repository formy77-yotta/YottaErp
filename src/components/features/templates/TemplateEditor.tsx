/**
 * Editor modelli di stampa PDF: parametri manuali + input chat per AI + anteprima live
 */

'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PrintTemplateConfigSchema, type PrintTemplateConfig } from '@/lib/pdf/template-schema';
import { generateTemplateConfigViaAI } from '@/app/_actions/template-ai';
import { createTemplateAction, updateTemplateAction } from '@/services/actions/template-actions';
import { UniversalPdfRenderer } from '@/components/pdf/UniversalPdfRenderer';
import { sampleDocument } from '@/components/features/templates/sample-document';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';

const PDFViewer = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFViewer),
  { ssr: false }
);

interface TemplateEditorProps {
  /** Config iniziale (nuovo modello o modifica) */
  initialConfig: PrintTemplateConfig;
  /** Nome iniziale (solo in modifica) */
  initialName?: string;
  /** ID modello in modifica */
  templateId?: string;
  /** Nome organizzazione per intestazione PDF */
  organizationName?: string;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export function TemplateEditor({
  initialConfig,
  initialName = '',
  templateId,
  organizationName = 'La tua organizzazione',
  onSuccess,
  onError,
}: TemplateEditorProps) {
  const [config, setConfig] = useState<PrintTemplateConfig>(initialConfig);
  const [name, setName] = useState(initialName);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const form = useForm<PrintTemplateConfig>({
    resolver: zodResolver(PrintTemplateConfigSchema) as any,
    defaultValues: initialConfig,
  });

  const applyFormToConfig = useCallback(() => {
    const values = form.getValues();
    setConfig({
      primaryColor: values.primaryColor,
      secondaryColor: values.secondaryColor,
      fontSize: values.fontSize,
      layoutType: values.layoutType,
      showLogo: values.showLogo,
      showWatermark: values.showWatermark,
      tableStyle: values.tableStyle,
      columnsConfig: values.columnsConfig,
    });
  }, [form]);

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const result = await generateTemplateConfigViaAI(aiPrompt);
      if (result.success) {
        form.reset(result.config);
        setConfig(result.config);
      } else {
        onError?.(result.error);
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    applyFormToConfig();
    const values = form.getValues();
    const nameTrim = name.trim();
    if (!nameTrim) {
      onError?.('Inserisci un nome per il modello');
      return;
    }
    setSaveLoading(true);
    try {
      const payload = {
        primaryColor: values.primaryColor,
        secondaryColor: values.secondaryColor,
        fontSize: values.fontSize,
        layoutType: values.layoutType,
        showLogo: values.showLogo,
        showWatermark: values.showWatermark,
        tableStyle: values.tableStyle,
        columnsConfig: values.columnsConfig,
      };
      if (templateId) {
        const res = await updateTemplateAction(templateId, { name: nameTrim, config: payload });
        if (res.success) {
          onSuccess?.();
        } else {
          onError?.(res.error);
        }
      } else {
        const res = await createTemplateAction(nameTrim, payload);
        if (res.success) {
          onSuccess?.();
        } else {
          onError?.(res.error);
        }
      }
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Sinistra: form + AI */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Parametri modello</CardTitle>
            <CardDescription>Colori, layout e visibilità colonne</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome modello *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es. Fattura elegante"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Colore primario</Label>
                <Input
                  type="color"
                  className="h-10 w-full p-1"
                  value={form.watch('primaryColor')}
                  onChange={(e) => form.setValue('primaryColor', e.target.value)}
                />
                <Input
                  value={form.watch('primaryColor')}
                  onChange={(e) => form.setValue('primaryColor', e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Colore secondario</Label>
                <Input
                  type="color"
                  className="h-10 w-full p-1"
                  value={form.watch('secondaryColor')}
                  onChange={(e) => form.setValue('secondaryColor', e.target.value)}
                />
                <Input
                  value={form.watch('secondaryColor')}
                  onChange={(e) => form.setValue('secondaryColor', e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dimensione font</Label>
              <Select
                value={String(form.watch('fontSize'))}
                onValueChange={(v) => form.setValue('fontSize', Number(v) as 8 | 10 | 12)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8">8 pt</SelectItem>
                  <SelectItem value="10">10 pt</SelectItem>
                  <SelectItem value="12">12 pt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Layout</Label>
              <Select
                value={form.watch('layoutType')}
                onValueChange={(v: 'standard' | 'modern' | 'minimal') => form.setValue('layoutType', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="modern">Moderno</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Mostra logo</Label>
              <Switch
                checked={form.watch('showLogo')}
                onCheckedChange={(v) => form.setValue('showLogo', v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Filigrana</Label>
              <Switch
                checked={form.watch('showWatermark')}
                onCheckedChange={(v) => form.setValue('showWatermark', v)}
              />
            </div>
            <div className="space-y-2">
              <Label>Colore intestazione tabella</Label>
              <Input
                type="color"
                className="h-10 w-full p-1"
                value={form.watch('tableStyle.headerColor')}
                onChange={(e) =>
                  form.setValue('tableStyle', { ...form.watch('tableStyle'), headerColor: e.target.value })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Righe alternate (striped)</Label>
              <Switch
                checked={form.watch('tableStyle.stripedRows')}
                onCheckedChange={(v) =>
                  form.setValue('tableStyle', { ...form.watch('tableStyle'), stripedRows: v })
                }
              />
            </div>
            <div className="border-t pt-4 space-y-2">
              <Label>Colonne tabella</Label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {(['showSku', 'showVatRate', 'showNetAmount', 'showVatAmount', 'showGrossAmount', 'showDiscount'] as const).map((key) => (
                  <div key={key} className="flex items-center justify-between">
                    <span>{key.replace('show', '')}</span>
                    <Switch
                      checked={form.watch(`columnsConfig.${key}`)}
                      onCheckedChange={(v) =>
                        form.setValue('columnsConfig', { ...form.watch('columnsConfig'), [key]: v })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Genera con AI
            </CardTitle>
            <CardDescription>
              Descrivi il modello (es. &quot;layout elegante in blu&quot;) e applica la configurazione
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="Es. Voglio un layout elegante in blu con font 12"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              disabled={aiLoading}
            />
            <Button type="button" variant="secondary" onClick={handleAiGenerate} disabled={aiLoading}>
              {aiLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Genera configurazione
            </Button>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button onClick={() => { applyFormToConfig(); }} variant="outline">
            Aggiorna anteprima
          </Button>
          <Button onClick={handleSave} disabled={saveLoading}>
            {saveLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {templateId ? 'Salva modifiche' : 'Crea modello'}
          </Button>
        </div>
      </div>

      {/* Destra: anteprima PDF */}
      <Card>
        <CardHeader>
          <CardTitle>Anteprima</CardTitle>
          <CardDescription>Anteprima live con dati di esempio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden bg-gray-100" style={{ height: 600 }}>
            <PDFViewer width="100%" height="100%">
              <UniversalPdfRenderer
                document={sampleDocument}
                templateConfig={config}
                organizationName={organizationName}
              />
            </PDFViewer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
