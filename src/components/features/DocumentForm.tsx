/**
 * Form per creazione documento universale
 * 
 * CARATTERISTICHE:
 * - Supporta qualsiasi tipo di documento (Fattura, DDT, Carico, etc.)
 * - Tabella righe dinamica con aggiunta/rimozione righe
 * - Calcolo automatico totali con Decimal.js
 * - Selezione prodotto con autocomplete
 * - Gestione magazzino a cascata (riga → prodotto → documento)
 * - Validazione con Zod
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Decimal } from 'decimal.js';
import { createDocumentSchema, updateDocumentSchema, type CreateDocumentInput, type UpdateDocumentInput } from '@/schemas/document-schema';
import { createDocumentAction, updateDocumentAction, getProposedDocumentNumberAction, getDocumentAction } from '@/services/actions/document-actions';
import { getDocumentTypesAction } from '@/services/actions/document-type-actions';
import { getEntitiesAction } from '@/services/actions/entity-actions';
import { getProductsAction } from '@/services/actions/product-actions';
import { getWarehousesAction } from '@/services/actions/warehouse-actions';
import { calculateLineTotal, formatCurrency, toDecimal } from '@/lib/decimal-utils';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Plus, Trash2 } from 'lucide-react';

interface DocumentFormProps {
  /**
   * Documento da modificare (undefined = creazione nuova)
   */
  documentId?: string;
  
  /**
   * Callback chiamato dopo salvataggio con successo
   */
  onSuccess?: () => void;
  
  /**
   * Callback chiamato in caso di errore
   */
  onError?: (error: string) => void;
}

