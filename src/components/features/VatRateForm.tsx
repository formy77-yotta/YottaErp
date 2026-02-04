/**
 * Form per creazione/editing aliquota IVA
 * 
 * BUSINESS RULE: Il valore viene inserito come percentuale (es. 22) 
 * e convertito automaticamente in 0.2200 per il database
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  createVatRateSchema, 
  updateVatRateSchema,
  type CreateVatRateInput,
  type UpdateVatRateInput
} from '@/schemas/vat-rate-schema';

type VatRateFormInput = CreateVatRateInput | (UpdateVatRateInput & { id?: string });
import { 
  createVatRateAction, 
  updateVatRateAction
} from '@/services/actions/vat-actions';

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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

interface VatRateFormProps {
  /**
   * Aliquota da modificare (undefined = creazione nuova)
   */
  rate?: {
    id: string;
    name: string;
    value: string; // Decimal come stringa (es. "0.2200")
    nature: string | null;
    description: string | null;
    active: boolean;
    isDefault: boolean;
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

export function VatRateForm({ 
  rate, 
  onSuccess, 
  onError 
}: VatRateFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!rate;

  // Converte valore da DB (0.2200) a percentuale per il form (22)
  const valueToPercentage = (value: string): string => {
    const decimal = parseFloat(value);
    return (decimal * 100).toFixed(2);
  };

  // Setup form con validazione Zod
  // Usa lo schema appropriato in base alla modalità (creazione/editing)
  const form = useForm<VatRateFormInput>({
    resolver: zodResolver(isEditing ? updateVatRateSchema : createVatRateSchema) as any,
    defaultValues: {
      name: '',
      value: '',
      nature: undefined,
      description: '',
      isDefault: false,
      active: true,
      ...(isEditing && rate ? { id: rate.id } : {}),
    },
  });

  // Aggiorna i valori del form quando l'aliquota viene caricata
  useEffect(() => {
    if (rate) {
      form.reset({
        name: rate.name,
        value: valueToPercentage(rate.value), // Converte 0.2200 -> 22
        nature: rate.nature || undefined,
        description: rate.description || '',
        isDefault: rate.isDefault,
        active: rate.active,
      }, { keepDefaultValues: false });
    } else {
      // Reset al form vuoto quando si crea una nuova aliquota
      form.reset({
        name: '',
        value: '',
        nature: undefined,
        description: '',
        isDefault: false,
        active: true,
      }, { keepDefaultValues: false });
    }
  }, [rate, form]);

  /**
   * Handler submit form
   */
  async function onSubmit(data: VatRateFormInput) {
    setIsLoading(true);

    try {
      let result;

      if (isEditing && rate) {
        // Aggiornamento aliquota esistente
        const updateData: UpdateVatRateInput = {
          id: rate.id,
          name: data.name,
          value: data.value,
          // Converti stringhe vuote in undefined
          nature: data.nature || undefined,
          description: data.description && data.description.trim() !== '' 
            ? data.description 
            : undefined,
          isDefault: data.isDefault,
          active: data.active,
        };
        
        result = await updateVatRateAction(updateData);
      } else {
        // Creazione nuova aliquota
        const createData: CreateVatRateInput = {
          name: data.name,
          value: data.value,
          nature: data.nature,
          description: data.description,
          isDefault: data.isDefault,
          active: data.active,
        };
        
        result = await createVatRateAction(createData);
      }

      if (result.success) {
        // Successo
        onSuccess?.();
      } else {
        // Errore dal server
        onError?.(result.error || 'Errore sconosciuto');
        
        // Se errore nome duplicato, mostra errore sul campo
        if (result.error?.includes('Nome')) {
          form.setError('name', {
            type: 'manual',
            message: result.error,
          });
        }
      }
    } catch (error) {
      console.error('Errore submit form:', error);
      onError?.('Errore durante il salvataggio');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Nome */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome *</FormLabel>
              <FormControl>
                <Input placeholder="Es. Standard 22%" {...field} />
              </FormControl>
              <FormDescription>
                Nome descrittivo dell'aliquota
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Valore (Percentuale) */}
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valore (%) *</FormLabel>
                <FormControl>
                  <Input 
                    type="text"
                    placeholder="22" 
                    {...field}
                    onChange={(e) => {
                      // Permetti solo numeri e punto decimale
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Inserisci la percentuale (es. 22 per 22%)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Natura */}
          <FormField
            control={form.control}
            name="nature"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Natura (SDI)</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value || ''}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona natura" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Nessuna</SelectItem>
                    <SelectItem value="N1">N1 - Esclusa art. 15</SelectItem>
                    <SelectItem value="N2">N2 - Non soggetta</SelectItem>
                    <SelectItem value="N3">N3 - Non imponibile</SelectItem>
                    <SelectItem value="N4">N4 - Esente</SelectItem>
                    <SelectItem value="N5">N5 - Regime del margine</SelectItem>
                    <SelectItem value="N6">N6 - Reverse charge</SelectItem>
                    <SelectItem value="N7">N7 - IVA assolta in altro stato UE</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Codice natura per fatturazione elettronica
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Descrizione */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrizione Fiscale</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Descrizione dell'aliquota IVA"
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Descrizione opzionale per uso interno
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Default */}
          <FormField
            control={form.control}
            name="isDefault"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Aliquota Predefinita</FormLabel>
                  <FormDescription>
                    Usa questa aliquota come predefinita
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Attiva */}
          <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Attiva</FormLabel>
                  <FormDescription>
                    Aliquota disponibile per l'uso
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Pulsanti Azione */}
        <div className="flex justify-end space-x-4 pt-4">
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Aggiorna' : 'Crea'} Aliquota
          </Button>
        </div>
      </form>
    </Form>
  );
}
