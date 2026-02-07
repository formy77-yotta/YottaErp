/**
 * Pagina gestione Anagrafiche (Entities)
 *
 * DataTable con ricerca e ordinamento server-side; parametri letti dall'URL
 * (page, perPage, sort, q) e tipo (type) per filtrare CUSTOMER/SUPPLIER/LEAD.
 * MULTITENANT: entità filtrate per organizationId.
 */

import { Suspense } from 'react';
import { getEntitiesAction } from '@/services/actions/entity-actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreateEntityDialog } from '@/components/features/CreateEntityDialog';
import { EntitiesDataTableHeader } from '@/components/features/entities/EntitiesDataTableHeader';
import { EntityTable } from '@/components/features/EntityTable';
import { parseSearchParams } from '@/lib/validations/search-params';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface EntitiesPageProps {
  searchParams: Promise<{ type?: string; page?: string; perPage?: string; sort?: string; q?: string }>;
}

const typeLabels: Record<string, string> = {
  CUSTOMER: 'Clienti',
  SUPPLIER: 'Fornitori',
  LEAD: 'Lead',
};

export default async function EntitiesPage({ searchParams }: EntitiesPageProps) {
  const params = await searchParams;
  const entityType = params.type as 'CUSTOMER' | 'SUPPLIER' | 'LEAD' | undefined;

  const pageTitle = entityType ? typeLabels[entityType] ?? 'Anagrafiche' : 'Anagrafiche';
  const pageDescription = entityType
    ? `Gestisci ${pageTitle.toLowerCase()} della tua organizzazione`
    : 'Gestisci clienti, fornitori e lead';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{pageTitle}</h1>
          <p className="text-muted-foreground mt-1">{pageDescription}</p>
        </div>
        <CreateEntityDialog defaultType={entityType} />
      </div>

      <Suspense fallback={<EntitiesTableSkeleton />}>
        <EntitiesTable entityType={entityType} searchParamsRaw={params} />
      </Suspense>
    </div>
  );
}

interface EntitiesTableProps {
  entityType?: 'CUSTOMER' | 'SUPPLIER' | 'LEAD';
  searchParamsRaw: Record<string, string | string[] | undefined>;
}

async function EntitiesTable({ entityType, searchParamsRaw }: EntitiesTableProps) {
  const result = await getEntitiesAction(entityType, searchParamsRaw);

  if (!result.success) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-destructive">Errore: {result.error}</p>
      </div>
    );
  }

  const { data: entities, count } = result.data;
  const searchParams = parseSearchParams(searchParamsRaw);
  const { page, perPage } = searchParams;
  const totalPages = Math.max(1, Math.ceil(count / perPage));
  const typeLabel =
    entityType === 'CUSTOMER' ? 'clienti' : entityType === 'SUPPLIER' ? 'fornitori' : entityType === 'LEAD' ? 'lead' : 'anagrafiche';
  const isEmpty = entities.length === 0;

  const baseQuery = new URLSearchParams();
  if (entityType) baseQuery.set('type', entityType);
  if (searchParams.q) baseQuery.set('q', searchParams.q);
  if (searchParams.sort) baseQuery.set('sort', searchParams.sort);
  baseQuery.set('perPage', String(perPage));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <EntitiesDataTableHeader />
          {isEmpty ? (
            <TableBody>
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <p className="text-muted-foreground">Nessun {typeLabel} trovato</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {searchParams.q
                      ? 'Prova a modificare o cancellare la ricerca per vedere tutti i risultati.'
                      : 'Crea la tua prima anagrafica utilizzando il pulsante "Nuova Anagrafica".'}
                  </p>
                </TableCell>
              </TableRow>
            </TableBody>
          ) : (
            <EntityTable entities={entities} />
          )}
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Pagina {page} di {totalPages} · {count} {typeLabel} in totale
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
  const href = `/entities?${q.toString()}`;
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

function EntitiesTableSkeleton() {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Ragione Sociale</TableHead>
            <TableHead>P.IVA / CF</TableHead>
            <TableHead>Indirizzo</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead className="text-right">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3].map((i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-40 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
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
  );
}
