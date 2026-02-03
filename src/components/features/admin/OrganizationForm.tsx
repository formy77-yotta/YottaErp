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

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  organizationSchema, 
  type OrganizationInput 
} from '@/schemas/organization-schema';
import { 
  createOrganizationAdmin, 
  updateOrganizationAdmin,
  getOrganizationUsers 
} from '@/services/actions/organization-actions';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Loader2, Plus, X } from 'lucide-react';

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
  const [adminEmails, setAdminEmails] = useState<string[]>(['']);
  const [existingUsers, setExistingUsers] = useState<Array<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    active: boolean;
  }>>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const isEditing = !!organization;

  // Carica utenti esistenti quando si modifica
  useEffect(() => {
    if (isEditing && organization?.id) {
      loadExistingUsers();
      // Reset adminEmails quando si modifica (solo campo vuoto per nuovi admin)
      setAdminEmails(['']);
    } else if (!isEditing) {
      // In creazione, inizia con un campo vuoto
      setAdminEmails(['']);
      setExistingUsers([]);
    }
  }, [isEditing, organization?.id]);

  async function loadExistingUsers() {
    if (!organization?.id) return;
    
    setIsLoadingUsers(true);
    const result = await getOrganizationUsers(organization.id);
    
    if (result.success) {
      setExistingUsers(result.users || []);
    }
    
    setIsLoadingUsers(false);
  }

  // Setup form con validazione Zod
  const form = useForm<OrganizationInput>({
    resolver: zodResolver(organizationSchema) as any,
    defaultValues: {
      businessName: '',
      vatNumber: '',
      fiscalCode: '',
      address: '',
      city: '',
      province: '',
      zipCode: '',
      country: 'IT',
      email: '',
      pec: '',
      phone: '',
      sdiCode: '',
      logoUrl: '',
      plan: 'FREE',
      maxUsers: 5,
      maxInvoicesPerYear: 500,
      active: true,
    },
  });

  // Aggiorna i valori del form quando l'organizzazione viene caricata
  useEffect(() => {
    if (organization) {
      form.reset({
        businessName: organization.businessName || '',
        vatNumber: organization.vatNumber ?? '',
        fiscalCode: organization.fiscalCode ?? '',
        address: organization.address ?? '',
        city: organization.city ?? '',
        province: organization.province ?? '',
        zipCode: organization.zipCode ?? '',
        country: organization.country || 'IT',
        email: organization.email ?? '',
        pec: organization.pec ?? '',
        phone: organization.phone ?? '',
        sdiCode: organization.sdiCode ?? '',
        logoUrl: organization.logoUrl ?? '',
        plan: (organization.plan as 'FREE' | 'BASIC' | 'PREMIUM') || 'FREE',
        maxUsers: organization.maxUsers || 5,
        maxInvoicesPerYear: organization.maxInvoicesPerYear || 500,
        active: organization.active ?? true,
      }, { keepDefaultValues: false });
    } else {
      // Reset al form vuoto quando si crea una nuova organizzazione
      form.reset({
        businessName: '',
        vatNumber: '',
        fiscalCode: '',
        address: '',
        city: '',
        province: '',
        zipCode: '',
        country: 'IT',
        email: '',
        pec: '',
        phone: '',
        sdiCode: '',
        logoUrl: '',
        plan: 'FREE',
        maxUsers: 5,
        maxInvoicesPerYear: 500,
        active: true,
      }, { keepDefaultValues: false });
    }
  }, [organization, form]);

  /**
   * Handler submit form
   */
  async function onSubmit(data: OrganizationInput) {
    // #region agent log
    console.log('[DEBUG] Form onSubmit - raw data:', {
      address: data.address,
      zipCode: data.zipCode,
      pec: data.pec,
      sdiCode: data.sdiCode,
      email: data.email,
      phone: data.phone,
      addressInData: 'address' in data,
      zipCodeInData: 'zipCode' in data,
    });
    // #endregion
    
    setIsLoading(true);

    try {
      let result;

      if (isEditing) {
        // Aggiornamento organizzazione esistente
        // Filtra email vuote per nuovi admin da aggiungere
        const validAdminEmails = adminEmails.filter(email => email.trim() !== '');
        
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
          // Aggiungi nuovi admin se specificati
          adminUserEmails: validAdminEmails.length > 0 ? validAdminEmails : undefined,
        });
      } else {
        // Creazione nuova organizzazione
        // Filtra email vuote e valida che almeno una sia presente
        const validAdminEmails = adminEmails.filter(email => email.trim() !== '');
        
        if (validAdminEmails.length === 0) {
          form.setError('adminUserEmails', {
            type: 'manual',
            message: 'Inserire almeno un utente admin',
          });
          setIsLoading(false);
          return;
        }

        // #region agent log
        console.log('[DEBUG] Form data before transformation:', {
          address: data.address,
          zipCode: data.zipCode,
          pec: data.pec,
          sdiCode: data.sdiCode,
          email: data.email,
          phone: data.phone,
          addressType: typeof data.address,
          addressInData: 'address' in data,
          allKeys: Object.keys(data),
        });
        // #endregion
        
        // Passa i dati così come sono - la Server Action li normalizzerà
        const transformedData = {
          ...data,
          adminUserEmails: validAdminEmails,
        };
        
        // #region agent log
        console.log('[DEBUG] Form data after transformation:', {
          address: transformedData.address,
          zipCode: transformedData.zipCode,
          pec: transformedData.pec,
          sdiCode: transformedData.sdiCode,
          email: transformedData.email,
          phone: transformedData.phone,
          addressType: typeof transformedData.address,
        });
        // #endregion
        
        result = await createOrganizationAdmin(transformedData);
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
                  <Input placeholder="Via Roma 1" {...field} value={field.value ?? ''} />
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
                    <Input placeholder="Milano" {...field} value={field.value ?? ''} />
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
                      value={field.value ?? ''}
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
                      value={field.value ?? ''}
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
                      value={field.value ?? ''}
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
                      value={field.value ?? ''}
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
                      value={field.value ?? ''}
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
                      value={field.value ?? ''}
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

        {/* SEZIONE: Utenti Admin */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            Utenti Amministratori {!isEditing && '*'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isEditing 
              ? 'Aggiungi nuovi utenti admin a questa organizzazione. Gli utenti esistenti sono mostrati sotto.'
              : 'Inserisci almeno un utente admin per questa organizzazione. Il primo utente sarà OWNER, gli altri ADMIN.'}
          </p>

          {/* Lista utenti esistenti (solo in modifica) */}
          {isEditing && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Utenti Esistenti</h4>
              {isLoadingUsers ? (
                <p className="text-sm text-muted-foreground">Caricamento utenti...</p>
              ) : existingUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun utente trovato</p>
              ) : (
                <div className="space-y-2 border rounded-lg p-4">
                  {existingUsers.map((user) => (
                    <div 
                      key={user.id} 
                      className="flex items-center justify-between py-2 border-b last:border-b-0"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}`
                            : user.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {user.email} • Ruolo: <span className="font-medium">{user.role}</span>
                        </div>
                      </div>
                      <Badge variant={user.role === 'OWNER' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Input per nuovi admin */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              {isEditing ? 'Aggiungi Nuovi Admin' : 'Utenti Admin'}
            </h4>
            {adminEmails.map((email, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1">
                  <Input
                    type="email"
                    placeholder="admin@azienda.it"
                    value={email}
                    onChange={(e) => {
                      const newEmails = [...adminEmails];
                      newEmails[index] = e.target.value;
                      setAdminEmails(newEmails);
                    }}
                    className={form.formState.errors.adminUserEmails ? 'border-destructive' : ''}
                  />
                  {form.formState.errors.adminUserEmails && index === 0 && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.adminUserEmails.message}
                    </p>
                  )}
                </div>
                {adminEmails.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const newEmails = adminEmails.filter((_, i) => i !== index);
                      setAdminEmails(newEmails);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAdminEmails([...adminEmails, ''])}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi altro admin
            </Button>
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
