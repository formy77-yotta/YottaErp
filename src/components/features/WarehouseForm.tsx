/**
 * Form per creazione/modifica magazzino
 * 
 * Componente riutilizzabile per creare e modificare magazzini.
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  createWarehouseSchema,
  updateWarehouseSchema,
  type CreateWarehouseInput,
  type UpdateWarehouseInput,
} from '@/schemas/warehouse-schema';
import { createWarehouseAction, updateWarehouseAction } from '@/services/actions/warehouse-actions';
import { Loader2 } from 'lucide-react';

interface WarehouseFormProps {
  warehouse?: {
    id: string;
    code: string;
    name: string;
    address: string | null;
  };
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function WarehouseForm({ warehouse, onSuccess, onError }: WarehouseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!warehouse;

  const form = useForm<CreateWarehouseInput | UpdateWarehouseInput>({
    resolver: zodResolver(isEditing ? updateWarehouseSchema : createWarehouseSchema),
    defaultValues: warehouse
      ? {
          id: warehouse.id,
          code: warehouse.code,
          name: warehouse.name,
          address: warehouse.address || undefined,
        }
      : {
          code: '',
          name: '',
          address: undefined,
        },
  });

  async function onSubmit(data: CreateWarehouseInput | UpdateWarehouseInput) {
    setIsSubmitting(true);
    try {
      let result;
      if (isEditing) {
        result = await updateWarehouseAction(data as UpdateWarehouseInput);
      } else {
        result = await createWarehouseAction(data as CreateWarehouseInput);
      }

      if (result.success) {
        onSuccess();
      } else {
        onError(result.error);
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Errore sconosciuto');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Codice */}
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Codice Magazzino *</FormLabel>
              <FormControl>
                <Input
                  placeholder="CENTRALE"
                  className="font-mono"
                  disabled={isEditing} // Il codice non si può modificare
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Codice univoco del magazzino (solo lettere maiuscole, numeri e underscore)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Nome */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Magazzino *</FormLabel>
              <FormControl>
                <Input placeholder="Magazzino Centrale" {...field} />
              </FormControl>
              <FormDescription>
                Nome descrittivo del magazzino
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Indirizzo */}
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Indirizzo</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Via Roma 123, 20121 Milano"
                  rows={3}
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>
                Indirizzo fisico del magazzino (opzionale)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Pulsanti */}
        <div className="flex justify-end gap-2">
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Aggiorna' : 'Crea'} Magazzino
          </Button>
        </div>
      </form>
    </Form>
  );
}
