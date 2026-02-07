/**
 * Form per creazione/editing configurazione tipo documento
 * 
 * CARATTERISTICHE:
 * - Validazione con Zod
 * - Supporto creazione e modifica
 * - Gestione flag comportamentali (inventoryMovement, valuationImpact)
 * - Segni operazione separati per magazzino e valorizzazione (abilitati condizionalmente)
 * - Gestione errori da server
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  createDocumentTypeSchema, 
  updateDocumentTypeSchema,
  type CreateDocumentTypeInput,
  type UpdateDocumentTypeInput
} from '@/schemas/document-type-schema';
import { 
  createDocumentTypeAction, 
  updateDocumentTypeAction
} from '@/services/actions/document-type-actions';
import { getTemplatesAction } from '@/services/actions/template-actions';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

interface DocumentTypeFormProps {
  /**
   * Configurazione tipo documento da modificare (undefined = creazione nuova)
   */
  documentType?: {
    id: string;
    code: string;
    description: string;
    numeratorCode: string;
    inventoryMovement: boolean;
    valuationImpact: boolean;
    operationSignStock: number | null;
    operationSignValuation: number | null;
    documentDirection: 'PURCHASE' | 'SALE' | 'INTERNAL';
    active: boolean;
    templateId?: string | null;
  };
  
  /**
   * Callback chiamato dopo salvataggio con successo
   */
  onSuccess?: () => void;
  
  /**
   * Callback chiamato in caso di errore
   */
  onError?: (error: string) => void;
}

type DocumentTypeFormInput = CreateDocumentTypeInput | (UpdateDocumentTypeInput & { id?: string });

