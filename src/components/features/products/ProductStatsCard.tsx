'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Decimal } from 'decimal.js';
import { getProductStats, type ProductStats } from '@/services/actions/stats-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/pdf/format-utils';

interface ProductStatsCardProps {
  productId: string;
}

const EMPTY_STATS: ProductStats = {
  productId: '',
  year: new Date().getFullYear(),
  purchasedQuantity: '0',
  purchasedTotalAmount: '0',
  soldQuantity: '0',
  soldTotalAmount: '0',
  weightedAverageCost: '0',
  lastCost: '0',
  currentStock: '0',
  quantityDecimals: 4,
};

function formatQuantity(value: string, decimals: number = 4): string {
  return new Decimal(value).toFixed(decimals);
}

function formatCurrencyWithDecimals(value: string, decimals: number): string {
  const decimal = new Decimal(value).toFixed(decimals);
  const [integer, fraction] = decimal.split('.');
  const integerFormatted = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `€ ${integerFormatted},${fraction}`;
}

export function ProductStatsCard({ productId }: ProductStatsCardProps) {
  const currentYear = new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: 6 }, (_, i) => currentYear - i),
    [currentYear]
  );
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [stats, setStats] = useState<ProductStats>({
    ...EMPTY_STATS,
    productId,
    year: currentYear,
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isActive = true;
    setError(null);
    startTransition(() => {
      getProductStats(productId, selectedYear)
        .then((result) => {
          if (!isActive) return;
          if (result.success) {
            setStats(result.data);
          } else {
            setError(result.error);
          }
        })
        .catch((err: unknown) => {
          if (!isActive) return;
          setError(err instanceof Error ? err.message : 'Errore sconosciuto');
        });
    });

    return () => {
      isActive = false;
    };
  }, [productId, selectedYear, startTransition]);

  const purchasedTotal = new Decimal(stats.purchasedTotalAmount || '0');
  const soldTotal = new Decimal(stats.soldTotalAmount || '0');
  const margin = soldTotal.minus(purchasedTotal);
  const weightedAverageCost = new Decimal(stats.weightedAverageCost || '0');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Statistiche e Valorizzazione</CardTitle>
        <div className="w-32">
          <Select
            value={String(selectedYear)}
            onValueChange={(value) => setSelectedYear(Number(value))}
          >
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
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Acquistato
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold whitespace-nowrap">
                  {formatCurrency(purchasedTotal.toString())}
                </div>
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                  Q.tà {formatQuantity(stats.purchasedQuantity, stats.quantityDecimals ?? 4)}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Venduto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold whitespace-nowrap">
                  {formatCurrency(soldTotal.toString())}
                </div>
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                  Q.tà {formatQuantity(stats.soldQuantity, stats.quantityDecimals ?? 4)}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Giacenza
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold whitespace-nowrap">
                  {formatQuantity(stats.currentStock ?? '0', stats.quantityDecimals ?? 4)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Da movimenti di magazzino
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Margine
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold whitespace-nowrap">
                  {formatCurrency(margin.toString())}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isPending ? 'Aggiornamento...' : 'Calcolato al volo'}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Costo Medio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold whitespace-nowrap">
                  {formatCurrencyWithDecimals(weightedAverageCost.toString(), 2)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
