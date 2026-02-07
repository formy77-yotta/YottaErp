/**
 * Form per creazione/editing entità (Anagrafiche)
 * 
 * CARATTERISTICHE:
 * - Validazione P.IVA e Codice Fiscale italiana
 * - Supporto creazione e modifica
 * - Validazione client-side con Zod
 * - Gestione errori da server (P.IVA duplicata, ecc.)
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  createEntitySchema, 
  updateEntitySchema,
  type CreateEntityInput,
  type UpdateEntityInput
} from '@/schemas/entity-schema';
import { 
  createEntityAction, 
  updateEntityAction
} from '@/services/actions/entity-actions';

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
import { Loader2 } from 'lucide-react';

interface EntityFormProps {
  /**
   * Entità da modificare (undefined = creazione nuova)
   */
  entity?: {
    id: string;
    type: 'CUSTOMER' | 'SUPPLIER' | 'LEAD';
    businessName: string;
    vatNumber?: string | null;
    fiscalCode?: string | null;
    address: string;
    city: string;
    province: string;
    zipCode: string;
    email?: string | null;
    pec?: string | null;
    sdiCode?: string | null;
  };
  
  /**
   * Tipo predefinito per nuove entità
   */
  defaultType?: 'CUSTOMER' | 'SUPPLIER' | 'LEAD';
  
  /**
   * Callback chiamato dopo salvataggio con successo
   */
  onSuccess?: () => void;
  
  /**
   * Callback chiamato in caso di errore
   */
  onError?: (error: string) => void;
}