export function DocumentTypeForm({ 
  documentType, 
  onSuccess, 
  onError 
}: DocumentTypeFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);
  const isEditing = !!documentType;

  useEffect(() => {
    getTemplatesAction().then((res) => {
      if (res.success) setTemplates(res.data.map((t) => ({ id: t.id, name: t.name })));
    });
  }, []);

  // Setup form con validazione Zod
  const form = useForm<DocumentTypeFormInput>({
    resolver: zodResolver(isEditing ? updateDocumentTypeSchema : createDocumentTypeSchema) as any,
    defaultValues: {
      code: '',
      description: '',
      numeratorCode: '',
      inventoryMovement: false,
      valuationImpact: false,
      operationSignStock: null,
      operationSignValuation: null,
      documentDirection: 'SALE' as const,
      active: true,
      templateId: null,
      ...(isEditing && documentType ? { id: documentType.id } : {}),
    },
  });

  // Aggiorna i valori del form quando la configurazione viene caricata
  useEffect(() => {
    if (documentType) {
      form.reset({
        code: documentType.code,
        description: documentType.description,
        numeratorCode: documentType.numeratorCode,
        inventoryMovement: documentType.inventoryMovement,
        valuationImpact: documentType.valuationImpact,
        operationSignStock: (documentType.operationSignStock === 1 || documentType.operationSignStock === -1) 
          ? documentType.operationSignStock 
          : null,
        operationSignValuation: (documentType.operationSignValuation === 1 || documentType.operationSignValuation === -1) 
          ? documentType.operationSignValuation 
          : null,
        documentDirection: documentType.documentDirection,
        active: documentType.active,
        templateId: documentType.templateId ?? null,
        ...(isEditing ? { id: documentType.id } : {}),
      }, { keepDefaultValues: false });
    } else {
      // Reset al form vuoto quando si crea una nuova configurazione
      form.reset({
        code: '',
        description: '',
        numeratorCode: '',
        inventoryMovement: false,
        valuationImpact: false,
        operationSignStock: null,
        operationSignValuation: null,
        active: true,
        templateId: null,
      }, { keepDefaultValues: false });
    }
  }, [documentType, form, isEditing]);

  /**
   * Handler submit form
   */
  async function onSubmit(data: DocumentTypeFormInput) {
    setIsLoading(true);

    try {
      let result;

      if (isEditing && documentType) {
        // Aggiornamento configurazione esistente
        const updateData: UpdateDocumentTypeInput = {
          id: documentType.id,
          ...data,
        };

        result = await updateDocumentTypeAction(updateData);
      } else {
        // Creazione nuova configurazione
        result = await createDocumentTypeAction(data as CreateDocumentTypeInput);
      }

      if (result.success) {
        // Successo: chiama callback e resetta form
        if (onSuccess) {
          onSuccess();
        } else {
          // Se non c'è callback, resetta il form
          form.reset();
        }
      } else {
        // Errore: mostra messaggio
        if (onError) {
          onError(result.error);
        } else {
          console.error('Errore:', result.error);
        }
      }
    } catch (error) {
      console.error('Errore submit form:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Codice tipo documento */}
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Codice Tipo Documento *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="DDT" 
                  {...field}
                  disabled={isLoading || isEditing} // Codice non modificabile in editing
                />
              </FormControl>
              <FormDescription>
                Codice univoco del tipo documento (solo lettere maiuscole, numeri e underscore)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Descrizione */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrizione *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Documento di Trasporto" 
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                Descrizione del tipo documento
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Codice numerazione */}
        <FormField
          control={form.control}
          name="numeratorCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Codice Numerazione *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="DDT" 
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                Codice per raggruppare tipi documento con stessa serie numerica (es. "FATTURE", "DDT")
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Flag comportamentali in riga */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Movimenta Stock */}
          <FormField
            control={form.control}
            name="inventoryMovement"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Movimenta Stock</FormLabel>
                  <FormDescription>
                    Se attivo, il documento genera movimenti di magazzino
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Impatto Valorizzazione */}
          <FormField
            control={form.control}
            name="valuationImpact"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Impatto Valorizzazione</FormLabel>
                  <FormDescription>
                    Se attivo, il documento impatta costi/ricavi (contabilità)
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Segno Operazione Magazzino - Abilitato solo se inventoryMovement = true */}
        <FormField
          control={form.control}
          name="operationSignStock"
          render={({ field }) => {
            const inventoryMovement = form.watch('inventoryMovement');
            return (
              <FormItem>
                <FormLabel>
                  Segno Operazione Magazzino
                  {inventoryMovement && ' *'}
                </FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  value={field.value?.toString() || ''}
                  disabled={!inventoryMovement || isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        inventoryMovement 
                          ? "Seleziona segno operazione magazzino" 
                          : "Abilita 'Movimenta Stock' per configurare"
                      } />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">+1 (Incremento - es. Carico fornitore, Reso cliente)</SelectItem>
                    <SelectItem value="-1">-1 (Decremento - es. Scarico vendita, DDT)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  {inventoryMovement 
                    ? "Segno dell'operazione per movimenti magazzino: +1 per incrementi, -1 per decrementi"
                    : "Abilita 'Movimenta Stock' per configurare il segno operazione magazzino"
                  }
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        {/* Segno Operazione Valorizzazione - Abilitato solo se valuationImpact = true */}
        <FormField
          control={form.control}
          name="operationSignValuation"
          render={({ field }) => {
            const valuationImpact = form.watch('valuationImpact');
            return (
              <FormItem>
                <FormLabel>
                  Segno Operazione Valorizzazione
                  {valuationImpact && ' *'}
                </FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  value={field.value?.toString() || ''}
                  disabled={!valuationImpact || isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        valuationImpact 
                          ? "Seleziona segno operazione valorizzazione" 
                          : "Abilita 'Impatto Valorizzazione' per configurare"
                      } />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">+1 (Incremento - es. Fattura vendita, Fattura acquisto)</SelectItem>
                    <SelectItem value="-1">-1 (Decremento - es. Nota credito, Reso)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  {valuationImpact 
                    ? "Segno dell'operazione per impatto contabile: +1 per incrementi, -1 per decrementi"
                    : "Abilita 'Impatto Valorizzazione' per configurare il segno operazione contabile"
                  }
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        {/* Direzione Documento */}
        <FormField
          control={form.control}
          name="documentDirection"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Direzione Documento *</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona direzione documento" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="SALE">Vendita (a cliente)</SelectItem>
                  <SelectItem value="PURCHASE">Acquisto (da fornitore)</SelectItem>
                  <SelectItem value="INTERNAL">Interno (trasferimenti, rettifiche)</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Determina il tipo di operazione del documento e quali prodotti sono visibili
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Modello di stampa */}
        <FormField
          control={form.control}
          name="templateId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Modello di stampa</FormLabel>
              <Select
                onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                value={field.value ?? '__none__'}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Nessun modello (usa predefinito)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__none__">Nessun modello (usa predefinito)</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Modello grafico per la stampa di questo tipo di documento. Configura da Impostazioni → Modelli.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Attivo */}
        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Configurazione Attiva</FormLabel>
                <FormDescription>
                  Le configurazioni non attive non sono disponibili per nuovi documenti
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isLoading}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Pulsanti */}
        <div className="flex justify-end gap-4">
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Aggiorna Configurazione' : 'Crea Configurazione'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
