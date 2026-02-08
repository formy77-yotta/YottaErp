'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { newPaymentFormSchema, type NewPaymentFormValues } from '@/schemas/finance-schema';
import { getFinancialAccounts } from '@/actions/finance';
import { getPaymentTypesAction } from '@/services/actions/payment-actions';
import { Decimal } from 'decimal.js';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
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
import { AccountSelector } from './AccountSelector';
import { Loader2 } from 'lucide-react';

/** Codici SDI per cui si usa di default il conto Cassa (Contanti, Assegno) */
const CASH_DEFAULT_SDI_CODES = ['MP01', 'MP02']; // Contanti, Assegno

export type NewPaymentPayload = {
  financialAccountId: string;
  amount: Decimal;
  date: Date;
  direction: 'INFLOW' | 'OUTFLOW';
  paymentTypeId: string | null;
  reference: string | null;
  notes: string | null;
};

interface PaymentFormProps {
  /** Codice SDI del metodo di pagamento del documento (es. MP01 Contanti, MP02 Assegno). Se MP01 o MP02, il conto predefinito è Cassa. */
  defaultPaymentTypeSdiCode?: string;
  /** Conto predefinito (es. id del conto "Cassa Contanti") */
  defaultFinancialAccountId?: string;
  /** Direzione predefinita */
  defaultDirection?: 'INFLOW' | 'OUTFLOW';
  onSubmit: (payload: NewPaymentPayload) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  isLoading?: boolean;
}

export function PaymentForm({
  defaultPaymentTypeSdiCode,
  defaultFinancialAccountId,
  defaultDirection = 'INFLOW',
  onSubmit,
  onCancel,
  submitLabel = 'Registra pagamento',
  isLoading = false,
}: PaymentFormProps) {
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [paymentTypes, setPaymentTypes] = useState<Array<{ id: string; name: string; sdiCode: string }>>([]);

  const form = useForm<NewPaymentFormValues>({
    resolver: zodResolver(newPaymentFormSchema) as any,
    defaultValues: {
      financialAccountId: defaultFinancialAccountId ?? '',
      amount: '',
      date: new Date(),
      direction: defaultDirection,
      paymentTypeId: '',
      reference: '',
      notes: '',
    },
  });

  // Carica conti e tipi di pagamento
  useEffect(() => {
    Promise.all([getFinancialAccounts(), getPaymentTypesAction(true)])
      .then(([accList, ptResult]) => {
        setAccounts(accList);
        if (ptResult.success) setPaymentTypes(ptResult.data ?? []);
      })
      .catch(console.error);
  }, []);

  // Default conto Cassa se metodo documento è Contanti o Assegno
  useEffect(() => {
    if (accounts.length === 0) return;
    const currentAccountId = form.getValues('financialAccountId');
    if (currentAccountId) return; // già impostato (es. da defaultFinancialAccountId)

    const useCashDefault =
      defaultPaymentTypeSdiCode && CASH_DEFAULT_SDI_CODES.includes(defaultPaymentTypeSdiCode);
    if (useCashDefault) {
      const cashAccount = accounts.find((a) => a.type === 'CASH');
      if (cashAccount) form.setValue('financialAccountId', cashAccount.id);
    } else if (defaultFinancialAccountId) {
      form.setValue('financialAccountId', defaultFinancialAccountId);
    }
  }, [accounts, defaultPaymentTypeSdiCode, defaultFinancialAccountId, form]);

  async function handleSubmit(data: NewPaymentFormValues) {
    const payload: NewPaymentPayload = {
      financialAccountId: data.financialAccountId,
      amount: new Decimal(data.amount),
      date: data.date,
      direction: data.direction,
      paymentTypeId: data.paymentTypeId && data.paymentTypeId.trim() !== '' ? data.paymentTypeId : null,
      reference: data.reference?.trim() || null,
      notes: data.notes?.trim() || null,
    };
    await onSubmit(payload);
  }

  const isCashDefault =
    defaultPaymentTypeSdiCode && CASH_DEFAULT_SDI_CODES.includes(defaultPaymentTypeSdiCode);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="financialAccountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conto</FormLabel>
              <FormControl>
                <AccountSelector
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={isCashDefault ? 'Cassa Contanti (predefinito)' : 'Seleziona conto'}
                  filterByType={isCashDefault ? 'CASH' : undefined}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Importo</FormLabel>
              <FormControl>
                <Input type="text" inputMode="decimal" placeholder="0.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={field.value ? new Date(field.value).toISOString().slice(0, 10) : ''}
                  onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="direction"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Direzione</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Direzione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="INFLOW">Entrata</SelectItem>
                  <SelectItem value="OUTFLOW">Uscita</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="paymentTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo di pagamento (opzionale)</FormLabel>
              <Select
                value={field.value || 'none'}
                onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Nessuno" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Nessuno</SelectItem>
                  {paymentTypes.map((pt) => (
                    <SelectItem key={pt.id} value={pt.id}>
                      {pt.name} ({pt.sdiCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Riferimento (opzionale)</FormLabel>
              <FormControl>
                <Input placeholder="Es. numero assegno, riferimento bonifico" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note (opzionale)</FormLabel>
              <FormControl>
                <Input placeholder="Note" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Annulla
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
