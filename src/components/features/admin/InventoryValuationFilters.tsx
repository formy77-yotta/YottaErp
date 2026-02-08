/**
 * Filtro anno per Valorizzazione Magazzino.
 * Aggiorna l'URL (year) tramite useSearchParams/usePathname/useRouter.
 */

'use client';

import { useMemo, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function InventoryValuationFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentYear = new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: 6 }, (_, i) => currentYear - i),
    [currentYear]
  );

  const yearParam = searchParams.get('year');
  const selectedYear = Number(yearParam) || currentYear;

  const onYearChange = (value: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('year', value);
    nextParams.set('page', '1');
    startTransition(() => {
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="w-32">
      <Select value={String(selectedYear)} onValueChange={onYearChange}>
        <SelectTrigger>
          <SelectValue placeholder="Anno" />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={String(year)}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
