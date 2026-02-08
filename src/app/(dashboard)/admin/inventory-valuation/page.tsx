/**
 * Pagina amministrazione Valorizzazione Magazzino
 *
 * DataTable con ricerca e ordinamento server-side; parametri nell'URL
 * (page, perPage, sort, q, year). MULTITENANT: dati filtrati per organizationId.
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { Decimal } from 'decimal.js';
import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAllProductsStats } from '@/services/actions/stats-actions';
import { parseSearchParams } from '@/lib/validations/search-params';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { InventoryValuationDataTableHeader } from '@/components/features/admin/InventoryValuationDataTableHeader';
import { InventoryValuationFilters } from '@/components/features/admin/InventoryValuationFilters';
import { formatCurrency } from '@/lib/pdf/format-utils';
import type { ProductStatsRow } from '@/services/actions/stats-actions';

export const dynamic = 'force-dynamic';

export default async function InventoryValuationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParamsRaw = await searchParams;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Valorizzazione Magazzino</h1>
          <p className="text-muted-foreground mt-1">
            Analizza vendite, acquisti e costo medio per anno
          </p>
        </div>
        <InventoryValuationFilters />
      </div>

      <Suspense fallback={<InventoryValuationTableSkeleton />}>
        <InventoryValuationTable searchParamsRaw={searchParamsRaw} />
      </Suspense>
    </div>
  );
}

function parseYear(
  searchParamsRaw: Record<string, string | string[] | undefined>
): number {
  const raw = Array.isArray(searchParamsRaw.year)
    ? searchParamsRaw.year[0]
    : searchParamsRaw.year;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isNaN(parsed) ? new Date().getFullYear() : parsed;
}

function formatQuantity(value: string): string {
  return new Decimal(value).toFixed(4);
}

function formatCurrencyWithDecimals(value: string, decimals: number): string {
  const decimal = new Decimal(value).toFixed(decimals);
  const [integer, fraction] = decimal.split('.');
  const integerFormatted = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `€ ${integerFormatted},${fraction}`;
}

async function InventoryValuationTable({
  searchParamsRaw,
}: {
  searchParamsRaw: Record<string, string | string[] | undefined>;
}) {
  const year = parseYear(searchParamsRaw);
  const result = await getAllProductsStats(year, searchParamsRaw);

  if (!result.success) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-destructive">Errore: {result.error}</p>
      </div>
    );
  }

  const { data: stats, count } = result.data;
  const searchParams = parseSearchParams(searchParamsRaw);
  const { page, perPage } = searchParams;
  const totalPages = Math.max(1, Math.ceil(count / perPage));
  const isEmpty = stats.length === 0;

  const baseQuery = new URLSearchParams();
  if (searchParams.q) baseQuery.set('q', searchParams.q);
  if (searchParams.sort) baseQuery.set('sort', searchParams.sort);
  baseQuery.set('perPage', String(perPage));
  baseQuery.set('year', String(year));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <InventoryValuationDataTableHeader />
          {isEmpty ? (
            <TableBody>
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Nessuna statistica disponibile per l'anno selezionato
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Le statistiche si popolano quando i documenti con valorizzazione vengono confermati.
                  </p>
                </TableCell>
              </TableRow>
            </TableBody>
          ) : (
            <TableBody>
              {stats.map((row) => (
                <InventoryValuationRow key={row.id} row={row} />
              ))}
            </TableBody>
          )}
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Pagina {page} di {totalPages} · {count} righe in totale
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

function InventoryValuationRow({ row }: { row: ProductStatsRow }) {
  return (
    <TableRow>
      <TableCell className="font-medium font-mono">{row.productCode}</TableCell>
      <TableCell>
        <div className="font-medium">{row.productName}</div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-mono">{formatQuantity(row.purchasedQuantity)}</span>
          <span className="text-sm text-muted-foreground">
            {formatCurrency(row.purchasedTotalAmount)}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-mono">{formatQuantity(row.soldQuantity)}</span>
          <span className="text-sm text-muted-foreground">
            {formatCurrency(row.soldTotalAmount)}
          </span>
        </div>
      </TableCell>
      <TableCell className="font-medium">
        {formatCurrencyWithDecimals(row.weightedAverageCost, 4)}
      </TableCell>
      <TableCell className="font-medium">
        {formatCurrencyWithDecimals(row.lastCost, 4)}
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
  const href = `/admin/inventory-valuation?${q.toString()}`;
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

function InventoryValuationTableSkeleton() {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Codice Articolo</TableHead>
            <TableHead>Descrizione</TableHead>
            <TableHead>Q.tà Acquistata | Valore Acquisto</TableHead>
            <TableHead>Q.tà Venduta | Valore Vendita</TableHead>
            <TableHead>Costo Medio (CMP)</TableHead>
            <TableHead>Ultimo Costo</TableHead>
            <TableHead className="text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3, 4, 5].map((i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-40 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-48 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-48 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
