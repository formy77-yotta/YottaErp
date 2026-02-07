/**
 * Pagina gestione Documenti
 *
 * DataTable con ricerca e ordinamento server-side; parametri nell'URL
 * (page, perPage, sort, q). MULTITENANT: documenti filtrati per organizationId.
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { getDocumentsAction } from '@/services/actions/document-actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileText, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { parseSearchParams } from '@/lib/validations/search-params';
import { DocumentsDataTableHeader } from '@/components/features/documents/DocumentsDataTableHeader';
import { DocumentsTableBody } from '@/components/features/documents/DocumentsTableBody';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParamsRaw = await searchParams;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documenti</h1>
          <p className="text-muted-foreground mt-1">
            Gestisci preventivi, ordini, DDT, fatture e note credito
          </p>
        </div>
        <Link href="/documents/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Documento
          </Button>
        </Link>
      </div>

      <Suspense fallback={<DocumentsTableSkeleton />}>
        <DocumentsTable searchParamsRaw={searchParamsRaw} />
      </Suspense>
    </div>
  );
}

async function DocumentsTable({
  searchParamsRaw,
}: {
  searchParamsRaw: Record<string, string | string[] | undefined>;
}) {
  const result = await getDocumentsAction(undefined, searchParamsRaw);

  if (!result.success) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-destructive">Errore: {result.error}</p>
      </div>
    );
  }

  const { data: documents, count } = result.data;
  const searchParams = parseSearchParams(searchParamsRaw);
  const { page, perPage } = searchParams;
  const totalPages = Math.max(1, Math.ceil(count / perPage));
  const isEmpty = documents.length === 0;

  const baseQuery = new URLSearchParams();
  if (searchParams.q) baseQuery.set('q', searchParams.q);
  if (searchParams.sort) baseQuery.set('sort', searchParams.sort);
  baseQuery.set('perPage', String(perPage));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <DocumentsDataTableHeader />
          {isEmpty ? (
            <TableBody>
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nessun documento presente</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {searchParams.q
                      ? 'Prova a modificare o cancellare la ricerca per vedere tutti i risultati.'
                      : 'Crea il tuo primo documento utilizzando il pulsante "Nuovo Documento".'}
                  </p>
                </TableCell>
              </TableRow>
            </TableBody>
          ) : (
            <DocumentsTableBody documents={documents} />
          )}
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Pagina {page} di {totalPages} · {count} documenti in totale
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
  const href = `/documents?${q.toString()}`;
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

function DocumentsTableSkeleton() {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Numero</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Cliente/Fornitore</TableHead>
            <TableHead className="text-right">Imponibile</TableHead>
            <TableHead className="text-right">IVA</TableHead>
            <TableHead className="text-right">Totale</TableHead>
            <TableHead className="text-right" />
            <TableHead className="text-right">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3, 4, 5].map((i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell>
                <div className="h-5 w-24 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell className="text-right">
                <div className="h-4 w-20 bg-muted animate-pulse rounded ml-auto" />
              </TableCell>
              <TableCell className="text-right">
                <div className="h-4 w-16 bg-muted animate-pulse rounded ml-auto" />
              </TableCell>
              <TableCell className="text-right">
                <div className="h-4 w-24 bg-muted animate-pulse rounded ml-auto" />
              </TableCell>
              <TableCell className="text-right">
                <div className="h-8 w-24 bg-muted animate-pulse rounded ml-auto" />
              </TableCell>
              <TableCell className="text-right">
                <div className="h-8 w-16 bg-muted animate-pulse rounded ml-auto" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
