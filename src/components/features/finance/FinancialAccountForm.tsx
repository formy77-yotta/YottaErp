'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createFinancialAccountFormSchema,
  type CreateFinancialAccountFormValues,
} from '@/schemas/finance-schema';
import { createFinancialAccount } from '@/actions/finance';
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
import { Loader2 } from 'lucide-react';

interface FinancialAccountFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function FinancialAccountForm({ onSuccess, onError }: FinancialAccountFormProps) {
  const form = useForm<CreateFinancialAccountFormValues>({
    resolver: zodResolver(createFinancialAccountFormSchema),
    defaultValues: {
      name: '',
      type: 'BANK',
      iban: '',
      initialBalance: '0',
    },
  });

  async function onSubmit(data: CreateFinancialAccountFormValues) {
    const result = await createFinancialAccount(data);
    if (result.success) {
      form.reset({ name: '', type: 'BANK', iban: '', initialBalance: '0' });
      onSuccess?.();
    } else {
      onError?.(result.error);
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
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Es. Banca Intesa, Cassa Contanti" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo conto" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="BANK">Banca</SelectItem>
                  <SelectItem value="CASH">Cassa</SelectItem>
                  <SelectItem value="VIRTUAL">Virtuale</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="iban"
          render={({ field }) => (
            <FormItem>
              <FormLabel>IBAN (opzionale)</FormLabel>
              <FormControl>
                <Input placeholder="IT00 X000 0000 0000 0000 0000 000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="initialBalance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Saldo iniziale</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Aggiungi conto
        </Button>
      </form>
    </Form>
  );
}
