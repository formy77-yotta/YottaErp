/**
 * Editor per configurazioni standard (Super Admin)
 * 
 * Permette di modificare le configurazioni standard per:
 * - Aliquote IVA
 * - Unità di misura
 * - Tipi documento
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import type {
  StandardConfigType,
  VatRateConfig,
  UnitOfMeasureConfig,
  DocumentTypeConfig,
} from '@/services/actions/standard-config-actions';

interface StandardConfigEditorProps {
  type: StandardConfigType;
  config: {
    id: string;
    type: StandardConfigType;
    data: unknown;
    version: number;
    description: string | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  onSave: (type: StandardConfigType, data: unknown, description?: string | null) => Promise<void>;
  onCancel: () => void;
}

export function StandardConfigEditor({
  type,
  config,
  onSave,
  onCancel,
}: StandardConfigEditorProps) {
  const [description, setDescription] = useState(config?.description || '');
  const [isSaving, setIsSaving] = useState(false);

  // Inizializza dati in base al tipo
  const [vatRates, setVatRates] = useState<VatRateConfig[]>([]);
  const [unitsOfMeasure, setUnitsOfMeasure] = useState<UnitOfMeasureConfig[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeConfig[]>([]);

  useEffect(() => {
    if (config && config.data) {
      if (type === 'VAT_RATES' && Array.isArray(config.data)) {
        setVatRates(config.data as VatRateConfig[]);
      } else if (type === 'UNITS_OF_MEASURE' && Array.isArray(config.data)) {
        setUnitsOfMeasure(config.data as UnitOfMeasureConfig[]);
      } else if (type === 'DOCUMENT_TYPES' && Array.isArray(config.data)) {
        setDocumentTypes(config.data as DocumentTypeConfig[]);
      }
    } else {
      // Inizializza con dati vuoti o default
      if (type === 'VAT_RATES' && vatRates.length === 0) {
        setVatRates([
          {
            name: 'Standard 22%',
            value: '0.2200',
            nature: null,
            description: 'Aliquota IVA standard italiana',
            isDefault: true,
            active: true,
          },
        ]);
      } else if (type === 'UNITS_OF_MEASURE' && unitsOfMeasure.length === 0) {
        setUnitsOfMeasure([
          {
            code: 'PZ',
            name: 'Pezzi',
            measureClass: 'PIECE',
            baseFactor: '1.000000',
            active: true,
          },
        ]);
      } else if (type === 'DOCUMENT_TYPES' && documentTypes.length === 0) {
        setDocumentTypes([
          {
            code: 'PRO',
            description: 'Preventivo',
            numeratorCode: 'PRO',
            inventoryMovement: false,
            valuationImpact: false,
            operationSignStock: null,
            operationSignValuation: null,
            active: true,
          },
        ]);
      }
    }
  }, [config, type]);

  async function handleSave() {
    setIsSaving(true);
    try {
      let data: unknown;

      switch (type) {
        case 'VAT_RATES':
          data = vatRates;
          break;
        case 'UNITS_OF_MEASURE':
          data = unitsOfMeasure;
          break;
        case 'DOCUMENT_TYPES':
          data = documentTypes;
          break;
        default:
          throw new Error('Tipo configurazione non valido');
      }

      await onSave(type, data, description || null);
    } catch (error) {
      console.error('Errore salvataggio configurazione:', error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Descrizione */}
      <div className="space-y-2">
        <Label htmlFor="description">Descrizione (opzionale)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrizione della configurazione..."
          rows={2}
        />
      </div>

      {/* Editor in base al tipo */}
      {type === 'VAT_RATES' && (
        <VatRatesEditor rates={vatRates} onChange={setVatRates} />
      )}
      {type === 'UNITS_OF_MEASURE' && (
        <UnitsOfMeasureEditor units={unitsOfMeasure} onChange={setUnitsOfMeasure} />
      )}
      {type === 'DOCUMENT_TYPES' && (
        <DocumentTypesEditor types={documentTypes} onChange={setDocumentTypes} />
      )}

      {/* Bottoni */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          Annulla
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvataggio...
            </>
          ) : (
            'Salva Configurazione'
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Editor per Aliquote IVA
 */
function VatRatesEditor({
  rates,
  onChange,
}: {
  rates: VatRateConfig[];
  onChange: (rates: VatRateConfig[]) => void;
}) {
  function addRate() {
    onChange([
      ...rates,
      {
        name: '',
        value: '0.0000',
        nature: null,
        description: null,
        isDefault: false,
        active: true,
      },
    ]);
  }

  function removeRate(index: number) {
    onChange(rates.filter((_, i) => i !== index));
  }

  function updateRate(index: number, field: keyof VatRateConfig, value: unknown) {
    const updated = [...rates];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Aliquote IVA</CardTitle>
          <Button variant="outline" size="sm" onClick={addRate}>
            <Plus className="mr-2 h-4 w-4" />
            Aggiungi
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Valore (%)</TableHead>
              <TableHead>Natura</TableHead>
              <TableHead>Descrizione</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Attiva</TableHead>
              <TableHead>Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.map((rate, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Input
                    value={rate.name}
                    onChange={(e) => updateRate(index, 'name', e.target.value)}
                    placeholder="Es. Standard 22%"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="text"
                    value={rate.value}
                    onChange={(e) => updateRate(index, 'value', e.target.value)}
                    placeholder="0.2200"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={rate.nature || ''}
                    onChange={(e) => updateRate(index, 'nature', e.target.value || null)}
                    placeholder="N4, N1, etc."
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={rate.description || ''}
                    onChange={(e) => updateRate(index, 'description', e.target.value || null)}
                    placeholder="Descrizione"
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={rate.isDefault}
                    onCheckedChange={(checked) => updateRate(index, 'isDefault', checked)}
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={rate.active}
                    onCheckedChange={(checked) => updateRate(index, 'active', checked)}
                  />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => removeRate(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/**
 * Editor per Unità di Misura
 */
function UnitsOfMeasureEditor({
  units,
  onChange,
}: {
  units: UnitOfMeasureConfig[];
  onChange: (units: UnitOfMeasureConfig[]) => void;
}) {
  function addUnit() {
    onChange([
      ...units,
      {
        code: '',
        name: '',
        measureClass: 'PIECE',
        baseFactor: '1.000000',
        active: true,
      },
    ]);
  }

  function removeUnit(index: number) {
    onChange(units.filter((_, i) => i !== index));
  }

  function updateUnit(index: number, field: keyof UnitOfMeasureConfig, value: unknown) {
    const updated = [...units];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Unità di Misura</CardTitle>
          <Button variant="outline" size="sm" onClick={addUnit}>
            <Plus className="mr-2 h-4 w-4" />
            Aggiungi
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Codice</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead>Fattore Base</TableHead>
              <TableHead>Attiva</TableHead>
              <TableHead>Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.map((unit, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Input
                    value={unit.code}
                    onChange={(e) => updateUnit(index, 'code', e.target.value)}
                    placeholder="PZ"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={unit.name}
                    onChange={(e) => updateUnit(index, 'name', e.target.value)}
                    placeholder="Pezzi"
                  />
                </TableCell>
                <TableCell>
                  <select
                    value={unit.measureClass}
                    onChange={(e) => updateUnit(index, 'measureClass', e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="WEIGHT">Peso</option>
                    <option value="LENGTH">Lunghezza</option>
                    <option value="VOLUME">Volume</option>
                    <option value="PIECE">Pezzi</option>
                    <option value="AREA">Superficie</option>
                  </select>
                </TableCell>
                <TableCell>
                  <Input
                    type="text"
                    value={unit.baseFactor}
                    onChange={(e) => updateUnit(index, 'baseFactor', e.target.value)}
                    placeholder="1.000000"
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={unit.active}
                    onCheckedChange={(checked) => updateUnit(index, 'active', checked)}
                  />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => removeUnit(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/**
 * Editor per Tipi Documento
 */
function DocumentTypesEditor({
  types,
  onChange,
}: {
  types: DocumentTypeConfig[];
  onChange: (types: DocumentTypeConfig[]) => void;
}) {
  function addType() {
    onChange([
      ...types,
      {
        code: '',
        description: '',
        numeratorCode: '',
        inventoryMovement: false,
        valuationImpact: false,
        operationSignStock: null,
        operationSignValuation: null,
        active: true,
      },
    ]);
  }

  function removeType(index: number) {
    onChange(types.filter((_, i) => i !== index));
  }

  function updateType(index: number, field: keyof DocumentTypeConfig, value: unknown) {
    const updated = [...types];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Tipi Documento</CardTitle>
          <Button variant="outline" size="sm" onClick={addType}>
            <Plus className="mr-2 h-4 w-4" />
            Aggiungi
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead>Numeratore</TableHead>
                <TableHead>Mov. Magazzino</TableHead>
                <TableHead>Imp. Valutazione</TableHead>
                <TableHead>Segno Stock</TableHead>
                <TableHead>Segno Valutazione</TableHead>
                <TableHead>Attiva</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((type, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      value={type.code}
                      onChange={(e) => updateType(index, 'code', e.target.value)}
                      placeholder="PRO"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={type.description}
                      onChange={(e) => updateType(index, 'description', e.target.value)}
                      placeholder="Preventivo"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={type.numeratorCode}
                      onChange={(e) => updateType(index, 'numeratorCode', e.target.value)}
                      placeholder="PRO"
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={type.inventoryMovement}
                      onCheckedChange={(checked) =>
                        updateType(index, 'inventoryMovement', checked)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={type.valuationImpact}
                      onCheckedChange={(checked) =>
                        updateType(index, 'valuationImpact', checked)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <select
                      value={type.operationSignStock?.toString() || ''}
                      onChange={(e) =>
                        updateType(
                          index,
                          'operationSignStock',
                          e.target.value === '' ? null : parseInt(e.target.value)
                        )
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      disabled={!type.inventoryMovement}
                    >
                      <option value="">-</option>
                      <option value="1">+1 (Carico)</option>
                      <option value="-1">-1 (Scarico)</option>
                    </select>
                  </TableCell>
                  <TableCell>
                    <select
                      value={type.operationSignValuation?.toString() || ''}
                      onChange={(e) =>
                        updateType(
                          index,
                          'operationSignValuation',
                          e.target.value === '' ? null : parseInt(e.target.value)
                        )
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      disabled={!type.valuationImpact}
                    >
                      <option value="">-</option>
                      <option value="1">+1 (Incremento)</option>
                      <option value="-1">-1 (Decremento)</option>
                    </select>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={type.active}
                      onCheckedChange={(checked) => updateType(index, 'active', checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => removeType(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
