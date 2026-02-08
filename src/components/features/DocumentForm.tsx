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
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { Decimal } from 'decimal.js';
import { updateDocumentSchema, type CreateDocumentInput, type UpdateDocumentInput, type DocumentLineInput } from '@/schemas/document-schema';
import { createDocumentAction, updateDocumentAction, getProposedDocumentNumberAction, getDocumentAction } from '@/services/actions/document-actions';
import { getDocumentTypesAction } from '@/services/actions/document-type-actions';
import { getEntitiesAction, getEntityAddressesAction, type EntityRow } from '@/services/actions/entity-actions';
import type { EntityAddressRow } from '@/services/actions/entity-actions';
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
import { Loader2, MapPin, Plus, Trash2 } from 'lucide-react';

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
  const [entityAddresses, setEntityAddresses] = useState<EntityAddressRow[]>([]);

  // In modifica: righe caricate dal documento, usate per totali/validazione finché useWatch non si aggiorna dopo reset
  const [loadedLinesSnapshot, setLoadedLinesSnapshot] = useState<Array<{
    productId?: string;
    productCode?: string;
    description?: string;
    unitPrice?: string | Decimal;
    quantity?: string | Decimal;
    vatRate?: string | Decimal;
    warehouseId?: string;
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
      entityAddressId: '',
      shippingAddressId: '',
      shippingNominative: '',
      shippingReceiverName: '',
      shippingStreet: '',
      shippingCity: '',
      shippingZipCode: '',
      shippingProvince: '',
      shippingCountry: 'IT',
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
      entityAddressId: '',
      shippingAddressId: '',
      shippingNominative: '',
      shippingReceiverName: '',
      shippingStreet: '',
      shippingCity: '',
      shippingZipCode: '',
      shippingProvince: '',
      shippingCountry: 'IT',
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
  const selectedEntityId = form.watch('entityId');
  const shippingAddressId = form.watch('shippingAddressId');
  const isManualShipping = shippingAddressId === 'manual';

  // Carica indirizzi dell'entità quando si seleziona un cliente/fornitore (indirizzo cliente + destinazione consegna)
  useEffect(() => {
    if (!selectedEntityId || typeof selectedEntityId !== 'string' || !selectedEntityId.trim()) {
      setEntityAddresses([]);
      form.setValue('entityAddressId', '');
      form.setValue('shippingAddressId', '');
      form.setValue('shippingNominative', '');
      form.setValue('shippingReceiverName', '');
      form.setValue('shippingStreet', '');
      form.setValue('shippingCity', '');
      form.setValue('shippingZipCode', '');
      form.setValue('shippingProvince', '');
      form.setValue('shippingCountry', 'IT');
      return;
    }
    setEntityAddresses([]);
    form.setValue('entityAddressId', '');
    form.setValue('shippingAddressId', '');
    form.setValue('shippingReceiverName', '');
    form.setValue('shippingStreet', '');
    form.setValue('shippingCity', '');
    form.setValue('shippingZipCode', '');
    form.setValue('shippingProvince', '');
    form.setValue('shippingCountry', 'IT');
    getEntityAddressesAction(selectedEntityId).then((res) => {
      if (res.success && res.data.length > 0) {
        setEntityAddresses(res.data);
        const defaultAddr = res.data.find((a) => a.isDefault);
        form.setValue('entityAddressId', defaultAddr ? defaultAddr.id : '');
      } else {
        setEntityAddresses([]);
        form.setValue('entityAddressId', '');
      }
    });
  }, [selectedEntityId, form]);

  // useWatch fa sì che il componente si ri-renderizzi quando cambiano le righe → totali sempre aggiornati
  const watchedLines = useWatch({
    control: form.control,
    name: 'lines',
  });

  // In modifica: subito dopo il reset useWatch può restituire ancora la riga vuota di default → usa snapshot
  // Usa watchedLines solo se sembrano dati “reali” (es. productCode valorizzato)
  // Preferisci watchedLines quando hanno contenuto (totali interattivi). Snapshot solo se riga ancora vuota.
  // In modifica unisci form e snapshot: se prezzo/quantità/IVA dal form sono 0 o vuoti, usa i valori caricati (evita totali a zero)
  const linesForTotals = useMemo(() => {
    const fromWatch = Array.isArray(watchedLines) ? watchedLines : [];
    if (isEditing && loadedLinesSnapshot.length > 0) {
      if (fromWatch.length === 0) return loadedLinesSnapshot;
      return fromWatch.map((line, i) => {
        const snap = loadedLinesSnapshot[i];
        const up = line?.unitPrice ?? snap?.unitPrice;
        const qty = line?.quantity ?? snap?.quantity;
        const vat = line?.vatRate ?? snap?.vatRate;
        const upStr = up != null ? String(up).trim() : '';
        const qtyStr = qty != null ? String(qty).trim() : '';
        const vatStr = vat != null ? String(vat).trim() : '';
        return {
          ...line,
          unitPrice: upStr !== '' && upStr !== '0' ? up : (snap?.unitPrice ?? '0'),
          quantity: qtyStr !== '' ? qty : (snap?.quantity ?? '1'),
          vatRate: vatStr !== '' ? vat : (snap?.vatRate ?? '0.22'),
        };
      });
    }
    return fromWatch;
  }, [watchedLines, isEditing, loadedLinesSnapshot]);

  // Calcola totali documento in modo interattivo (si aggiornano ad ogni modifica di quantità/prezzo/IVA)
  const totals = useMemo(() => {
    if (!linesForTotals.length) {
      return {
        netTotal: new Decimal(0),
        vatTotal: new Decimal(0),
        grossTotal: new Decimal(0),
      };
    }

    let netTotal = new Decimal(0);
    let vatTotal = new Decimal(0);
    let grossTotal = new Decimal(0);

    linesForTotals.forEach((line) => {
      try {
        const quantity = toDecimal(line?.quantity ?? 0);
        const unitPrice = toDecimal(line?.unitPrice ?? 0);
        const vatRate = toDecimal(line?.vatRate ?? 0);
        const lineTotals = calculateLineTotal(quantity, unitPrice, vatRate);
        netTotal = netTotal.plus(lineTotals.netAmount);
        vatTotal = vatTotal.plus(lineTotals.vatAmount);
        grossTotal = grossTotal.plus(lineTotals.grossAmount);
      } catch {
        // Ignora righe incomplete
      }
    });

    return {
      netTotal: netTotal.toDecimalPlaces(2),
      vatTotal: vatTotal.toDecimalPlaces(2),
      grossTotal: grossTotal.toDecimalPlaces(2),
    };
  }, [linesForTotals]);

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
  const { fields, append, remove, replace } = useFieldArray({
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
          getEntitiesAction(undefined, { perPage: '500' }),
          getProductsAction({ active: true }, { perPage: '500' }),
          getWarehousesAction(),
          getPaymentConditionsAction(true), // Solo condizioni attive
          isEditing && documentId ? getDocumentAction(documentId) : Promise.resolve(null),
        ]);

        if (typesResult.success) {
          setDocumentTypes(typesResult.data.filter(t => t.active));
        }
        if (entitiesResult.success) {
          setEntities(entitiesResult.data.data.filter((e: EntityRow) => e.active));
        }
        if (productsResult.success) {
          setProducts(productsResult.data.data);
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
          // Valori sempre stringa per evitare che il form azzeri (prezzo/quantità/IVA)
          const linesForForm = doc.lines.map((line) => ({
            productId: line.productId || '',
            productCode: line.productCode ?? '',
            description: line.description ?? '',
            unitPrice: line.unitPrice != null && line.unitPrice !== '' ? String(line.unitPrice) : '0',
            quantity: line.quantity != null && line.quantity !== '' ? String(line.quantity) : '1',
            vatRate: line.vatRate != null && line.vatRate !== '' ? String(line.vatRate) : '0.22',
            warehouseId: '',
          }));

          const linesWithDecimal = doc.lines.map((line) => ({
            productId: line.productId || '',
            productCode: line.productCode ?? '',
            description: line.description ?? '',
            unitPrice: new Decimal(line.unitPrice != null && String(line.unitPrice).trim() !== '' ? String(line.unitPrice) : '0'),
            quantity: new Decimal(line.quantity != null && String(line.quantity).trim() !== '' ? String(line.quantity) : '1'),
            vatRate: new Decimal(line.vatRate != null && String(line.vatRate).trim() !== '' ? String(line.vatRate) : '0.22'),
            warehouseId: '',
          }));

          setLoadedLinesSnapshot(linesForForm);

          const hasShippingSnapshot =
            (doc.shippingStreet?.trim() ?? '') !== '' ||
            (doc.shippingCity?.trim() ?? '') !== '' ||
            (doc.shippingReceiverName?.trim() ?? '') !== '' ||
            (doc.shippingNominative?.trim() ?? '') !== '';
          const shippingIdForm =
            hasShippingSnapshot && !doc.shippingAddressId
              ? 'manual'
              : (doc.shippingAddressId ?? 'same');
          form.reset({
            entityId: doc.entityId ?? doc.entity?.id ?? '',
            entityAddressId: '',
            shippingAddressId: shippingIdForm,
            shippingNominative: doc.shippingNominative ?? '',
            shippingReceiverName: doc.shippingReceiverName ?? '',
            shippingStreet: doc.shippingStreet ?? '',
            shippingCity: doc.shippingCity ?? '',
            shippingZipCode: doc.shippingZipCode ?? '',
            shippingProvince: doc.shippingProvince ?? '',
            shippingCountry: doc.shippingCountry ?? 'IT',
            date: new Date(doc.date),
            mainWarehouseId: '',
            lines: linesWithDecimal,
            notes: doc.notes || '',
            paymentTerms: doc.paymentTerms || '',
            paymentConditionId: doc.paymentConditionId ?? doc.paymentCondition?.id ?? '',
          }, {
            keepDefaultValues: false,
            keepValues: false,
          });

          // Forza di nuovo le righe dopo il reset (evita che il field array resti con i default)
          requestAnimationFrame(() => {
            replace(linesWithDecimal);
          });

          setTimeout(() => {
            form.unregister('documentTypeId');
            form.unregister('number');
          }, 0);
        } else if (!isEditing) {
          setLoadedLinesSnapshot([]);
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
   * Helper per convertire Decimal o string in string
   * Necessario per serializzazione Server Action (Zod trasformerà le stringhe in Decimal)
   */
  function toDecimalString(value: Decimal | string | unknown): string {
    if (value instanceof Decimal) {
      return value.toString();
    }
    if (typeof value === 'string') {
      return value;
    }
    return '0';
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

        // In modifica integra con snapshot: productId, productCode, description, prezzo, quantità, IVA (evita invio 0 al backend)
        const linesToNormalize =
          isEditing && loadedLinesSnapshot.length >= linesData.length
            ? linesData.map((line, i) => {
                const snap = loadedLinesSnapshot[i];
                const up = line?.unitPrice ?? snap?.unitPrice;
                const qty = line?.quantity ?? snap?.quantity;
                const vat = line?.vatRate ?? snap?.vatRate;
                const upStr = up != null ? String(up).trim() : '';
                const qtyStr = qty != null ? String(qty).trim() : '';
                const vatStr = vat != null ? String(vat).trim() : '';
                const unitPriceOk = upStr !== '' && upStr !== '0';
                const qtyOk = qtyStr !== '' && qtyStr !== '0';
                const vatOk = vatStr !== '';
                return {
                  ...line,
                  productId:
                    (line?.productId && String(line.productId).trim()) ||
                    (snap?.productId && String(snap.productId).trim()) ||
                    undefined,
                  productCode:
                    String(line?.productCode ?? '').trim() ||
                    String(snap?.productCode ?? '').trim(),
                  description:
                    String(line?.description ?? '').trim() ||
                    String(snap?.description ?? '').trim(),
                  warehouseId:
                    (line?.warehouseId && String(line.warehouseId).trim()) ||
                    (snap?.warehouseId && String(snap.warehouseId).trim()) ||
                    undefined,
                  unitPrice: unitPriceOk ? line?.unitPrice : (snap?.unitPrice ?? '0'),
                  quantity: qtyOk ? line?.quantity : (snap?.quantity ?? '1'),
                  vatRate: vatOk ? line?.vatRate : (snap?.vatRate ?? '0.22'),
                };
              })
            : linesData;

        // Normalizza e arricchisce: se ancora mancano, recupera da anagrafica prodotti (productId)
        const normalizedLines = linesToNormalize.map((line) => {
          let productCode = String(line?.productCode ?? '').trim();
          let description = String(line?.description ?? '').trim();
          if ((!productCode || !description) && line?.productId) {
            const product = products.find((p) => p.id === line.productId);
            if (product) {
              if (!productCode) productCode = product.code;
              if (!description) description = product.name ?? '';
            }
          }
          return {
            productId: line?.productId?.trim() || undefined,
            productCode,
            description,
            unitPrice: line?.unitPrice,
            quantity: line?.quantity,
            vatRate: line?.vatRate,
            warehouseId: line?.warehouseId?.trim() || undefined,
          };
        });

        const validLines = normalizedLines
          .filter((line) => line.productCode.length > 0 && line.description.length > 0)
          .map((line) => ({
            productId: line.productId,
            productCode: line.productCode,
            description: line.description,
            unitPrice: toDecimalString(line.unitPrice),
            quantity: toDecimalString(line.quantity),
            vatRate: toDecimalString(line.vatRate),
            warehouseId: line.warehouseId,
          }));

        if (validLines.length === 0) {
          setError('Il documento deve contenere almeno una riga valida con codice prodotto e descrizione');
          setIsLoading(false);
          return;
        }
        
        const entityAddressIdValue = (data as UpdateDocumentInput).entityAddressId as string | undefined;
        const shippingIdRaw = (data as UpdateDocumentInput).shippingAddressId as string | undefined;
        const sidUpdate = shippingIdRaw?.trim() || '';
        const isManualUpdate = sidUpdate === 'manual';
        const updateData = {
          id: documentId,
          ...(entityIdValue !== undefined && { 
            entityId: entityIdValue?.trim() || undefined
          }),
          ...(entityAddressIdValue !== undefined && { 
            entityAddressId: entityAddressIdValue?.trim() || undefined
          }),
          ...(!isManualUpdate && sidUpdate && sidUpdate !== 'same' ? { shippingAddressId: sidUpdate } : isManualUpdate ? {
            shippingAddressId: undefined,
            shippingNominative: (data as UpdateDocumentInput).shippingNominative?.trim() || '',
            shippingReceiverName: (data as UpdateDocumentInput).shippingReceiverName?.trim() || '',
            shippingStreet: (data as UpdateDocumentInput).shippingStreet?.trim() || '',
            shippingCity: (data as UpdateDocumentInput).shippingCity?.trim() || '',
            shippingZipCode: (data as UpdateDocumentInput).shippingZipCode?.trim() || '',
            shippingProvince: (data as UpdateDocumentInput).shippingProvince?.trim() || '',
            shippingCountry: (data as UpdateDocumentInput).shippingCountry?.trim() || 'IT',
          } : { shippingAddressId: undefined }),
          ...(data.date && { date: data.date }),
          ...(mainWarehouseIdValue !== undefined && { 
            mainWarehouseId: mainWarehouseIdValue?.trim() || undefined
          }),
          // Le righe sono sempre obbligatorie in update
          // Passiamo stringhe che Zod trasformerà in Decimal durante la validazione
          lines: validLines,
          ...(data.notes !== undefined && { notes: (data.notes as string)?.trim() || undefined }),
          ...(data.paymentTerms !== undefined && { paymentTerms: (data.paymentTerms as string)?.trim() || undefined }),
          // Invia condizione pagamento per ricalcolare scadenze (elimina vecchie e crea nuove con data/importo aggiornati)
          ...(data.paymentConditionId !== undefined && {
            paymentConditionId: (data.paymentConditionId as string)?.trim() || undefined,
          }),
        } as unknown as UpdateDocumentInput;

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
        // ✅ Converti Decimal in stringhe per serializzazione Server Action
        // Zod trasformerà le stringhe in Decimal durante la validazione
        // Type guard: in creazione, data è sempre CreateDocumentInput
        if (!('documentTypeId' in data)) {
          setError('Tipo documento mancante. Impossibile creare il documento.');
          setIsLoading(false);
          return;
        }
        
        const createData = data as CreateDocumentInput;
        // ✅ Converti Decimal in stringhe per serializzazione Server Action
        // Zod trasformerà le stringhe in Decimal durante la validazione
        // Usiamo 'as' perché TypeScript non sa che Zod trasformerà le stringhe
        const sid = createData.shippingAddressId?.trim() || '';
        const isManual = sid === 'manual';
        const submitData = {
          documentTypeId: createData.documentTypeId || '',
          number: createData.number || undefined,
          entityId: createData.entityId?.trim() || undefined,
          entityAddressId: createData.entityAddressId?.trim() || undefined,
          shippingAddressId: !isManual && sid && sid !== 'same' ? sid : undefined,
          shippingNominative: isManual ? (createData.shippingNominative?.trim() || '') : undefined,
          shippingReceiverName: isManual ? (createData.shippingReceiverName?.trim() || '') : undefined,
          shippingStreet: isManual ? (createData.shippingStreet?.trim() || '') : undefined,
          shippingCity: isManual ? (createData.shippingCity?.trim() || '') : undefined,
          shippingZipCode: isManual ? (createData.shippingZipCode?.trim() || '') : undefined,
          shippingProvince: isManual ? (createData.shippingProvince?.trim() || '') : undefined,
          shippingCountry: isManual ? (createData.shippingCountry?.trim() || 'IT') : undefined,
          date: createData.date,
          mainWarehouseId: createData.mainWarehouseId?.trim() || undefined,
          lines: (createData.lines || []).map(line => ({
            productId: line.productId?.trim() || undefined,
            productCode: (line.productCode || '').trim(),
            description: (line.description || '').trim(),
            unitPrice: toDecimalString(line.unitPrice),
            quantity: toDecimalString(line.quantity),
            vatRate: toDecimalString(line.vatRate),
            warehouseId: line.warehouseId?.trim() || undefined,
          })),
          notes: createData.notes?.trim() || undefined,
          paymentTerms: createData.paymentTerms?.trim() || undefined,
          paymentConditionId: createData.paymentConditionId?.trim() || undefined,
          codiceCIG: createData.codiceCIG?.trim() || undefined,
          codiceCUP: createData.codiceCUP?.trim() || undefined,
        } as unknown as CreateDocumentInput;

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

          {/* Destinazione (sede/consegna) - solo se è selezionato un cliente/fornitore con sedi */}
          {selectedEntityId && selectedEntityId !== 'none' && (
            <FormField
              control={form.control}
              name="entityAddressId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Destinazione
                  </FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === 'main' ? '' : value)}
                    value={field.value || 'main'}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Indirizzo principale" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="main">Indirizzo principale (sede legale)</SelectItem>
                      {entityAddresses.map((addr) => (
                        <SelectItem key={addr.id} value={addr.id}>
                          {addr.type === 'LEGAL_HEADQUARTER' ? 'Sede legale' : 'Consegna'}
                          {addr.nominative ? ` - ${addr.nominative}` : ''}
                          {addr.receiverName ? ` - ${addr.receiverName}` : ''}: {addr.street}, {addr.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Scegli quale indirizzo usare per fatturazione (sede legale / consegna).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Destinazione diversa (consegna) - snapshot separato per DDT/Fattura */}
          {selectedEntityId && selectedEntityId !== 'none' && (entityAddresses.length > 0 || true) && (
            <>
              <FormField
                control={form.control}
                name="shippingAddressId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Destinazione di consegna
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || 'same'}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Stesso indirizzo cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="same">Stesso indirizzo cliente</SelectItem>
                      {entityAddresses.map((addr) => (
                        <SelectItem key={addr.id} value={addr.id}>
                          {addr.type === 'LEGAL_HEADQUARTER' ? 'Sede legale' : 'Consegna'}
                          {addr.nominative ? ` - ${addr.nominative}` : ''}
                          {addr.receiverName ? ` - ${addr.receiverName}` : ''}: {addr.street}, {addr.city}
                        </SelectItem>
                      ))}
                        <SelectItem value="manual">Inserisci manuale (cantiere, subappalto…)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Indirizzo dove spedire/consegnare (snapshot salvato sul documento).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isManualShipping && (
                <div className="grid gap-4 rounded-lg border p-4">
                  <p className="text-sm font-medium text-muted-foreground">Indirizzo di consegna (manuale)</p>
                  <FormField
                    control={form.control}
                    name="shippingNominative"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nominativo</FormLabel>
                        <FormControl>
                          <Input placeholder="Azienda o persona terza (es. Edilizia Rossi S.r.l., Mario Bianchi)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="shippingReceiverName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Destinatario (es. Cantiere Roma, Presso…)</FormLabel>
                        <FormControl>
                          <Input placeholder="Presso Cantiere Beta" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="shippingStreet"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Via e numero</FormLabel>
                        <FormControl>
                          <Input placeholder="Via Example 1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="shippingZipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CAP</FormLabel>
                          <FormControl>
                            <Input placeholder="00100" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shippingCity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Città</FormLabel>
                          <FormControl>
                            <Input placeholder="Roma" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="shippingProvince"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Provincia</FormLabel>
                          <FormControl>
                            <Input placeholder="RM" maxLength={2} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shippingCountry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Paese</FormLabel>
                          <FormControl>
                            <Input placeholder="IT" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </>
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
                                value={field.value != null ? String(field.value) : ''}
                                onChange={(e) => {
                                  const raw = e.target.value.trim();
                                  field.onChange(raw === '' ? new Decimal('0') : new Decimal(raw));
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
                                value={field.value != null ? String(field.value) : ''}
                                onChange={(e) => {
                                  const raw = e.target.value.trim();
                                  field.onChange(raw === '' ? new Decimal('0') : new Decimal(raw));
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

                    {/* IVA %: in interfaccia si vede 22 (%), internamente si usa 0.22 per i calcoli */}
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`lines.${index}.vatRate`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="22"
                                value={
                                  field.value != null
                                    ? (() => {
                                        const n = Number(field.value);
                                        if (Number.isNaN(n)) return '';
                                        const pct = n * 100;
                                        return pct % 1 === 0 ? String(Math.round(pct)) : String(pct);
                                      })()
                                    : ''
                                }
                                onChange={(e) => {
                                  const raw = e.target.value.trim();
                                  if (raw === '') {
                                    field.onChange(new Decimal('0'));
                                    return;
                                  }
                                  const pct = parseFloat(raw);
                                  field.onChange(Number.isNaN(pct) ? new Decimal('0') : new Decimal(pct / 100));
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

                    {/* Totale Riga = imponibile (non ivato) */}
                    <TableCell className="text-right font-medium">
                      {(() => {
                        const line = linesForTotals[index];
                        if (!line) return '€ 0.00';
                        try {
                          const quantity = toDecimal(line.quantity ?? 0);
                          const unitPrice = toDecimal(line.unitPrice ?? 0);
                          const vatRate = toDecimal(line.vatRate ?? 0);
                          const lineTotals = calculateLineTotal(quantity, unitPrice, vatRate);
                          return formatCurrency(lineTotals.netAmount);
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
