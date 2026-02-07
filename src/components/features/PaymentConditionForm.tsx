/**
 * Form per creazione/editing condizione di pagamento
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  createPaymentConditionSchema, 
  updatePaymentConditionSchema,
  type CreatePaymentConditionInput,
  type UpdatePaymentConditionInput
} from '@/schemas/payment-schema';

type PaymentConditionFormInput = CreatePaymentConditionInput | (UpdatePaymentConditionInput & { id?: string });

import { 
  createPaymentConditionAction, 
  updatePaymentConditionAction,
  getPaymentTypesAction
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

interface PaymentConditionFormProps {
  condition?: {
    id: string;
    name: string;
    paymentTypeId: string;
    daysToFirstDue: number;
    gapBetweenDues: number;
    numberOfDues: number;
    isEndOfMonth: boolean;
    active: boolean;
  };
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function PaymentConditionForm({ 
  condition, 
  onSuccess, 
  onError 
}: PaymentConditionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentTypes, setPaymentTypes] = useState<Array<{ id: string; name: string; sdiCode: string }>>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const isEditing = !!condition;

  const form = useForm<PaymentConditionFormInput>({
    resolver: zodResolver(isEditing ? updatePaymentConditionSchema : createPaymentConditionSchema) as any,
    defaultValues: {
      name: '',
      paymentTypeId: '',
      daysToFirstDue: 0,
      gapBetweenDues: 0,
      numberOfDues: 1,
      isEndOfMonth: false,
      active: true,
      ...(isEditing && condition ? { id: condition.id } : {}),
    },
  });

  // Carica tipi di pagamento
  useEffect(() => {
    async function loadPaymentTypes() {
      try {
        const result = await getPaymentTypesAction(true); // Solo attivi
        if (result.success) {
          setPaymentTypes(result.data);
        }
      } catch (error) {
        console.error('Errore caricamento tipi di pagamento:', error);
      } finally {
        setLoadingTypes(false);
      }
    }
    loadPaymentTypes();
  }, []);

  useEffect(() => {
    if (condition) {
      form.reset({
        id: condition.id,
        name: condition.name,
        paymentTypeId: condition.paymentTypeId,
        daysToFirstDue: condition.daysToFirstDue,
        gapBetweenDues: condition.gapBetweenDues,
        numberOfDues: condition.numberOfDues,
        isEndOfMonth: condition.isEndOfMonth,
        active: condition.active,
      }, { keepDefaultValues: false });
    } else {
      form.reset({
        name: '',
        paymentTypeId: '',
        daysToFirstDue: 0,
        gapBetweenDues: 0,
        numberOfDues: 1,
        isEndOfMonth: false,
        active: true,
      }, { keepDefaultValues: false });
    }
  }, [condition, form]);

  async function onSubmit(data: PaymentConditionFormInput) {
    setIsLoading(true);

    try {
      let result;

      if (isEditing && condition) {
        const updateData: UpdatePaymentConditionInput = {
          id: condition.id,
          name: data.name,
          paymentTypeId: data.paymentTypeId,
          daysToFirstDue: data.daysToFirstDue,
          gapBetweenDues: data.gapBetweenDues,
          numberOfDues: data.numberOfDues,
          isEndOfMonth: data.isEndOfMonth,
          active: data.active,
        };
        
        result = await updatePaymentConditionAction(updateData);
      } else {
        const createData: CreatePaymentConditionInput = {
          name: data.name as string,
          paymentTypeId: data.paymentTypeId as string,
          daysToFirstDue: data.daysToFirstDue as number,
          gapBetweenDues: data.gapBetweenDues as number,
          numberOfDues: data.numberOfDues as number,
          isEndOfMonth: data.isEndOfMonth ?? false,
          active: data.active ?? true,
        };
        
        result = await createPaymentConditionAction(createData);
      }

      if (result.success) {
        onSuccess?.();
      } else {
        onError?.(result.error || 'Errore sconosciuto');
        if (result.error?.includes('nome')) {
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

  const numberOfDues = form.watch('numberOfDues');

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
                <Input placeholder="Es. 30/60 gg FM" {...field} />
              </FormControl>
              <FormDescription>
                Nome descrittivo della condizione di pagamento
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="paymentTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo di Pagamento *</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value}
                disabled={loadingTypes}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingTypes ? "Caricamento..." : "Seleziona tipo di pagamento"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {paymentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} ({type.sdiCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Tipo di pagamento associato (es. Bonifico, RiBa)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="daysToFirstDue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Giorni alla Prima Scadenza *</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    min="0"
                    max="365"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    value={field.value}
                  />
                </FormControl>
                <FormDescription>
                  Giorni dalla data documento alla prima scadenza
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gapBetweenDues"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Giorni tra Scadenze</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    min="0"
                    max="365"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    value={field.value}
                    disabled={numberOfDues === 1}
                  />
                </FormControl>
                <FormDescription>
                  Giorni tra una scadenza e la successiva (ignorato se 1 rata)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="numberOfDues"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numero di Rate *</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    min="1"
                    max="24"
                    {...field}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      field.onChange(value);
                      if (value === 1) {
                        form.setValue('gapBetweenDues', 0);
                      }
                    }}
                    value={field.value}
                  />
                </FormControl>
                <FormDescription>
                  Numero di rate (1-24)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isEndOfMonth"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Fine Mese</FormLabel>
                <FormDescription>
                  Se attivo, le scadenze vengono spostate all'ultimo giorno del mese
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

        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Attiva</FormLabel>
                <FormDescription>
                  Se disattivata, non sarà disponibile per nuovi documenti
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
            {isEditing ? 'Salva Modifiche' : 'Crea Condizione di Pagamento'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
