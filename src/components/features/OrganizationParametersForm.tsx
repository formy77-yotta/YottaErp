/**
 * Form parametri organizzazione (sezione Parametri)
 * Per ora: solo Anno contabile
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updateCurrentOrganizationAction } from '@/services/actions/organization-actions';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

const paramsSchema = z.object({
  fiscalYear: z.number().int().min(2000).max(2100),
});

type ParamsFormValues = z.infer<typeof paramsSchema>;

interface OrganizationParametersFormProps {
  organization: {
    id: string;
    fiscalYear?: number | null;
  };
}

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => currentYear - 5 + i);

export function OrganizationParametersForm({ organization }: OrganizationParametersFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<ParamsFormValues>({
    resolver: zodResolver(paramsSchema),
    defaultValues: {
      fiscalYear: organization.fiscalYear ?? currentYear,
    },
  });

  async function onSubmit(data: ParamsFormValues) {
    setIsLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const result = await updateCurrentOrganizationAction({
        fiscalYear: data.fiscalYear,
      });
      if (result.success) {
        setSuccessMessage('Parametri aggiornati con successo');
        router.refresh();
      } else {
        setErrorMessage(result.error ?? 'Errore durante il salvataggio');
      }
    } catch (err) {
      console.error('Errore aggiornamento parametri:', err);
      setErrorMessage('Errore durante il salvataggio');
    } finally {
      setIsLoading(false);
    }
  }

  return (
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
        {successMessage && (
          <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-md p-3">
            {successMessage}
          </p>
        )}
        {errorMessage && (
          <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-md p-3">
            {errorMessage}
          </p>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      {YEAR_OPTIONS.map((year) => (
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
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salva parametri
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
