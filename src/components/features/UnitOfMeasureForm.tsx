/**
 * Form per creazione/editing unità di misura
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { 
  createUnitOfMeasureSchema, 
  updateUnitOfMeasureSchema,
  type CreateUnitOfMeasureInput,
  type UpdateUnitOfMeasureInput,
  type MeasureClass,
  MEASURE_CLASSES
} from '@/schemas/unit-of-measure-schema';
import { 
  createUnitOfMeasureAction, 
  updateUnitOfMeasureAction
} from '@/services/actions/unit-of-measure-actions';

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

interface UnitOfMeasureFormProps {
  /**
   * Unità di misura da modificare (undefined = creazione nuova)
   */
  unit?: {
    id: string;
    code: string;
    name: string;
    measureClass: string;
    baseFactor: string;
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

type UnitOfMeasureFormInput = CreateUnitOfMeasureInput | (UpdateUnitOfMeasureInput & { id?: string });

export function UnitOfMeasureForm({ 
  unit, 
  onSuccess, 
  onError 
}: UnitOfMeasureFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!unit;

  // Setup form con validazione Zod
  const form = useForm<UnitOfMeasureFormInput>({
    resolver: zodResolver(isEditing ? updateUnitOfMeasureSchema : createUnitOfMeasureSchema) as any,
    defaultValues: {
      code: '',
      name: '',
      measureClass: 'PIECE',
      baseFactor: '1.000000',
      active: true,
      ...(isEditing && unit ? { id: unit.id } : {}),
    },
  });

  // Aggiorna i valori del form quando l'unità viene caricata
  useEffect(() => {
    if (unit) {
      form.reset({
        code: unit.code,
        name: unit.name,
        measureClass: unit.measureClass as MeasureClass,
        baseFactor: unit.baseFactor,
        active: unit.active,
        ...(isEditing ? { id: unit.id } : {}),
      }, { keepDefaultValues: false });
    } else {
      // Reset al form vuoto quando si crea una nuova unità
      form.reset({
        code: '',
        name: '',
        measureClass: 'PIECE',
        baseFactor: '1.000000',
        active: true,
      }, { keepDefaultValues: false });
    }
  }, [unit, form, isEditing]);

  /**
   * Handler submit form
   */
  async function onSubmit(data: UnitOfMeasureFormInput) {
    setIsLoading(true);

    try {
      let result;

      if (isEditing && unit) {
        // Aggiornamento unità esistente
        const updateData: UpdateUnitOfMeasureInput = {
          id: unit.id,
          code: data.code,
          name: data.name,
          measureClass: data.measureClass,
          baseFactor: data.baseFactor,
          active: data.active,
        };
        
        result = await updateUnitOfMeasureAction(updateData);
      } else {
        // Creazione nuova unità
        if (!data.code || !data.name || !data.measureClass || !data.baseFactor) {
          throw new Error('Tutti i campi obbligatori devono essere compilati');
        }
        const createData: CreateUnitOfMeasureInput = {
          code: data.code as string,
          name: data.name as string,
          measureClass: data.measureClass as typeof MEASURE_CLASSES[number],
          baseFactor: data.baseFactor as string,
          active: data.active ?? true,
        };
        
        result = await createUnitOfMeasureAction(createData);
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

  // Etichette per le classi di misura
  const measureClassLabels: Record<string, string> = {
    WEIGHT: 'Peso',
    LENGTH: 'Lunghezza',
    VOLUME: 'Volume',
    PIECE: 'Pezzi',
    AREA: 'Superficie',
    TIME: 'Tempo',
  };

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
                  placeholder="Es. G, KG, M, PZ" 
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
                Codice univoco dell'unità di misura (solo lettere maiuscole, numeri e underscore)
                {isEditing && ' - Il codice non può essere modificato'}
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
              <FormLabel>Nome *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Es. Grammi, Chilogrammi, Metri, Pezzi" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Nome completo dell'unità di misura
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Classe di Misura */}
          <FormField
            control={form.control}
            name="measureClass"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Classe di Misura *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona classe" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MEASURE_CLASSES.map((cls) => (
                      <SelectItem key={cls} value={cls}>
                        {measureClassLabels[cls] || cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Classe di misura per conversioni automatiche
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Fattore di Conversione */}
          <FormField
            control={form.control}
            name="baseFactor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fattore di Conversione *</FormLabel>
                <FormControl>
                  <Input 
                    type="text"
                    placeholder="1.000000" 
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Valore rispetto all'unità di base della classe (es. se base è G: G=1, KG=1000)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Attiva */}
        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Attiva</FormLabel>
                <FormDescription>
                  Unità di misura disponibile per l'uso
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

        {/* Pulsanti Azione */}
        <div className="flex justify-end space-x-4 pt-4">
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Aggiorna' : 'Crea'} Unità di Misura
          </Button>
        </div>
      </form>
    </Form>
  );
}
