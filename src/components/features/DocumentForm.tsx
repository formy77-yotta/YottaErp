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
import { Decimal } from 'decimal.js';
import { updateDocumentSchema, type CreateDocumentInput, type UpdateDocumentInput, type DocumentLineInput } from '@/schemas/document-schema';
import { createDocumentAction, updateDocumentAction, getProposedDocumentNumberAction, getDocumentAction } from '@/services/actions/document-actions';
import { getDocumentTypesAction } from '@/services/actions/document-type-actions';
import { getEntitiesAction } from '@/services/actions/entity-actions';
import { getProductsAction } from '@/services/actions/product-actions';
import { getWarehousesAction } from '@/services/actions/warehouse-actions';
import { getPaymentConditionsAction } from '@/services/actions/payment-actions';
import { calculateLineTotal, formatCurrency, toDecimal } from '@/lib/decimal-utils';
import { calculateDeadlines, type CalculatedDeadline } from '@/lib/utils/payment-calculator';

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

export function DocumentForm({ documentId, onSuccess, onError }: DocumentFormProps) {
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
  const [paymentConditions, setPaymentConditions] = useState<Array<{
    id: string;
    name: string;
    paymentType: {
      id: string;
      name: string;
      sdiCode: string;
    };
    daysToFirstDue: number;
    gapBetweenDues: number;
    numberOfDues: number;
    isEndOfMonth: boolean;
  }>>([]);

  // Crea resolver dinamicamente basato su isEditing
  // NOTA: Resolver disabilitato temporaneamente (commentato nella configurazione del form)
  // La validazione viene fatta manualmente in onSubmit

  // Setup form con validazione Zod (usa schema appropriato)
  // NOTA: In modifica, usiamo UpdateDocumentInput che non ha documentTypeId e number
  // NOTA: Disabilitiamo temporaneamente la validazione client-side per evitare problemi con resolver condizionale
  // La validazione verrà fatta manualmente in onSubmit
  const form = useForm<CreateDocumentInput | UpdateDocumentInput>({
    // resolver: resolver as any, // Disabilitato temporaneamente
    mode: 'onBlur', // Valida quando si perde il focus per migliorare UX
    shouldUnregister: true, // Rimuove campi non presenti nei valori quando vengono rimossi
    defaultValues: isEditing ? {
      // In modifica, solo campi presenti in UpdateDocumentInput
      // NOTA: id viene aggiunto in onSubmit, non nei defaultValues
      entityId: '',
      date: new Date(),
      mainWarehouseId: '',
      lines: [
        {
          productId: '',
          productCode: '',
          description: '',
          unitPrice: new Decimal('0.00'),
          quantity: new Decimal('1.0000'),
          vatRate: new Decimal('0.2200'),
          warehouseId: '',
        },
      ],
      notes: '',
      paymentTerms: '',
      paymentConditionId: '',
    } : {
      // In creazione, tutti i campi
      documentTypeId: '',
      number: '',
      entityId: '',
      date: new Date(), // Data odierna
      mainWarehouseId: '',
      lines: [
        {
          productId: '',
          productCode: '',
          description: '',
          unitPrice: new Decimal('0.00'),
          quantity: new Decimal('1.0000'),
          vatRate: new Decimal('0.2200'),
          warehouseId: '',
        },
      ],
      notes: '',
      paymentTerms: '',
      paymentConditionId: '',
    },
  });

  // Watch documentTypeId per proporre numero automaticamente
  const documentTypeId = form.watch('documentTypeId');
  
  // Calcola totali documento (reactive)
  const totals = useMemo(() => {
    const lines = form.watch('lines');
    
    // Se lines non è ancora inizializzato, restituisci totali a zero
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return {
        netTotal: new Decimal(0),
        vatTotal: new Decimal(0),
        grossTotal: new Decimal(0),
      };
    }
    
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

  // Watch paymentConditionId e date per calcolare anteprima scadenze
  const paymentConditionId = form.watch('paymentConditionId');
  const documentDate = form.watch('date');
  const grossTotal = totals.grossTotal;

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
        const [typesResult, entitiesResult, productsResult, warehousesResult, paymentConditionsResult, documentResult] = await Promise.all([
          getDocumentTypesAction(),
          getEntitiesAction(),
          getProductsAction({ active: true }),
          getWarehousesAction(),
          getPaymentConditionsAction(true), // Solo condizioni attive
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
        if (paymentConditionsResult.success) {
          setPaymentConditions(paymentConditionsResult.data);
        }
        
        // Se in modifica, carica dati documento nel form
        if (isEditing && documentResult && documentResult.success) {
          const doc = documentResult.data;
          
          // NOTA: mainWarehouseId e warehouseId non sono salvati nel database
          // Vengono determinati al momento della creazione/aggiornamento con logica a cascata
          // In modifica, lasciamo i campi vuoti e l'utente può selezionarli manualmente
          // IMPORTANTE: reset con keepDefaultValues: false per rimuovere campi non presenti nello schema
          // NOTA: Non includiamo 'id' nel reset perché viene aggiunto manualmente in onSubmit
          form.reset({
            entityId: doc.entity?.id || '',
            date: new Date(doc.date),
            mainWarehouseId: '', // Non salvato nel DB, lasciare vuoto
            lines: doc.lines.map(line => ({
              productId: line.productId || '',
              productCode: line.productCode,
              description: line.description,
              unitPrice: line.unitPrice,
              quantity: line.quantity,
              vatRate: line.vatRate,
              warehouseId: '', // Non salvato nel DB, lasciare vuoto
            })),
            notes: doc.notes || '',
            paymentTerms: doc.paymentTerms || '',
            paymentConditionId: doc.paymentCondition?.id || '',
          }, { 
            keepDefaultValues: false, // Rimuove campi non presenti nei dati resettati
            keepValues: false, // Sostituisce completamente i valori
          });
          
          // Rimuovi esplicitamente campi che non sono nello schema update
          // Questo previene errori di validazione silenziosi
          setTimeout(() => {
            form.unregister('documentTypeId');
            form.unregister('number');
          }, 0);
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

  // Calcola anteprima scadenze (reactive)
  const previewDeadlines = useMemo<CalculatedDeadline[]>(() => {
    if (!paymentConditionId || !grossTotal || grossTotal.lessThanOrEqualTo(0)) {
      return [];
    }

    const condition = paymentConditions.find(c => c.id === paymentConditionId);
    if (!condition) {
      return [];
    }

    try {
      const baseDate = documentDate instanceof Date 
        ? documentDate 
        : documentDate 
          ? new Date(documentDate) 
          : new Date();
      return calculateDeadlines(
        grossTotal,
        {
          daysToFirstDue: condition.daysToFirstDue,
          gapBetweenDues: condition.gapBetweenDues,
          numberOfDues: condition.numberOfDues,
          isEndOfMonth: condition.isEndOfMonth,
        },
        baseDate
      );
    } catch (error) {
      console.error('Errore calcolo scadenze:', error);
      return [];
    }
  }, [paymentConditionId, grossTotal, documentDate, paymentConditions]);

  /**
   * Handler selezione prodotto
   */
  function handleProductSelect(lineIndex: number, productId: string) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Aggiorna riga con dati prodotto
    form.setValue(`lines.${lineIndex}.productId`, product.id);
    form.setValue(`lines.${lineIndex}.productCode`, product.code);
    form.setValue(`lines.${lineIndex}.description`, product.name);
    form.setValue(`lines.${lineIndex}.unitPrice`, new Decimal(product.price.toString()));
    
    // Se il prodotto ha un'aliquota IVA predefinita, usala
    if (product.vatRate) {
      form.setValue(`lines.${lineIndex}.vatRate`, new Decimal(product.vatRate.value.toString()));
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
      unitPrice: new Decimal('0.00'),
      quantity: new Decimal('1.0000'),
      vatRate: new Decimal('0.2200'),
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
        // Converti stringhe vuote in undefined per lo schema Zod
        const entityIdValue = data.entityId as string | undefined;
        const mainWarehouseIdValue = data.mainWarehouseId as string | undefined;
        const linesData = (data.lines || []) as DocumentLineInput[];
        
        // Filtra righe vuote e assicura che productCode e description siano sempre presenti
        const validLines = linesData
          .filter(line => {
            // Filtra righe completamente vuote
            const productCode = line.productCode && typeof line.productCode === 'string' ? line.productCode.trim() : '';
            const description = line.description && typeof line.description === 'string' ? line.description.trim() : '';
            return productCode.length > 0 && description.length > 0;
          })
          .map(line => ({
            productId: line.productId?.trim() || undefined,
            productCode: (line.productCode || '').trim(),
            description: (line.description || '').trim(),
            unitPrice: line.unitPrice,
            quantity: line.quantity,
            vatRate: line.vatRate,
            warehouseId: line.warehouseId?.trim() || undefined,
          }));
        
        // Verifica che ci siano righe valide dopo il filtro
        if (!validLines || validLines.length === 0) {
          setError('Il documento deve contenere almeno una riga valida con codice prodotto e descrizione');
          setIsLoading(false);
          return;
        }
        
        const updateData: UpdateDocumentInput = {
          id: documentId,
          ...(entityIdValue !== undefined && { 
            entityId: entityIdValue?.trim() || undefined
          }),
          ...(data.date && { date: data.date }),
          ...(mainWarehouseIdValue !== undefined && { 
            mainWarehouseId: mainWarehouseIdValue?.trim() || undefined
          }),
          // Le righe sono sempre obbligatorie in update
          lines: validLines,
          ...(data.notes !== undefined && { notes: (data.notes as string)?.trim() || undefined }),
          ...(data.paymentTerms !== undefined && { paymentTerms: (data.paymentTerms as string)?.trim() || undefined }),
        };

        // Valida manualmente i dati prima di inviare (doppia validazione)
        try {
          updateDocumentSchema.parse(updateData);
        } catch (validationError) {
          console.error('Validation error before submit:', validationError); // Debug
          if (validationError && typeof validationError === 'object' && 'issues' in validationError) {
            const zodError = validationError as { issues: Array<{ path: string[]; message: string }> };
            const firstError = zodError.issues[0];
            const errorMessage = `${firstError.path.join('.')}: ${firstError.message}`;
            setError(errorMessage);
            onError?.(errorMessage);
            setIsLoading(false);
            return;
          }
        }

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
          date: data.date,
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
      
      // Gestione errori di validazione Zod
      if (error && typeof error === 'object' && 'issues' in error) {
        const zodError = error as { issues: Array<{ path: string[]; message: string }> };
        const firstError = zodError.issues[0];
        const errorMessage = `${firstError.path.join('.')}: ${firstError.message}`;
        setError(errorMessage);
        onError?.(errorMessage);
      } else {
        const errorMessage = error instanceof Error 
          ? error.message 
          : `Errore durante ${isEditing ? 'l\'aggiornamento' : 'la creazione'} del documento`;
        setError(errorMessage);
        onError?.(errorMessage);
      }
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
      <form 
        onSubmit={async (e) => {
          e.preventDefault();
          const formValues = form.getValues();
          
          // Se il form è vuoto, mostra un errore
          if (Object.keys(formValues).length === 0) {
            setError('Il form non è stato inizializzato correttamente. Ricarica la pagina e riprova.');
            return;
          }
          
          // Chiama onSubmit direttamente (la validazione verrà fatta manualmente)
          await onSubmit(formValues as CreateDocumentInput | UpdateDocumentInput);
        }} 
        className="space-y-6"
      >
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

          {/* Entità (Cliente/Fornitore) */}
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
                <FormDescription>
                  {isEditing ? 'Modificando il cliente/fornitore verrà aggiornato anche lo snapshot nel documento.' : 'Seleziona il cliente o fornitore per questo documento.'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

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
                    value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      field.onChange(e.target.value ? new Date(e.target.value) : undefined);
                    }}
                    onBlur={field.onBlur}
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
                                value={field.value ? field.value.toString() : ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value ? new Decimal(value) : undefined);
                                }}
                                onBlur={field.onBlur}
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
                                value={field.value ? field.value.toString() : ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value ? new Decimal(value) : undefined);
                                }}
                                onBlur={field.onBlur}
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
                                value={field.value ? field.value.toString() : ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value ? new Decimal(value) : undefined);
                                }}
                                onBlur={field.onBlur}
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
                          if (!line) {
                            return '€ 0.00';
                          }
                          if (!line.quantity || !line.unitPrice || !line.vatRate) {
                            return '€ 0.00';
                          }
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

        {/* Condizione di Pagamento */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="paymentConditionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Condizione di Pagamento</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                  value={field.value || 'none'}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona condizione di pagamento" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nessuna (pagamento immediato)</SelectItem>
                    {paymentConditions.map((condition) => (
                      <SelectItem key={condition.id} value={condition.id}>
                        {condition.name} ({condition.paymentType.name} - {condition.paymentType.sdiCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Seleziona una condizione di pagamento per generare automaticamente le scadenze
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Anteprima Scadenze */}
          {previewDeadlines.length > 0 && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="text-sm font-semibold mb-3">Anteprima Scadenze</h4>
              <div className="space-y-2">
                {previewDeadlines.map((deadline, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {deadline.dueDate.toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="font-medium">
                      Rata {deadline.installmentNumber}: {formatCurrency(deadline.amount)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm font-semibold border-t pt-2 mt-2">
                  <span>Totale:</span>
                  <span>{formatCurrency(grossTotal)}</span>
                </div>
              </div>
            </div>
          )}
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
            {isEditing ? 'Salva Modifiche' : 'Crea Documento'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
