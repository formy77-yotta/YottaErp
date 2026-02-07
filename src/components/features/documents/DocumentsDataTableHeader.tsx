/**
 * Intestazione DataTable Documenti: colonne ordinabili e ricerca con debounce.
 * Aggiorna l'URL (sort, q) tramite useSearchParams/usePathname/useRouter.
 */

'use client';

import { useCallback, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  TableHead,
  TableRow,
  TableHeader,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { DataTableSearchInput } from '@/components/ui/data-table-search-input';

const DEBOUNCE_MS = 500;

/** Colonne ordinabili: label -> campo per sort (backend) */
const SORTABLE_COLUMNS: { label: string; field: string }[] = [
  { label: 'Numero', field: 'number' },
  { label: 'Data', field: 'date' },
  { label: 'Tipo', field: 'documentTypeDescription' },
  { label: 'Cliente/Fornitore', field: 'customerNameSnapshot' },
  { label: 'Imponibile', field: 'netTotal' },
  { label: 'IVA', field: 'vatTotal' },
  { label: 'Totale', field: 'grossTotal' },
];

function parseSort(sortParam: string | null): { field: string; order: 'asc' | 'desc' } | null {
  if (!sortParam?.trim()) return null;
  const [field, order] = sortParam.split('.');
  if (order === 'asc' || order === 'desc') return { field, order };
  return null;
}

export function DocumentsDataTableHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const sortParam = searchParams.get('sort') ?? undefined;
  const qParam = searchParams.get('q') ?? '';

  const updateSearchUrl = useCallback(
    (debouncedValue: string) => {
      const next = debouncedValue.trim() || undefined;
      const nextParams = new URLSearchParams(searchParams.toString());
      if (next) nextParams.set('q', next);
      else nextParams.delete('q');
      nextParams.set('page', '1');
      startTransition(() => {
        router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams]
  );

  const updateSort = useCallback(
    (field: string) => {
      const current = parseSort(sortParam ?? null);
      const nextOrder =
        current?.field === field && current?.order === 'asc' ? 'desc' : 'asc';
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set('sort', `${field}.${nextOrder}`);
      nextParams.set('page', '1');
      startTransition(() => {
        router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams, sortParam]
  );

  const currentSort = parseSort(sortParam ?? null);

  return (
    <TableHeader>
      <TableRow>
        {SORTABLE_COLUMNS.map(({ label, field }) => {
          const isSorted = currentSort?.field === field;
          return (
            <TableHead key={field}>
              <Button
                variant="ghost"
                size="sm"
                className={field === 'netTotal' || field === 'vatTotal' || field === 'grossTotal' ? '-ml-3 h-8 font-medium justify-end' : '-ml-3 h-8 font-medium'}
                onClick={() => updateSort(field)}
              >
                {label}
                {isSorted ? (
                  currentSort.order === 'asc' ? (
                    <ArrowUp className="ml-2 h-4 w-4" />
                  ) : (
                    <ArrowDown className="ml-2 h-4 w-4" />
                  )
                ) : (
                  <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                )}
              </Button>
            </TableHead>
          );
        })}
        <TableHead className="text-right">
          <div className="flex items-center justify-end gap-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <DataTableSearchInput
              value={qParam}
              onDebouncedChange={updateSearchUrl}
              debounceMs={DEBOUNCE_MS}
              placeholder="Cerca..."
            />
          </div>
        </TableHead>
        <TableHead className="text-right w-[120px]">Azioni</TableHead>
      </TableRow>
    </TableHeader>
  );
}
