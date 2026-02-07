/**
 * Pagina gestione Aliquote IVA
 * 
 * Permette di visualizzare, creare e modificare le aliquote IVA dell'organizzazione.
 * MULTITENANT: Tutte le aliquote sono filtrate per organizationId
 */

import { Suspense } from 'react';
import { getVatRatesAction } from '@/services/actions/vat-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreateVatRateDialog } from '@/components/features/CreateVatRateDialog';
import { EditVatRateDialog } from '@/components/features/EditVatRateDialog';
import { Loader2 } from 'lucide-react';
import { SeedDefaultVatRatesButton } from '@/components/features/SeedDefaultVatRatesButton';

/**
 * Componente principale della pagina
 */
export default function VatRatesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Aliquote IVA</h1>
          <p className="text-muted-foreground mt-1">
            Gestisci le aliquote IVA della tua organizzazione
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SeedDefaultVatRatesButton />
          <CreateVatRateDialog />
        </div>
      </div>

      {/* Tabella Aliquote */}
      <Suspense fallback={<VatRatesTableSkeleton />}>
        <VatRatesTable />
      </Suspense>
    </div>
  );
}

/**
 * Tabella aliquote con dati dal server
 */
async function VatRatesTable() {
  const result = await getVatRatesAction();

  if (!result.success) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-destructive">Errore: {result.error}</p>
      </div>
    );
  }

  const vatRates = result.data;

  if (vatRates.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Nessuna aliquota IVA configurata</p>
          <p className="text-sm text-muted-foreground mt-2">
            Crea la tua prima aliquota o carica quelle standard italiane
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aliquote Configurate</CardTitle>
        <CardDescription>
          {vatRates.length} aliquota{vatRates.length !== 1 ? 'e' : ''} configurata{vatRates.length !== 1 ? 'e' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Valore</TableHead>
                <TableHead>Natura</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vatRates.map((rate) => (
                <VatRateRow key={rate.id} rate={rate} />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Riga singola della tabella
 */
function VatRateRow({ rate }: { rate: {
  id: string;
  name: string;
  value: string;
  nature: string | null;
  description: string | null;
  active: boolean;
  isDefault: boolean;
} }) {
  // Converte "0.2200" in "22%" per visualizzazione
  const percentage = (parseFloat(rate.value) * 100).toFixed(2);

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {rate.name}
          {rate.isDefault && (
            <Badge variant="default" className="text-xs">Default</Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <span className="font-mono">{percentage}%</span>
      </TableCell>
      <TableCell>
        {rate.nature ? (
          <Badge variant="outline">{rate.nature}</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {rate.description || '-'}
        </span>
      </TableCell>
      <TableCell>
        <Badge variant={rate.active ? 'default' : 'secondary'}>
          {rate.active ? 'Attiva' : 'Disattiva'}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <EditVatRateDialog rate={rate} />
      </TableCell>
    </TableRow>
  );
}

/**
 * Skeleton per caricamento tabella
 */
function VatRatesTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Aliquote Configurate</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Valore</TableHead>
                <TableHead>Natura</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-12 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-40 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="h-8 w-8 bg-muted animate-pulse rounded ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
