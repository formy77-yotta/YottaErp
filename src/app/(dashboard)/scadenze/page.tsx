/**
 * Pagina Scadenze
 *
 * DataTable con ricerca e ordinamento server-side; parametri nell'URL
 * (page, perPage, sort, q). MULTITENANT: filtra tramite document.organizationId
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { getPaymentDeadlinesPage } from '@/services/queries/payment-queries';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { CalendarClock, ChevronLeft, ChevronRight } from 'lucide-react';
import { parseSearchParams } from '@/lib/validations/search-params';
import { ScadenzeDataTableHeader } from '@/components/features/scadenze/ScadenzeDataTableHeader';
import { ScadenzeTableBodyWithSelection } from '@/components/features/scadenze/ScadenzeTableBodyWithSelection';

export const dynamic = 'force-dynamic';

export default async function ScadenzePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParamsRaw = await searchParams;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Scadenze</h1>
        <p className="text-muted-foreground mt-1">
          Visualizza le scadenze di pagamento generate dai documenti
        </p>
      </div>

      <Suspense fallback={<ScadenzeTableSkeleton />}>
        <ScadenzeTable searchParamsRaw={searchParamsRaw} />
      </Suspense>
    </div>
  );
}

async function ScadenzeTable({
  searchParamsRaw,
}: {
  searchParamsRaw: Record<string, string | string[] | undefined>;
}) {
  const { data: deadlines, count } = await getPaymentDeadlinesPage(undefined, searchParamsRaw);
  const searchParams = parseSearchParams(searchParamsRaw);
  const { page, perPage } = searchParams;
  const totalPages = Math.max(1, Math.ceil(count / perPage));
  const isEmpty = deadlines.length === 0;

  const baseQuery = new URLSearchParams();
  if (searchParams.q) baseQuery.set('q', searchParams.q);
  if (searchParams.sort) baseQuery.set('sort', searchParams.sort);
  baseQuery.set('perPage', String(perPage));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border overflow-x-auto">
        {isEmpty ? (
          <Table className="min-w-[900px]">
            <ScadenzeDataTableHeader />
            <TableBody>
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <CalendarClock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nessuna scadenza presente</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {searchParams.q
                      ? 'Prova a modificare o cancellare la ricerca per vedere tutti i risultati.'
                      : 'Le scadenze vengono create automaticamente quando assegni una condizione di pagamento a un documento.'}
                  </p>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <ScadenzeTableBodyWithSelection deadlines={deadlines} />
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Pagina {page} di {totalPages} · {count} scadenze in totale
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
  const href = `/scadenze?${q.toString()}`;
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

function ScadenzeTableSkeleton() {
  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow>
            <TableHead>Scadenza</TableHead>
            <TableHead>Documento</TableHead>
            <TableHead>Cliente / Fornitore</TableHead>
            <TableHead className="text-right">Importo</TableHead>
            <TableHead>Pagato</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead className="text-right" />
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
                <div className="h-8 w-full bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell>
                <div className="h-5 w-20 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell />
              <TableCell className="text-right">
                <div className="h-8 w-24 bg-muted animate-pulse rounded ml-auto" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
