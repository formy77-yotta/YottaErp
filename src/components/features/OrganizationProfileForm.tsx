/**
 * Form per modifica anagrafica organizzazione corrente
 * 
 * CARATTERISTICHE:
 * - Modifica solo l'organizzazione dell'utente autenticato
 * - Validazione P.IVA, Codice Fiscale, REA
 * - Gestione logo per stampe
 * - Sezioni organizzate: Dati Azienda, Iscrizione REA, Contatti, Logo
 * - PERMESSI: Solo OWNER e ADMIN possono modificare
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateCurrentOrganizationAction, uploadOrganizationLogoAction } from '@/services/actions/organization-actions';
import { updateOrganizationSchema, type UpdateOrganizationInput } from '@/schemas/organization-schema';

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Building2, FileText, Mail, Image as ImageIcon, Upload, X, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface OrganizationProfileFormProps {
  organization: {
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
    reaUfficio?: string | null;
    reaNumero?: string | null;
    reaCapitaleSociale?: string | null;
    regimeFiscale?: string | null;
    fiscalYear?: number | null;
    plan?: string;
    maxUsers?: number;
    maxInvoicesPerYear?: number;
    active?: boolean;
  };
}

/**
 * Valori Regime Fiscale secondo Technical Rules v2.6
 */
const REGIME_FISCALE_OPTIONS = [
  { value: 'RF01', label: 'RF01 - Ordinario' },
  { value: 'RF02', label: 'RF02 - Contribuenti minimi' },
  { value: 'RF04', label: 'RF04 - Agricoltura' },
  { value: 'RF05', label: 'RF05 - Vendita sali e tabacchi' },
  { value: 'RF06', label: 'RF06 - Commercio fiammiferi' },
  { value: 'RF07', label: 'RF07 - Editoria' },
  { value: 'RF08', label: 'RF08 - Gestione servizi telefonia pubblica' },
  { value: 'RF09', label: 'RF09 - Rivendita documenti di trasporto pubblico' },
  { value: 'RF10', label: 'RF10 - Intrattenimenti, giochi e altre attività' },
  { value: 'RF11', label: 'RF11 - Agenzie viaggi e turismo' },
  { value: 'RF12', label: 'RF12 - Agriturismo' },
  { value: 'RF13', label: 'RF13 - Vendite a domicilio' },
  { value: 'RF14', label: 'RF14 - Rivendita beni usati, oggetti d\'arte, d\'antiquariato' },
  { value: 'RF15', label: 'RF15 - Agenzie di vendite all\'asta di oggetti d\'arte' },
  { value: 'RF16', label: 'RF16 - IVA per cassa P.A.' },
  { value: 'RF17', label: 'RF17 - IVA per cassa (art. 32-bis, D.L. 83/2012)' },
  { value: 'RF18', label: 'RF18 - Altro' },
  { value: 'RF19', label: 'RF19 - Regime forfettario (art.1, c.54-89, L. 190/2014)' },
] as const;

const VALID_REGIME_FISCALE_VALUES = ['RF01', 'RF02', 'RF04', 'RF05', 'RF06', 'RF07', 'RF08', 'RF09', 'RF10', 'RF11', 'RF12', 'RF13', 'RF14', 'RF15', 'RF16', 'RF17', 'RF18', 'RF19'] as const;

function validateRegimeFiscale(value: string | null | undefined): 'RF01' | 'RF02' | 'RF04' | 'RF05' | 'RF06' | 'RF07' | 'RF08' | 'RF09' | 'RF10' | 'RF11' | 'RF12' | 'RF13' | 'RF14' | 'RF15' | 'RF16' | 'RF17' | 'RF18' | 'RF19' {
  if (value && VALID_REGIME_FISCALE_VALUES.includes(value as typeof VALID_REGIME_FISCALE_VALUES[number])) {
    return value as typeof VALID_REGIME_FISCALE_VALUES[number];
  }
  return 'RF01';
}

