/**
 * Form per creazione/editing tipo di pagamento
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  createPaymentTypeSchema, 
  updatePaymentTypeSchema,
  type CreatePaymentTypeInput,
  type UpdatePaymentTypeInput
} from '@/schemas/payment-schema';

type PaymentTypeFormInput = CreatePaymentTypeInput | (UpdatePaymentTypeInput & { id?: string });

import { 
  createPaymentTypeAction, 
  updatePaymentTypeAction
} from '@/services/actions/payment-actions';

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

const SDI_CODES = [
  'MP01', 'MP02', 'MP03', 'MP04', 'MP05', 'MP06', 'MP07', 'MP08', 'MP09', 'MP10',
  'MP11', 'MP12', 'MP13', 'MP14', 'MP15', 'MP16', 'MP17', 'MP18', 'MP19', 'MP20',
  'MP21', 'MP22', 'MP23',
] as const;

interface PaymentTypeFormProps {
  type?: {
    id: string;
    name: string;
    sdiCode: string;
    sepaCode: string | null;
    active: boolean;
  };
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function PaymentTypeForm({ 
  type, 
  onSuccess, 
  onError 
}: PaymentTypeFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!type;

  const form = useForm<PaymentTypeFormInput>({
    resolver: zodResolver(isEditing ? updatePaymentTypeSchema : createPaymentTypeSchema) as any,
    defaultValues: {
      name: '',
      sdiCode: 'MP05',
      sepaCode: '',
      active: true,
      ...(isEditing && type ? { id: type.id } : {}),
    },
  });

  useEffect(() => {
    if (type) {
      form.reset({
        id: type.id,
        name: type.name,
        sdiCode: type.sdiCode,
        sepaCode: type.sepaCode || '',
        active: type.active,
      }, { keepDefaultValues: false });
    } else {
      form.reset({
        name: '',
        sdiCode: 'MP05',
        sepaCode: '',
        active: true,
      }, { keepDefaultValues: false });
    }
  }, [type, form]);

  async function onSubmit(data: PaymentTypeFormInput) {
    setIsLoading(true);

    try {
      let result;

      if (isEditing && type) {
        const updateData: UpdatePaymentTypeInput = {
          id: type.id,
          name: data.name,
          sdiCode: data.sdiCode,
          sepaCode: data.sepaCode && data.sepaCode.trim() !== '' ? data.sepaCode : undefined,
          active: data.active,
        };
        
        result = await updatePaymentTypeAction(updateData);
      } else {
        const createData: CreatePaymentTypeInput = {
          name: data.name as string,
          sdiCode: data.sdiCode as string,
          sepaCode: data.sepaCode,
          active: data.active ?? true,
        };
        
        result = await createPaymentTypeAction(createData);
      }

      if (result.success) {
        onSuccess?.();
      } else {
        onError?.(result.error || 'Errore sconosciuto');
        if (result.error?.includes('Codice SDI')) {
          form.setError('sdiCode', {
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
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome *</FormLabel>
              <FormControl>
                <Input placeholder="Es. Bonifico Bancario" {...field} />
              </FormControl>
              <FormDescription>
                Nome descrittivo del tipo di pagamento
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sdiCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Codice SDI *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona codice SDI" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SDI_CODES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Codice SDI conforme fatturazione elettronica (MP01-MP23)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sepaCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Codice SEPA (opzionale)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Es. TRF, OXI, DD" 
                  {...field}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    field.onChange(value);
                  }}
                />
              </FormControl>
              <FormDescription>
                Codice SEPA per flussi bancari (es. TRF per Bonifico, OXI per RiBa)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Attivo</FormLabel>
                <FormDescription>
                  Se disattivato, non sarà disponibile per nuove condizioni di pagamento
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

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Salva Modifiche' : 'Crea Tipo di Pagamento'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
