'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { parseTemplateConfigV2, type PrintTemplateConfigV2 } from '@/lib/pdf/config-schema-v2';

const LAYOUT_OPTIONS: { value: PrintTemplateConfigV2['baseLayout']; label: string }[] = [
  { value: 'invoice-standard', label: 'Fattura Standard' },
  { value: 'invoice-modern', label: 'Fattura Moderna' },
  { value: 'invoice-minimal', label: 'Fattura Minimal' },
  { value: 'ddt-standard', label: 'DDT Standard' },
  { value: 'ddt-minimal', label: 'DDT Minimal' },
  { value: 'order-standard', label: 'Ordine Standard' },
];

const SECTION_LABELS: Record<keyof PrintTemplateConfigV2['sections'], string> = {
  showHeader: 'Header',
  showRecipient: 'Destinatario',
  showTable: 'Tabella',
  showTotals: 'Totali',
  showNotes: 'Note',
  showFooter: 'Footer',
  showWatermark: 'Filigrana',
  showLogo: 'Logo',
};

export interface TemplateWizardProps {
  initialConfig?: Partial<PrintTemplateConfigV2>;
  onSave?: (config: PrintTemplateConfigV2) => void;
  templateName?: string;
  onTemplateNameChange?: (name: string) => void;
  /** Chiamata a ogni modifica della config (per anteprima live) */
  onPreviewConfigChange?: (config: PrintTemplateConfigV2) => void;
}

const defaultConfig = parseTemplateConfigV2({});

export function TemplateWizard({
  initialConfig,
  onSave,
  templateName = '',
  onTemplateNameChange,
  onPreviewConfigChange,
}: TemplateWizardProps) {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<PrintTemplateConfigV2>(() =>
    initialConfig ? parseTemplateConfigV2(initialConfig) : defaultConfig
  );
  const [name, setName] = useState(templateName);

  useEffect(() => {
    onPreviewConfigChange?.(config);
  }, [config, onPreviewConfigChange]);

  const handleSave = () => {
    onSave?.(config);
  };

  return (
    <div className="space-y-6">
      {step === 1 && (
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Step 1: Layout base</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {LAYOUT_OPTIONS.map((layout) => (
                <button
                  key={layout.value}
                  type="button"
                  onClick={() => setConfig({ ...config, baseLayout: layout.value })}
                  className={`rounded-lg border-2 p-4 text-left transition ${
                    config.baseLayout === layout.value
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/50'
                  }`}
                >
                  <p className="font-semibold">{layout.label}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Step 2: Colori</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Label>Colore primario</Label>
              <Input
                type="color"
                className="h-10 w-20 p-1"
                value={config.colors.primary}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    colors: { ...config.colors, primary: e.target.value },
                  })
                }
              />
              <Input
                className="font-mono text-sm"
                value={config.colors.primary}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    colors: { ...config.colors, primary: e.target.value },
                  })
                }
              />
            </div>
            <div className="flex items-center gap-4">
              <Label>Colore header tabella</Label>
              <Input
                type="color"
                className="h-10 w-20 p-1"
                value={config.table.style.headerColor}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    table: {
                      ...config.table,
                      style: { ...config.table.style, headerColor: e.target.value },
                    },
                  })
                }
              />
              <Input
                className="font-mono text-sm"
                value={config.table.style.headerColor}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    table: {
                      ...config.table,
                      style: { ...config.table.style, headerColor: e.target.value },
                    },
                  })
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Step 3: Sezioni</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(Object.keys(config.sections) as (keyof PrintTemplateConfigV2['sections'])[]).map(
              (key) => (
                <div key={key} className="flex items-center justify-between">
                  <Label>{SECTION_LABELS[key]}</Label>
                  <Switch
                    checked={config.sections[key]}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        sections: { ...config.sections, [key]: checked },
                      })
                    }
                  />
                </div>
              )
            )}
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Step 4: Tabella</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Stile tabella</Label>
              <Select
                value={config.table.variant}
                onValueChange={(value: PrintTemplateConfigV2['table']['variant']) =>
                  setConfig({
                    ...config,
                    table: { ...config.table, variant: value },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="compact">Compatta</SelectItem>
                  <SelectItem value="detailed">Dettagliata</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <Label>Righe alternate</Label>
              <Switch
                checked={config.table.style.stripedRows}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    table: {
                      ...config.table,
                      style: { ...config.table.style, stripedRows: checked },
                    },
                  })
                }
              />
            </div>
            <div>
              <Label>Colonne visibili</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(Object.keys(config.table.columns) as (keyof PrintTemplateConfigV2['table']['columns'])[]).map(
                  (key) => (
                    <div key={key} className="flex items-center gap-2">
                      <Switch
                        checked={config.table.columns[key]}
                        onCheckedChange={(checked) =>
                          setConfig({
                            ...config,
                            table: {
                              ...config.table,
                              columns: { ...config.table.columns, [key]: checked },
                            },
                          })
                        }
                      />
                      <Label className="text-sm font-normal">
                        {key.replace('show', '').replace(/([A-Z])/g, ' $1').trim()}
                      </Label>
                    </div>
                  )
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-muted-foreground">Nome modello</Label>
          <Input
            placeholder="Es. Fattura elegante"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              onTemplateNameChange?.(e.target.value);
            }}
            className="max-w-xs"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            Indietro
          </Button>
          {step < 4 ? (
            <Button onClick={() => setStep((s) => s + 1)}>Avanti</Button>
          ) : (
            <Button onClick={handleSave}>Salva template</Button>
          )}
        </div>
      </div>

      <Card className="p-6">
        <CardHeader>
          <CardTitle className="text-base">Anteprima</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              Layout: {LAYOUT_OPTIONS.find((o) => o.value === config.baseLayout)?.label ?? config.baseLayout}.
              Usa la pagina Modelli → modifica per anteprima PDF live.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
