/**
 * Form per creazione/editing tipologia articolo
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { 
  createProductTypeSchema, 
  updateProductTypeSchema,
  type CreateProductTypeInput,
  type UpdateProductTypeInput
} from '@/schemas/product-type-schema';
import { 
  createProductTypeAction, 
  updateProductTypeAction
} from '@/services/actions/product-type-actions';

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
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

interface ProductTypeFormProps {
  /**
   * Tipologia da modificare (undefined = creazione nuova)
   */
  type?: {
    id: string;
    code: string;
    description: string;
    manageStock: boolean;
    active: boolean;
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

type ProductTypeFormInput = CreateProductTypeInput | (UpdateProductTypeInput & { id?: string });

export function ProductTypeForm({ 
  type, 
  onSuccess, 
  onError 
}: ProductTypeFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!type;

  // Setup form con validazione Zod
  const form = useForm<ProductTypeFormInput>({
    resolver: zodResolver(isEditing ? updateProductTypeSchema : createProductTypeSchema) as any,
    defaultValues: {
      code: '',
      description: '',
      manageStock: true,
      active: true,
      ...(isEditing && type ? { id: type.id } : {}),
    },
  });

  // Aggiorna i valori del form quando la tipologia viene caricata
  useEffect(() => {
    if (type) {
      form.reset({
        code: type.code,
        description: type.description,
        manageStock: type.manageStock,
        active: type.active,
        ...(isEditing ? { id: type.id } : {}),
      }, { keepDefaultValues: false });
    } else {
      // Reset al form vuoto quando si crea una nuova tipologia
      form.reset({
        code: '',
        description: '',
        manageStock: true,
        active: true,
      }, { keepDefaultValues: false });
    }
  }, [type, form, isEditing]);

  /**
   * Handler submit form
   */
  async function onSubmit(data: ProductTypeFormInput) {
    setIsLoading(true);

    try {
      let result;

      if (isEditing && type) {
        // Aggiornamento tipologia esistente
        const updateData: UpdateProductTypeInput = {
          id: type.id,
          code: data.code,
          description: data.description,
          manageStock: data.manageStock,
          active: data.active,
        };
        
        result = await updateProductTypeAction(updateData);
      } else {
        // Creazione nuova tipologia
        const createData: CreateProductTypeInput = {
          code: data.code,
          description: data.description,
          manageStock: data.manageStock,
          active: data.active,
        };
        
        result = await createProductTypeAction(createData);
      }

      if (result.success) {
        // Successo: ricarica la pagina per mostrare i nuovi dati
        router.refresh();
        onSuccess?.();
      } else {
        // Errore dal server
        onError?.(result.error || 'Errore sconosciuto');
        
        // Se errore codice duplicato, mostra errore sul campo
        if (result.error?.includes('Codice')) {
          form.setError('code', {
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
        {/* Codice */}
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Codice *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Es. MAT, SER, FIN" 
                  {...field}
                  onChange={(e) => {
                    // Converti in maiuscolo automaticamente
                    const value = e.target.value.toUpperCase();
                    field.onChange(value);
                  }}
                  disabled={isEditing} // Il codice non può essere modificato dopo la creazione
                />
              </FormControl>
              <FormDescription>
                Codice univoco della tipologia (solo lettere maiuscole, numeri e underscore)
                {isEditing && ' - Il codice non può essere modificato'}
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
                  placeholder="Es. Materiali, Servizi, Finiture" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Descrizione della tipologia articolo
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Gestione Magazzino */}
          <FormField
            control={form.control}
            name="manageStock"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Gestione Magazzino</FormLabel>
                  <FormDescription>
                    La tipologia è gestita a magazzino?
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
                    Tipologia disponibile per l'uso
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
            {isEditing ? 'Aggiorna' : 'Crea'} Tipologia
          </Button>
        </div>
      </form>
    </Form>
  );
}