export function DocumentForm({ documentId, onSuccess, onError }: DocumentFormProps = {}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const isEditing = !!documentId;
  
  // Dati caricati
  const [documentTypes, setDocumentTypes] = useState<Array<{
    id: string;
    code: string;
    description: string;
    inventoryMovement: boolean;
  }>>([]);
  const [entities, setEntities] = useState<Array<{
    id: string;
    businessName: string;
    vatNumber: string | null;
  }>>([]);
  const [products, setProducts] = useState<Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    price: string;
    vatRateId: string | null;
    vatRate: { value: string } | null;
    defaultWarehouseId: string | null;
  }>>([]);
  const [warehouses, setWarehouses] = useState<Array<{
    id: string;
    code: string;
    name: string;
  }>>([]);

  // Setup form con validazione Zod (usa schema appropriato)
  const form = useForm<CreateDocumentInput | UpdateDocumentInput>({
    resolver: zodResolver(isEditing ? updateDocumentSchema : createDocumentSchema) as any,
    defaultValues: {
      documentTypeId: '',
      number: '',
      entityId: '',
      date: new Date().toISOString().split('T')[0], // Data odierna
      mainWarehouseId: '',
      lines: [
        {
          productId: '',
          productCode: '',
          description: '',
          unitPrice: '0.00',
          quantity: '1.0000',
          vatRate: '0.2200',
          warehouseId: '',
        },
      ],
      notes: '',
      paymentTerms: '',
    },
  });

  // Watch documentTypeId per proporre numero automaticamente
  const documentTypeId = form.watch('documentTypeId');

  // Carica numero proposto quando si seleziona tipo documento
  useEffect(() => {
    async function loadProposedNumber() {
      if (!documentTypeId) {
        form.setValue('number', '');
        return;
      }

      try {
        const result = await getProposedDocumentNumberAction(documentTypeId);
        if (result.success) {
          form.setValue('number', result.data.number);
        }
      } catch (error) {
        console.error('Errore caricamento numero proposto:', error);
      }
    }

    loadProposedNumber();
  }, [documentTypeId, form]);

  // Gestione righe dinamiche
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  });

  // Carica dati iniziali e documento (se in modifica)
  useEffect(() => {
    async function loadData() {
      setLoadingData(true);
      
      try {
        const [typesResult, entitiesResult, productsResult, warehousesResult, documentResult] = await Promise.all([
          getDocumentTypesAction(),
          getEntitiesAction(),
          getProductsAction({ active: true }),
          getWarehousesAction(),
          isEditing && documentId ? getDocumentAction(documentId) : Promise.resolve(null),
        ]);

        if (typesResult.success) {
          setDocumentTypes(typesResult.data.filter(t => t.active));
        }
        if (entitiesResult.success) {
          setEntities(entitiesResult.data.filter(e => e.active));
        }
        if (productsResult.success) {
          setProducts(productsResult.data);
        }
        if (warehousesResult.success) {
          setWarehouses(warehousesResult.data);
        }
        
        // Se in modifica, carica dati documento nel form
        if (isEditing && documentResult && documentResult.success) {
          const doc = documentResult.data;
          form.reset({
            date: new Date(doc.date).toISOString().split('T')[0],
            mainWarehouseId: '', // Non disponibile nel documento, lasciare vuoto
            lines: doc.lines.map(line => ({
              productId: line.productId || '',
              productCode: line.productCode,
              description: line.description,
              unitPrice: line.unitPrice,
              quantity: line.quantity,
              vatRate: line.vatRate,
              warehouseId: line.warehouseId || '', // Recupera warehouseId se presente
            })),
            notes: doc.notes || '',
            paymentTerms: doc.paymentTerms || '',
          });
        }
      } catch (error) {
        console.error('Errore caricamento dati:', error);
        setError('Errore durante il caricamento dei dati');
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, [isEditing, documentId, form]);

  // Calcola totali documento (reactive)
  const totals = useMemo(() => {
    const lines = form.watch('lines');
    let netTotal = new Decimal(0);
    let vatTotal = new Decimal(0);
    let grossTotal = new Decimal(0);

    lines.forEach((line) => {
      try {
        const quantity = toDecimal(line.quantity);
        const unitPrice = toDecimal(line.unitPrice);
        const vatRate = toDecimal(line.vatRate);
        
        const lineTotals = calculateLineTotal(quantity, unitPrice, vatRate);
        netTotal = netTotal.plus(lineTotals.netAmount);
        vatTotal = vatTotal.plus(lineTotals.vatAmount);
        grossTotal = grossTotal.plus(lineTotals.grossAmount);
      } catch (error) {
        // Ignora errori di calcolo per righe incomplete
      }
    });

    return {
      netTotal: netTotal.toDecimalPlaces(2),
      vatTotal: vatTotal.toDecimalPlaces(2),
      grossTotal: grossTotal.toDecimalPlaces(2),
    };
  }, [form.watch('lines')]);

  /**
   * Handler selezione prodotto
   */
  function handleProductSelect(lineIndex: number, productId: string) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const currentLines = form.getValues('lines');
    const line = currentLines[lineIndex];
    
    // Aggiorna riga con dati prodotto
    form.setValue(`lines.${lineIndex}.productId`, product.id);
    form.setValue(`lines.${lineIndex}.productCode`, product.code);
    form.setValue(`lines.${lineIndex}.description`, product.name);
    form.setValue(`lines.${lineIndex}.unitPrice`, product.price);
    
    // Se il prodotto ha un'aliquota IVA predefinita, usala
    if (product.vatRate) {
      form.setValue(`lines.${lineIndex}.vatRate`, product.vatRate.value);
    }

    // ✅ Se il prodotto ha un magazzino predefinito, impostalo automaticamente
    if (product.defaultWarehouseId) {
      form.setValue(`lines.${lineIndex}.warehouseId`, product.defaultWarehouseId);
    }
  }

  /**
   * Handler aggiunta riga
   */
  function handleAddLine() {
    append({
      productId: '',
      productCode: '',
      description: '',
      unitPrice: '0.00',
      quantity: '1.0000',
      vatRate: '0.2200',
      warehouseId: '',
    });
  }

  /**
   * Handler rimozione riga
   */
  function handleRemoveLine(index: number) {
    if (fields.length > 1) {
      remove(index);
    }
  }

  /**
   * Handler submit form
   */
  async function onSubmit(data: CreateDocumentInput | UpdateDocumentInput) {
    setIsLoading(true);
    setError(null);

    try {
      if (isEditing && documentId) {
        // Aggiornamento documento esistente
        const updateData: UpdateDocumentInput = {
          id: documentId,
          ...(data.date && { date: new Date(data.date as string) }),
          ...(data.mainWarehouseId && { mainWarehouseId: data.mainWarehouseId }),
          ...(data.lines && { lines: data.lines }),
          ...(data.notes !== undefined && { notes: data.notes || '' }),
          ...(data.paymentTerms !== undefined && { paymentTerms: data.paymentTerms || '' }),
        };

        const result = await updateDocumentAction(updateData);

        if (result.success) {
          onSuccess?.();
          if (!onSuccess) {
            router.push(`/documents/${documentId}`);
            router.refresh();
          }
        } else {
          setError(result.error);
          onError?.(result.error);
        }
      } else {
        // Creazione nuovo documento
        const submitData: CreateDocumentInput = {
          ...data,
          date: new Date(data.date as string),
        } as CreateDocumentInput;

        const result = await createDocumentAction(submitData);

        if (result.success) {
          onSuccess?.();
          if (!onSuccess) {
            router.push('/documents');
            router.refresh();
          }
        } else {
          setError(result.error);
          onError?.(result.error);
        }
      }
    } catch (error) {
      console.error(`Errore ${isEditing ? 'aggiornamento' : 'creazione'} documento:`, error);
      const errorMessage = `Errore durante ${isEditing ? 'l\'aggiornamento' : 'la creazione'} del documento`;
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Messaggio Errore */}
        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        {/* Sezione Testata Documento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tipo Documento (solo in creazione) */}
          {!isEditing && (
            <FormField
              control={form.control}
              name="documentTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo Documento *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona tipo documento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {documentTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.description} ({type.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Numero Documento (solo in creazione) */}
          {!isEditing && (
            <FormField
              control={form.control}
              name="number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numero Documento</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="000001"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Numero documento (proposto automaticamente, modificabile). Verifica che non ci siano duplicati.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Entità (Cliente/Fornitore) - solo in creazione */}
          {!isEditing && (
            <FormField
              control={form.control}
              name="entityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente/Fornitore</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                    value={field.value || 'none'}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona cliente/fornitore" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nessuno (documento interno)</SelectItem>
                      {entities.map((entity) => (
                        <SelectItem key={entity.id} value={entity.id}>
                          {entity.businessName}
                          {entity.vatNumber && ` (P.IVA: ${entity.vatNumber})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Data Documento */}
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data Documento *</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Magazzino Principale */}
          <FormField
            control={form.control}
            name="mainWarehouseId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Magazzino Principale</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                  value={field.value || 'none'}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona magazzino (opzionale)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nessuno</SelectItem>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.code} - {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Magazzino predefinito per tutte le righe (priorità 3)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Sezione Righe Documento */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Righe Documento</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLine}
              disabled={isLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Riga
            </Button>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Prodotto</TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead className="w-[100px]">Quantità</TableHead>
                  <TableHead className="w-[120px]">Prezzo Unit.</TableHead>
                  <TableHead className="w-[100px]">IVA %</TableHead>
                  <TableHead className="w-[120px]">Totale Riga</TableHead>
                  <TableHead className="w-[150px]">Magazzino</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    {/* Prodotto */}
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`lines.${index}.productId`}
                        render={({ field }) => (
                          <FormItem>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value === 'none' ? '' : value);
                                if (value !== 'none') {
                                  handleProductSelect(index, value);
                                }
                              }}
                              value={field.value || 'none'}
                              disabled={isLoading}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleziona prodotto" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">Nessuno (descrizione libera)</SelectItem>
                                {products.map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.code} - {product.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TableCell>

                    {/* Descrizione */}
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`lines.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="Descrizione"
                                {...field}
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TableCell>

                    {/* Quantità */}
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`lines.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="1.0000"
                                {...field}
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TableCell>

                    {/* Prezzo Unitario */}
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`lines.${index}.unitPrice`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="0.00"
                                {...field}
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TableCell>

                    {/* IVA */}
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`lines.${index}.vatRate`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="0.2200"
                                {...field}
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TableCell>

                    {/* Totale Riga (calcolato) */}
                    <TableCell className="text-right font-medium">
                      {(() => {
                        try {
                          const line = form.watch(`lines.${index}`);
                          const quantity = toDecimal(line.quantity);
                          const unitPrice = toDecimal(line.unitPrice);
                          const vatRate = toDecimal(line.vatRate);
                          const totals = calculateLineTotal(quantity, unitPrice, vatRate);
                          return formatCurrency(totals.grossAmount);
                        } catch {
                          return '€ 0.00';
                        }
                      })()}
                    </TableCell>

                    {/* Magazzino Riga (opzionale) */}
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`lines.${index}.warehouseId`}
                        render={({ field }) => (
                          <FormItem>
                            <Select
                              onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                              value={field.value || 'none'}
                              disabled={isLoading}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Default" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">Default</SelectItem>
                                {warehouses.map((warehouse) => (
                                  <SelectItem key={warehouse.id} value={warehouse.id}>
                                    {warehouse.code}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TableCell>

                    {/* Pulsante Rimuovi */}
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveLine(index)}
                        disabled={isLoading || fields.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Totali Documento */}
        <div className="flex justify-end">
          <div className="w-full max-w-md space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Imponibile:</span>
              <span className="font-medium">{formatCurrency(totals.netTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">IVA:</span>
              <span className="font-medium">{formatCurrency(totals.vatTotal)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Totale:</span>
              <span>{formatCurrency(totals.grossTotal)}</span>
            </div>
          </div>
        </div>

        {/* Note e Termini Pagamento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Note aggiuntive..."
                    {...field}
                    disabled={isLoading}
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentTerms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Termini di Pagamento</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Es: 30 giorni, bonifico..."
                    {...field}
                    disabled={isLoading}
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Pulsanti Azione */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Annulla
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Crea Documento
          </Button>
        </div>
      </form>
    </Form>
  );
}