export function EntityForm({ 
  entity, 
  defaultType,
  onSuccess, 
  onError 
}: EntityFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!entity;

  // Tipo predefinito: usa entity.type se editing, altrimenti defaultType o 'CUSTOMER'
  const initialType = entity?.type || defaultType || 'CUSTOMER';

  // Setup form con validazione Zod
  const form = useForm<CreateEntityInput>({
    resolver: zodResolver(createEntitySchema) as any,
    defaultValues: {
      type: initialType,
      businessName: '',
      vatNumber: '',
      fiscalCode: '',
      address: '',
      city: '',
      province: '',
      zipCode: '',
      email: '',
      pec: '',
      sdiCode: '',
    },
  });

  // Aggiorna i valori del form quando l'entità viene caricata
  useEffect(() => {
    if (entity) {
      form.reset({
        type: entity.type,
        businessName: entity.businessName || '',
        vatNumber: entity.vatNumber ?? '',
        fiscalCode: entity.fiscalCode ?? '',
        address: entity.address || '',
        city: entity.city || '',
        province: entity.province || '',
        zipCode: entity.zipCode || '',
        email: entity.email ?? '',
        pec: entity.pec ?? '',
        sdiCode: entity.sdiCode ?? '',
      }, { keepDefaultValues: false });
    } else {
      // Reset al form vuoto quando si crea una nuova entità
      form.reset({
        type: defaultType || 'CUSTOMER',
        businessName: '',
        vatNumber: '',
        fiscalCode: '',
        address: '',
        city: '',
        province: '',
        zipCode: '',
        email: '',
        pec: '',
        sdiCode: '',
      }, { keepDefaultValues: false });
    }
  }, [entity, form]);

  /**
   * Handler submit form
   */
  async function onSubmit(data: CreateEntityInput) {
    setIsLoading(true);

    try {
      let result;

      if (isEditing && entity) {
        // Aggiornamento entità esistente
        const updateData: UpdateEntityInput = {
          id: entity.id,
          ...data,
          // Converti stringhe vuote in undefined per permettere aggiornamenti parziali
          vatNumber: data.vatNumber && data.vatNumber.trim() !== '' ? data.vatNumber : undefined,
          fiscalCode: data.fiscalCode && data.fiscalCode.trim() !== '' ? data.fiscalCode : undefined,
          address: data.address && data.address.trim() !== '' ? data.address : undefined,
          city: data.city && data.city.trim() !== '' ? data.city : undefined,
          province: data.province && data.province.trim() !== '' ? data.province : undefined,
          zipCode: data.zipCode && data.zipCode.trim() !== '' ? data.zipCode : undefined,
          email: data.email && data.email.trim() !== '' ? data.email : undefined,
          pec: data.pec && data.pec.trim() !== '' ? data.pec : undefined,
          sdiCode: data.sdiCode && data.sdiCode.trim() !== '' ? data.sdiCode : undefined,
        };
        
        result = await updateEntityAction(updateData);
      } else {
        // Creazione nuova entità
        // Converti stringhe vuote in undefined/null per il database
        const createData: CreateEntityInput = {
          ...data,
          vatNumber: data.vatNumber && data.vatNumber.trim() !== '' ? data.vatNumber : undefined,
          fiscalCode: data.fiscalCode && data.fiscalCode.trim() !== '' ? data.fiscalCode : undefined,
          address: data.address && data.address.trim() !== '' ? data.address : undefined,
          city: data.city && data.city.trim() !== '' ? data.city : undefined,
          province: data.province && data.province.trim() !== '' ? data.province : undefined,
          zipCode: data.zipCode && data.zipCode.trim() !== '' ? data.zipCode : undefined,
          email: data.email && data.email.trim() !== '' ? data.email : undefined,
          pec: data.pec && data.pec.trim() !== '' ? data.pec : undefined,
          sdiCode: data.sdiCode && data.sdiCode.trim() !== '' ? data.sdiCode : undefined,
        };
        
        result = await createEntityAction(createData);
      }

      if (result.success) {
        // Successo
        onSuccess?.();
      } else {
        // Errore dal server (es. P.IVA duplicata)
        onError?.(result.error || 'Errore sconosciuto');
        
        // Se errore P.IVA duplicata, mostra errore sul campo
        if (result.error?.includes('P.IVA')) {
          form.setError('vatNumber', {
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
        {/* Tipo Entità */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo Entità *</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="CUSTOMER">Cliente</SelectItem>
                  <SelectItem value="SUPPLIER">Fornitore</SelectItem>
                  <SelectItem value="LEAD">Lead</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Ragione Sociale */}
        <FormField
          control={form.control}
          name="businessName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ragione Sociale *</FormLabel>
              <FormControl>
                <Input placeholder="Es. Acme S.r.l." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* P.IVA */}
          <FormField
            control={form.control}
            name="vatNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Partita IVA</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="12345678901 (11 cifre)" 
                    maxLength={11}
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Opzionale. Se inserita, verrà verificata l'unicità.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Codice Fiscale */}
          <FormField
            control={form.control}
            name="fiscalCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Codice Fiscale</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="RSSMRA80A01H501U (16 caratteri)" 
                    maxLength={16}
                    style={{ textTransform: 'uppercase' }}
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Indirizzo */}
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Indirizzo</FormLabel>
              <FormControl>
                <Input placeholder="Via Roma 1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Città */}
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Città</FormLabel>
                <FormControl>
                  <Input placeholder="Milano" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Provincia */}
          <FormField
            control={form.control}
            name="province"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Provincia</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="MI" 
                    maxLength={2}
                    style={{ textTransform: 'uppercase' }}
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* CAP */}
          <FormField
            control={form.control}
            name="zipCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CAP</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="20100" 
                    maxLength={5}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input 
                  type="email" 
                  placeholder="info@azienda.it" 
                  {...field} 
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* PEC e Codice SDI */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* PEC */}
          <FormField
            control={form.control}
            name="pec"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PEC</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="pec@azienda.it" 
                    {...field} 
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormDescription>
                  Posta Elettronica Certificata per fatturazione elettronica
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Codice SDI */}
          <FormField
            control={form.control}
            name="sdiCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Codice SDI</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="XXXXXXX" 
                    maxLength={7}
                    {...field} 
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormDescription>
                  Codice Destinatario Sistema di Interscambio (7 caratteri)
                </FormDescription>
                <FormMessage />
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
            {isEditing ? 'Aggiorna' : 'Crea'} Entità
          </Button>
        </div>
      </form>
    </Form>
  );
}
