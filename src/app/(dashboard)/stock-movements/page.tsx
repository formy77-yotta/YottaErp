/**
 * Pagina gestione Movimenti Magazzino
 *
 * DataTable con ricerca e ordinamento server-side; parametri nell'URL
 * (page, perPage, sort, q). MULTITENANT: movimenti filtrati per organizationId.
 */

import { Suspense } from 'react';
import { getStockMovementsAction } from '@/services/actions/stock-movement-actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Activity, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Decimal } from 'decimal.js';
import { parseSearchParams } from '@/lib/validations/search-params';
import { StockMovementsDataTableHeader } from '@/components/features/stock-movements/StockMovementsDataTableHeader';
import type { StockMovementWithRelations } from '@/services/actions/stock-movement-actions';

export const dynamic = 'force-dynamic';

type MovementType = StockMovementWithRelations['type'];

function getMovementTypeLabel(type: MovementType): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
} {
  const labels: Record<
    MovementType,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    CARICO_INIZIALE: { label: 'Carico Iniziale', variant: 'default' },
    CARICO_FORNITORE: { label: 'Carico Fornitore', variant: 'default' },
    SCARICO_VENDITA: { label: 'Scarico Vendita', variant: 'destructive' },
    SCARICO_DDT: { label: 'Scarico DDT', variant: 'destructive' },
    RETTIFICA_INVENTARIO: { label: 'Rettifica Inventario', variant: 'secondary' },
    RESO_CLIENTE: { label: 'Reso Cliente', variant: 'default' },
    RESO_FORNITORE: { label: 'Reso Fornitore', variant: 'destructive' },
    TRASFERIMENTO_USCITA: { label: 'Trasferimento Uscita', variant: 'outline' },
    TRASFERIMENTO_ENTRATA: { label: 'Trasferimento Entrata', variant: 'outline' },
  };
  return labels[type];
}

function formatQuantity(quantity: string): { display: string; isPositive: boolean } {
  const qty = new Decimal(quantity);
  const isPositive = qty.greaterThanOrEqualTo(0);
  return {
    display: `${isPositive ? '+' : ''}${qty.toFixed(4)}`,
    isPositive,
  };
}

export default async function StockMovementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParamsRaw = await searchParams;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Movimenti Magazzino</h1>
        <p className="text-muted-foreground mt-1">
          Visualizza tutti i movimenti di magazzino e i documenti collegati
        </p>
      </div>

      <Suspense fallback={<StockMovementsTableSkeleton />}>
        <StockMovementsTable searchParamsRaw={searchParamsRaw} />
      </Suspense>
    </div>
  );
}

async function StockMovementsTable({
  searchParamsRaw,
}: {
  searchParamsRaw: Record<string, string | string[] | undefined>;
}) {
  const result = await getStockMovementsAction(undefined, searchParamsRaw);

  if (!result.success) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-destructive">Errore: {result.error}</p>
      </div>
    );
  }

  const { data: movements, count } = result.data;
  const searchParams = parseSearchParams(searchParamsRaw);
  const { page, perPage } = searchParams;
  const totalPages = Math.max(1, Math.ceil(count / perPage));
  const isEmpty = movements.length === 0;

  const baseQuery = new URLSearchParams();
  if (searchParams.q) baseQuery.set('q', searchParams.q);
  if (searchParams.sort) baseQuery.set('sort', searchParams.sort);
  baseQuery.set('perPage', String(perPage));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <StockMovementsDataTableHeader />
          {isEmpty ? (
            <TableBody>
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nessun movimento registrato</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {searchParams.q
                      ? 'Prova a modificare o cancellare la ricerca per vedere tutti i risultati.'
                      : 'I movimenti vengono creati automaticamente quando si generano documenti.'}
                  </p>
                </TableCell>
              </TableRow>
            </TableBody>
          ) : (
            <TableBody>
              {movements.map((movement) => (
                <StockMovementRow key={movement.id} movement={movement} />
              ))}
            </TableBody>
          )}
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Pagina {page} di {totalPages} · {count} movimenti in totale
          </p>
          <div className="flex gap-2">
            <PaginationLink
              disabled={page <= 1}
              page={page - 1}
              baseQuery={baseQuery}
              label="Precedente"
              icon={<ChevronLeft className="h-4 w-4" />}
            />
            <PaginationLink
              disabled={page >= totalPages}
              page={page + 1}
              baseQuery={baseQuery}
              label="Successiva"
              icon={<ChevronRight className="h-4 w-4" />}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StockMovementRow({ movement }: { movement: StockMovementWithRelations }) {
  const { display: quantityDisplay, isPositive } = formatQuantity(movement.quantity);
  const typeInfo = getMovementTypeLabel(movement.type);
  const date = new Date(movement.createdAt);
  const formattedDate = date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{formattedDate}</span>
          <span className="text-xs text-muted-foreground">{formattedTime}</span>
        </div>
      </TableCell>
      <TableCell>
        <div>
          <div className="font-medium font-mono text-sm">{movement.product.code}</div>
          <div className="text-sm text-muted-foreground">{movement.product.name}</div>
        </div>
      </TableCell>
      <TableCell>
        <div>
          <div className="font-medium font-mono text-sm">{movement.warehouse.code}</div>
          <div className="text-sm text-muted-foreground">{movement.warehouse.name}</div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {isPositive ? (
            <ArrowUp className="h-4 w-4 text-green-600" />
          ) : (
            <ArrowDown className="h-4 w-4 text-red-600" />
          )}
          <span
            className={`font-mono font-medium ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {quantityDisplay}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
      </TableCell>
      <TableCell>
        {movement.document ? (
          <div className="flex flex-col gap-1">
            <Link
              href={`/documents/${movement.documentId}`}
              className="text-sm font-medium hover:underline"
            >
              {movement.documentType?.code || 'DOC'} {movement.document.number}
            </Link>
            <span className="text-xs text-muted-foreground">
              {new Date(movement.document.date).toLocaleDateString('it-IT')}
            </span>
          </div>
        ) : movement.documentNumber ? (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              {movement.documentType?.code || 'DOC'} {movement.documentNumber}
            </span>
            <span className="text-xs text-muted-foreground">Documento eliminato</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
      <TableCell>
        {movement.notes ? (
          <span className="text-sm text-muted-foreground line-clamp-2">{movement.notes}</span>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
      <TableCell />
    </TableRow>
  );
}

function PaginationLink({
  page,
  baseQuery,
  label,
  icon,
  disabled,
}: {
  page: number;
  baseQuery: URLSearchParams;
  label: string;
  icon: React.ReactNode;
  disabled: boolean;
}) {
  const q = new URLSearchParams(baseQuery);
  q.set('page', String(page));
  const href = `/stock-movements?${q.toString()}`;
  if (disabled) {
    return (
      <Button variant="outline" size="sm" disabled>
        {icon}
        <span className="ml-1">{label}</span>
      </Button>
    );
  }
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href={href}>
        {icon}
        <span className="ml-1">{label}</span>
      </Link>
    </Button>
  );
}

function StockMovementsTableSkeleton() {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Prodotto</TableHead>
            <TableHead>Magazzino</TableHead>
            <TableHead>Quantità</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Documento</TableHead>
            <TableHead>Note</TableHead>
            <TableHead className="text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3, 4, 5].map((i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell>
                <div className="h-6 w-28 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
