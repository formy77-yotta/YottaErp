/**
 * Pagina Scadenze
 *
 * Elenca le scadenze di pagamento (PaymentDeadline) dell'organizzazione.
 * MULTITENANT: Filtro tramite document.organizationId
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { getPaymentDeadlines } from '@/services/queries/payment-queries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/decimal-utils';
import { Decimal } from 'decimal.js';

export const dynamic = 'force-dynamic';

const CATEGORY_LABELS: Record<string, string> = {
  QUOTE: 'Preventivo',
  ORDER: 'Ordine',
  DELIVERY_NOTE: 'DDT',
  INVOICE: 'Fattura',
  CREDIT_NOTE: 'Nota credito',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Da pagare',
  PAID: 'Pagata',
  PARTIAL: 'Parziale',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  PENDING: 'outline',
  PAID: 'default',
  PARTIAL: 'secondary',
};

export default function ScadenzePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Scadenze</h1>
        <p className="text-muted-foreground mt-1">
          Visualizza le scadenze di pagamento generate dai documenti
        </p>
      </div>

      <Suspense fallback={<ScadenzeTableSkeleton />}>
        <ScadenzeTable />
      </Suspense>
    </div>
  );
}

async function ScadenzeTable() {
  const deadlines = await getPaymentDeadlines();

  if (deadlines.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CalendarClock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nessuna scadenza presente</p>
          <p className="text-sm text-muted-foreground mt-2">
            Le scadenze vengono create automaticamente quando assegni una condizione di pagamento a un documento
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scadenze di pagamento</CardTitle>
        <CardDescription>
          {deadlines.length} scadenza{deadlines.length !== 1 ? 'e' : ''} in elenco
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scadenza</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Cliente / Fornitore</TableHead>
                <TableHead className="text-right">Importo</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deadlines.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">
                    {new Date(d.dueDate).toLocaleDateString('it-IT', {
                      weekday: 'short',
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-sm">{d.document.number}</span>
                      <Badge variant="outline" className="w-fit text-xs">
                        {CATEGORY_LABELS[d.document.category] ?? d.document.category}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {d.document.customerNameSnapshot || '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(new Decimal(d.amount))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[d.status] ?? 'outline'}>
                      {STATUS_LABELS[d.status] ?? d.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/documents/${d.documentId}`}>
                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4 mr-1" />
                        Documento
                      </Button>
                    </Link>
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

function ScadenzeTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Scadenze di pagamento</CardTitle>
        <CardDescription>Caricamento...</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scadenza</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Cliente / Fornitore</TableHead>
                <TableHead className="text-right">Importo</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="h-4 w-28 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-40 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="h-4 w-20 bg-muted animate-pulse rounded ml-auto" />
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-20 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="h-8 w-24 bg-muted animate-pulse rounded ml-auto" />
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
