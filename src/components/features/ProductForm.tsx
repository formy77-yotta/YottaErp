/**
 * Form per creazione/editing prodotto
 * 
 * CARATTERISTICHE:
 * - Validazione con Zod
 * - Supporto creazione e modifica
 * - Caricamento classificazioni (categoria, tipologia, aliquota IVA)
 * - Gestione errori da server
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  createProductSchema, 
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput
} from '@/schemas/product-schema';
import { 
  createProductAction, 
  updateProductAction
} from '@/services/actions/product-actions';
import { getProductCategoriesAction } from '@/services/actions/product-category-actions';
import { getProductTypesAction } from '@/services/actions/product-type-actions';
import { getVatRatesAction } from '@/services/actions/vat-actions';

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
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

interface ProductFormProps {
  /**
   * Prodotto da modificare (undefined = creazione nuova)
   */
  product?: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    categoryId: string | null;
    typeId: string | null;
    price: string; // Decimal come stringa
    vatRateId: string | null;
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

type ProductFormInput = CreateProductInput | (UpdateProductInput & { id?: string });

export function ProductForm({ 
  product, 
  onSuccess, 
  onError 
}: ProductFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; code: string; description: string }>>([]);
  const [types, setTypes] = useState<Array<{ id: string; code: string; description: string; manageStock: boolean }>>([]);
  const [vatRates, setVatRates] = useState<Array<{ id: string; name: string; value: string }>>([]);
  const [loadingData, setLoadingData] = useState(true);
  const isEditing = !!product;

  // Setup form con validazione Zod
  const form = useForm<ProductFormInput>({
    resolver: zodResolver(isEditing ? updateProductSchema : createProductSchema) as any,
    defaultValues: {
      code: '',
      name: '',
      description: '',
      categoryId: '',
      typeId: '',
      price: '',
      vatRateId: '',
      active: true,
      ...(isEditing && product ? { id: product.id } : {}),
    },
  });

  // Carica classificazioni al mount
  useEffect(() => {
    async function loadData() {
      setLoadingData(true);
      try {
        // Carica categorie
        const categoriesResult = await getProductCategoriesAction();
        if (categoriesResult.success) {
          setCategories(categoriesResult.data.filter(c => c.active));
        }

        // Carica tipologie
        const typesResult = await getProductTypesAction();
        if (typesResult.success) {
          setTypes(typesResult.data.filter(t => t.active));
        }

        // Carica aliquote IVA
        const vatRatesResult = await getVatRatesAction();
        if (vatRatesResult.success) {
          setVatRates(vatRatesResult.data.filter(v => v.active));
        }
      } catch (error) {
        console.error('Errore caricamento classificazioni:', error);
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, []);

  // Aggiorna i valori del form quando il prodotto viene caricato
  useEffect(() => {
    if (product) {
      form.reset({
        code: product.code,
        name: product.name,
        description: product.description || '',
        categoryId: product.categoryId || '',
        typeId: product.typeId || '',
        price: product.price,
        vatRateId: product.vatRateId || '',
        active: product.active,
        ...(isEditing ? { id: product.id } : {}),
      }, { keepDefaultValues: false });
    } else {
      // Reset al form vuoto quando si crea un nuovo prodotto
      form.reset({
        code: '',
        name: '',
        description: '',
        categoryId: '',
        typeId: '',
        price: '',
        vatRateId: '',
        active: true,
      }, { keepDefaultValues: false });
    }
  }, [product, form, isEditing]);

  /**
   * Handler submit form
   */
  async function onSubmit(data: ProductFormInput) {
    setIsLoading(true);

    try {
      let result;

      if (isEditing && product) {
        // Aggiornamento prodotto esistente
        const updateData: UpdateProductInput = {
          id: product.id,
          ...data,
        };

        result = await updateProductAction(updateData);
      } else {
        // Creazione nuovo prodotto
        result = await createProductAction(data as CreateProductInput);
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

  if (loadingData) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Codice articolo */}
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Codice Articolo *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="PROD001" 
                  {...field}
                  disabled={isLoading || isEditing} // Codice non modificabile in editing
                />
              </FormControl>
              <FormDescription>
                Codice univoco del prodotto (solo lettere maiuscole, numeri, - e _)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Nome prodotto */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Prodotto *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Nome del prodotto" 
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                Nome descrittivo del prodotto
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
              <FormLabel>Descrizione</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Descrizione dettagliata del prodotto..."
                  {...field}
                  disabled={isLoading}
                  rows={4}
                />
              </FormControl>
              <FormDescription>
                Descrizione opzionale del prodotto
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Categoria e Tipologia in riga */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Categoria */}
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                  value={field.value || 'none'}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nessuna categoria</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.code} - {category.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Classificazione per categoria articolo
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Tipologia */}
          <FormField
            control={form.control}
            name="typeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipologia</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                  value={field.value || 'none'}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona tipologia" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nessuna tipologia</SelectItem>
                    {types.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.code} - {type.description}
                        {type.manageStock && ' (Magazzino)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Classificazione per tipologia articolo
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Prezzo e Aliquota IVA in riga */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Prezzo */}
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prezzo di Listino *</FormLabel>
                <FormControl>
                  <Input 
                    type="text"
                    placeholder="19.99" 
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormDescription>
                  Prezzo unitario in euro (es. 19.99)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Aliquota IVA */}
          <FormField
            control={form.control}
            name="vatRateId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Aliquota IVA Predefinita</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                  value={field.value || 'none'}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona aliquota IVA" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nessuna aliquota</SelectItem>
                    {vatRates.map((vatRate) => (
                      <SelectItem key={vatRate.id} value={vatRate.id}>
                        {vatRate.name} ({(parseFloat(vatRate.value) * 100).toFixed(0)}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Aliquota IVA di default per questo prodotto
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Attivo */}
        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Prodotto Attivo</FormLabel>
                <FormDescription>
                  I prodotti non attivi non sono visibili nelle selezioni
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
            {isEditing ? 'Aggiorna Prodotto' : 'Crea Prodotto'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