export function OrganizationProfileForm({ organization }: OrganizationProfileFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);

  // Setup form con validazione Zod
  const form = useForm<UpdateOrganizationInput>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: {
      id: organization.id,
      businessName: organization.businessName,
      vatNumber: organization.vatNumber || '',
      fiscalCode: organization.fiscalCode || '',
      address: organization.address || '',
      city: organization.city || '',
      province: organization.province || '',
      zipCode: organization.zipCode || '',
      country: organization.country || 'IT',
      email: organization.email || '',
      pec: organization.pec || '',
      phone: organization.phone || '',
      sdiCode: organization.sdiCode || '',
      logoUrl: organization.logoUrl || '',
      reaUfficio: organization.reaUfficio || '',
      reaNumero: organization.reaNumero || '',
      reaCapitaleSociale: organization.reaCapitaleSociale || '',
      regimeFiscale: validateRegimeFiscale(organization.regimeFiscale),
      fiscalYear: organization.fiscalYear ?? new Date().getFullYear(),
    },
  });

  /**
   * Handler submit form
   */
  async function onSubmit(data: UpdateOrganizationInput) {
    setIsLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      let logoUrl: string | null = organization.logoUrl || null;
      if (removeLogo) {
        logoUrl = null;
      } else if (pendingLogoFile) {
        const formData = new FormData();
        formData.append('logo', pendingLogoFile);
        const uploadResult = await uploadOrganizationLogoAction(formData);
        if (!uploadResult.success) {
          setErrorMessage(uploadResult.error);
          setIsLoading(false);
          return;
        }
        logoUrl = uploadResult.url;
      }

      const updateData = {
        businessName: data.businessName,
        vatNumber: data.vatNumber || null,
        fiscalCode: data.fiscalCode || null,
        address: data.address || null,
        city: data.city || null,
        province: data.province || null,
        zipCode: data.zipCode || null,
        country: data.country,
        email: data.email || null,
        pec: data.pec || null,
        phone: data.phone || null,
        sdiCode: data.sdiCode || null,
        logoUrl,
        reaUfficio: data.reaUfficio || null,
        reaNumero: data.reaNumero || null,
        reaCapitaleSociale: data.reaCapitaleSociale || null,
        regimeFiscale: data.regimeFiscale,
        fiscalYear: data.fiscalYear ?? null,
      };

      const result = await updateCurrentOrganizationAction(updateData);

      if (result.success) {
        setSuccessMessage('Anagrafica organizzazione aggiornata con successo');
        setPendingLogoFile(null);
        setRemoveLogo(false);
        router.refresh(); // Ricarica dati dal server
      } else {
        setErrorMessage(result.error || 'Errore durante l\'aggiornamento');
      }
    } catch (error) {
      console.error('Errore aggiornamento organizzazione:', error);
      setErrorMessage('Errore durante l\'aggiornamento dell\'anagrafica');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Messaggi successo/errore */}
        {successMessage && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <p className="text-sm text-green-800">{successMessage}</p>
            </CardContent>
          </Card>
        )}

        {errorMessage && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-sm text-red-800">{errorMessage}</p>
            </CardContent>
          </Card>
        )}

        {/* Sezione: Dati Azienda */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Dati Azienda
            </CardTitle>
            <CardDescription>
              Informazioni principali dell'organizzazione per fatturazione elettronica
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ragione Sociale *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Es. Acme S.r.l." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vatNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>P.IVA</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="12345678901" maxLength={11} />
                    </FormControl>
                    <FormDescription>11 cifre numeriche</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fiscalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Codice Fiscale</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="RSSMRA80A01H501U" maxLength={16} />
                    </FormControl>
                    <FormDescription>16 caratteri (persona fisica) o 11 cifre (società)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="regimeFiscale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Regime Fiscale *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || 'RF01'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona regime fiscale" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REGIME_FISCALE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Obbligatorio per fatturazione elettronica (default: RF01 - Ordinario)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Sezione: Iscrizione REA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Iscrizione REA (Registro Imprese)
            </CardTitle>
            <CardDescription>
              Obbligatorio per società iscritte al Registro Imprese (art. 2250 CC)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="reaUfficio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ufficio REA</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="RM" maxLength={2} className="uppercase" />
                    </FormControl>
                    <FormDescription>2 lettere (es. RM, MI)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reaNumero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numero REA</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="123456" maxLength={20} />
                    </FormControl>
                    <FormDescription>Numero di iscrizione</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reaCapitaleSociale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capitale Sociale (€)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="10000.00" type="text" />
                    </FormControl>
                    <FormDescription>Obbligatorio per società di capitali</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sezione: Indirizzo */}
        <Card>
          <CardHeader>
            <CardTitle>Sede Legale</CardTitle>
            <CardDescription>Indirizzo completo della sede legale</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Indirizzo</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Via Roma, 1" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CAP</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="00100" maxLength={5} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Città</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Roma" />
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
                      <Input {...field} placeholder="RM" maxLength={2} className="uppercase" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paese</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="IT" maxLength={2} className="uppercase" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sezione: Contatti */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contatti
            </CardTitle>
            <CardDescription>
              Email, PEC e telefono per comunicazioni e fatturazione elettronica
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="info@azienda.it" />
                    </FormControl>
                    <FormDescription>Email principale</FormDescription>
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
                      <Input {...field} type="email" placeholder="pec@azienda.it" />
                    </FormControl>
                    <FormDescription>Posta Elettronica Certificata</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefono</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+39 06 12345678" maxLength={20} />
                    </FormControl>
                    <FormDescription>Max 12 caratteri per fatturazione elettronica</FormDescription>
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
                      <Input {...field} placeholder="KRRH6B9" maxLength={7} className="uppercase" />
                    </FormControl>
                    <FormDescription>Codice Sistema di Interscambio (7 caratteri)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sezione: Logo (upload file) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Logo Aziendale
            </CardTitle>
            <CardDescription>
              Carica un'immagine da utilizzare nelle stampe dei documenti (fatture, preventivi, ecc.). Formati: PNG, JPEG, WebP. Max 2 MB.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Anteprima: logo attuale o file selezionato */}
            {(organization.logoUrl && !removeLogo && !pendingLogoFile) && (
              <div className="flex items-center gap-4 flex-wrap">
                <img
                  src={organization.logoUrl}
                  alt="Logo organizzazione"
                  className="h-20 w-auto object-contain border rounded p-2"
                />
                <div className="text-sm text-muted-foreground">
                  Logo attuale
                </div>
              </div>
            )}
            {pendingLogoFile && (
              <div className="flex items-center gap-4 flex-wrap">
                <img
                  src={URL.createObjectURL(pendingLogoFile)}
                  alt="Nuovo logo"
                  className="h-20 w-auto object-contain border rounded p-2"
                />
                <div className="text-sm text-muted-foreground">
                  Nuovo logo (salva le modifiche per applicare)
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setPendingLogoFile(f);
                      setRemoveLogo(false);
                    }
                    e.target.value = '';
                  }}
                />
                <Button type="button" variant="outline" asChild>
                  <span className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    {organization.logoUrl || pendingLogoFile ? 'Sostituisci logo' : 'Carica logo'}
                  </span>
                </Button>
              </label>
              {(organization.logoUrl || pendingLogoFile) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => {
                    setRemoveLogo(true);
                    setPendingLogoFile(null);
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Rimuovi logo
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sezione: Parametri */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Parametri
            </CardTitle>
            <CardDescription>
              Impostazioni generali dell&apos;organizzazione (anno contabile, ecc.)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="fiscalYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anno contabile</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(parseInt(v, 10))}
                    value={field.value?.toString() ?? ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona anno" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Anno di riferimento per documenti e numerazioni (es. fatture, preventivi).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Pulsanti azione */}
        <div className="flex justify-end gap-4">
          <Button
            type="submit"
            disabled={isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              'Salva Modifiche'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
