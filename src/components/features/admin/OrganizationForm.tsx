/**
 * Form per creazione/editing organizzazioni (Super Admin)
 * 
 * CARATTERISTICHE:
 * - Validazione P.IVA e Codice Fiscale italiana
 * - Supporto creazione e modifica
 * - Validazione client-side con Zod
 * - Gestione errori da server (P.IVA duplicata, ecc.)
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  organizationSchema, 
  type OrganizationInput 
} from '@/schemas/organization-schema';
import { 
  createOrganizationAdmin, 
  updateOrganizationAdmin 
} from '@/services/actions/organization-actions';

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

interface OrganizationFormProps {
  /**
   * Organizzazione da modificare (undefined = creazione nuova)
   */
  organization?: {
    id: string;
    businessName: string;
    vatNumber?: string | null;
    fiscalCode?: string | null;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    zipCode?: string | null;
    country?: string;
    email?: string | null;
    pec?: string | null;
    phone?: string | null;
    sdiCode?: string | null;
    logoUrl?: string | null;
    plan: string;
    maxUsers: number;
    maxInvoicesPerYear: number;
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

export function OrganizationForm({ 
  organization, 
  onSuccess, 
  onError 
}: OrganizationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!organization;

  // Setup form con validazione Zod
  const form = useForm<OrganizationInput>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      businessName: organization?.businessName || '',
      vatNumber: organization?.vatNumber || undefined,
      fiscalCode: organization?.fiscalCode || undefined,
      address: organization?.address || undefined,
      city: organization?.city || undefined,
      province: organization?.province || undefined,
      zipCode: organization?.zipCode || undefined,
      country: organization?.country || 'IT',
      email: organization?.email || undefined,
      pec: organization?.pec || undefined,
      phone: organization?.phone || undefined,
      sdiCode: organization?.sdiCode || undefined,
      logoUrl: organization?.logoUrl || undefined,
      plan: (organization?.plan as 'FREE' | 'BASIC' | 'PREMIUM') || 'FREE',
      maxUsers: organization?.maxUsers || 5,
      maxInvoicesPerYear: organization?.maxInvoicesPerYear || 500,
      active: organization?.active ?? true,
    },
  });

  /**
   * Handler submit form
   */
  async function onSubmit(data: OrganizationInput) {
    setIsLoading(true);

    try {
      let result;

      if (isEditing) {
        // Aggiornamento organizzazione esistente
        result = await updateOrganizationAdmin(organization.id, {
          ...data,
          // Converti stringhe vuote in null
          vatNumber: data.vatNumber || null,
          fiscalCode: data.fiscalCode || null,
          address: data.address || null,
          city: data.city || null,
          province: data.province || null,
          zipCode: data.zipCode || null,
          email: data.email || null,
          pec: data.pec || null,
          phone: data.phone || null,
          sdiCode: data.sdiCode || null,
          logoUrl: data.logoUrl || null,
        });
      } else {
        // Creazione nuova organizzazione
        result = await createOrganizationAdmin({
          ...data,
          // Converti stringhe vuote in undefined
          vatNumber: data.vatNumber || undefined,
          fiscalCode: data.fiscalCode || undefined,
          address: data.address || undefined,
          city: data.city || undefined,
          province: data.province || undefined,
          zipCode: data.zipCode || undefined,
          email: data.email || undefined,
          pec: data.pec || undefined,
          phone: data.phone || undefined,
          sdiCode: data.sdiCode || undefined,
          logoUrl: data.logoUrl || undefined,
        });
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* SEZIONE: Dati Azienda */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Dati Azienda</h3>

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
                    Almeno P.IVA o Codice Fiscale obbligatorio
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

          {/* Piano e Stato */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Piano */}
            <FormField
              control={form.control}
              name="plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Piano *</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona piano" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="FREE">FREE</SelectItem>
                      <SelectItem value="BASIC">BASIC</SelectItem>
                      <SelectItem value="PREMIUM">PREMIUM</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Max Utenti */}
            <FormField
              control={form.control}
              name="maxUsers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Utenti</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={1}
                      max={1000}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Max Fatture/Anno */}
            <FormField
              control={form.control}
              name="maxInvoicesPerYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Fatture/Anno</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={1}
                      max={1000000}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Stato Attivo */}
          <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Organizzazione Attiva</FormLabel>
                  <FormDescription>
                    Disattivando, tutti gli utenti perderanno accesso
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

        {/* SEZIONE: Indirizzo */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Indirizzo Sede Legale</h3>

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
        </div>

        {/* SEZIONE: Contatti */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Contatti</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefono</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="+39 02 1234567" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sdiCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Codice SDI</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="ABCDEFG (7 caratteri)" 
                      maxLength={7}
                      style={{ textTransform: 'uppercase' }}
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormDescription>
                    Per fatturazione elettronica
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Pulsanti Azione */}
        <div className="flex justify-end space-x-4">
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Aggiorna' : 'Crea'} Organizzazione
          </Button>
        </div>
      </form>
    </Form>
  );
}
