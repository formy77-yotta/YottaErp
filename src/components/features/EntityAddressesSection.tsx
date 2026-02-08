'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Home, MapPin, Truck, Plus, Star, Trash2, Loader2 } from 'lucide-react';
import type { EntityAddressRow } from '@/services/actions/entity-actions';
import {
  addEntityAddressAction,
  setDefaultEntityAddressAction,
  deleteEntityAddressAction,
} from '@/services/actions/entity-actions';
import { entityAddressSchema, type EntityAddressInput } from '@/lib/validations/entity';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ADDRESS_TYPE_LABELS: Record<'LEGAL_HEADQUARTER' | 'SHIPPING', string> = {
  LEGAL_HEADQUARTER: 'Sede legale',
  SHIPPING: 'Destinazione consegna',
};

function AddressTypeIcon({ type }: { type: 'LEGAL_HEADQUARTER' | 'SHIPPING' }) {
  if (type === 'LEGAL_HEADQUARTER') return <Home className="h-4 w-4 text-muted-foreground" />;
  return <Truck className="h-4 w-4 text-muted-foreground" />;
}

interface EntityAddressesSectionProps {
  entityId: string;
  addresses: EntityAddressRow[];
}

export function EntityAddressesSection({ entityId, addresses: initialAddresses }: EntityAddressesSectionProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loadingDefault, setLoadingDefault] = useState<string | null>(null);

  const form = useForm<EntityAddressInput>({
    resolver: zodResolver(entityAddressSchema) as any,
    defaultValues: {
      type: 'LEGAL_HEADQUARTER',
      street: '',
      city: '',
      zipCode: '',
      province: '',
      country: 'IT',
      nominative: '',
      receiverName: '',
      isDefault: false,
    },
  });

  const addressType = form.watch('type');
  const showReceiverName = addressType === 'SHIPPING';

  async function onSubmit(data: EntityAddressInput) {
    const result = await addEntityAddressAction(entityId, {
      ...data,
      nominative: data.nominative?.trim() || undefined,
      receiverName: data.receiverName?.trim() || undefined,
    });
    if (result.success) {
      form.reset({
        type: 'LEGAL_HEADQUARTER',
        street: '',
        city: '',
        zipCode: '',
        province: '',
        country: 'IT',
        nominative: '',
        receiverName: '',
        isDefault: false,
      });
      setDialogOpen(false);
      router.refresh();
    } else {
      form.setError('root', { message: result.error });
    }
  }

  async function handleSetDefault(addressId: string) {
    setLoadingDefault(addressId);
    const result = await setDefaultEntityAddressAction(addressId, entityId);
    setLoadingDefault(null);
    if (result.success) router.refresh();
  }

  async function handleDelete(addressId: string) {
    const result = await deleteEntityAddressAction(addressId);
    setDeleteId(null);
    if (result.success) router.refresh();
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Sedi e Destinazioni
              </CardTitle>
              <CardDescription>
                Sede legale e indirizzi di consegna (es. subappalto: &quot;Presso Cantiere Beta&quot;).
                Se c&apos;è una sola sede è usata di default per DDT e Fatture.
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi indirizzo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Nuovo indirizzo</DialogTitle>
                  <DialogDescription>
                    Aggiungi una sede legale o una destinazione di consegna. Per le consegne puoi indicare un destinatario (es. Presso Cantiere Beta).
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="LEGAL_HEADQUARTER">Sede legale</SelectItem>
                              <SelectItem value="SHIPPING">Destinazione consegna</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="nominative"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nominativo</FormLabel>
                          <FormControl>
                            <Input placeholder="Azienda o persona terza (es. Edilizia Rossi S.r.l., Mario Bianchi)" {...field} />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Consegna o attività presso altra azienda o persona terza
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="street"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Indirizzo *</FormLabel>
                          <FormControl>
                            <Input placeholder="Via, numero civico" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CAP *</FormLabel>
                            <FormControl>
                              <Input placeholder="00100" {...field} />
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
                            <FormLabel>Città *</FormLabel>
                            <FormControl>
                              <Input placeholder="Roma" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="province"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Provincia *</FormLabel>
                            <FormControl>
                              <Input placeholder="RM" maxLength={2} {...field} />
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
                              <Input placeholder="IT" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {showReceiverName && (
                      <FormField
                        control={form.control}
                        name="receiverName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Destinatario (es. Presso Cantiere Beta)</FormLabel>
                            <FormControl>
                              <Input placeholder="Presso Cantiere Beta" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormField
                      control={form.control}
                      name="isDefault"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-2">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={(e) => field.onChange(e.target.checked)}
                              className="h-4 w-4 rounded border-input"
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Usa come indirizzo predefinito per DDT/Fatture</FormLabel>
                        </FormItem>
                      )}
                    />
                    {form.formState.errors.root && (
                      <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
                    )}
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Annulla
                      </Button>
                      <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Aggiungi
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {initialAddresses.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              Nessun indirizzo configurato. Aggiungi almeno la sede legale o una destinazione di consegna.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Tipo</TableHead>
                  <TableHead>Indirizzo</TableHead>
                  <TableHead className="hidden md:table-cell">Nominativo</TableHead>
                  <TableHead className="hidden sm:table-cell">Destinatario</TableHead>
                  <TableHead className="w-[100px]">Default</TableHead>
                  <TableHead className="w-[120px] text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialAddresses.map((addr) => (
                  <TableRow key={addr.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <AddressTypeIcon type={addr.type} />
                        <span className="text-sm">{ADDRESS_TYPE_LABELS[addr.type]}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{addr.street}</span>
                        <span className="text-muted-foreground ml-1">
                          {addr.zipCode} {addr.city} ({addr.province})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {addr.nominative || '—'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                      {addr.receiverName || '—'}
                    </TableCell>
                    <TableCell>
                      {addr.isDefault ? (
                        <Badge variant="secondary" className="text-xs">Predefinito</Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleSetDefault(addr.id)}
                          disabled={loadingDefault !== null}
                        >
                          {loadingDefault === addr.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Star className="h-3 w-3 mr-1" />
                              Imposta default
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(addr.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare indirizzo?</AlertDialogTitle>
            <AlertDialogDescription>
              L&apos;indirizzo verrà rimosso. Se era l&apos;unico, in DDT/Fatture si userà l&apos;indirizzo principale dell&apos;anagrafica.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
