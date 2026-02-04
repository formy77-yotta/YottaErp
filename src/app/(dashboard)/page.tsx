/**
 * Dashboard principale
 * 
 * Mostra una vista di riepilogo con KPI veloci per l'organizzazione corrente.
 * MULTITENANT: Tutte le statistiche sono filtrate per organizationId
 */

import { Suspense } from 'react';
import { getDashboardStats } from '@/services/actions/dashboard-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  FileText,
  Package,
  Warehouse,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * Componente principale Dashboard
 */
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Panoramica generale della tua organizzazione
        </p>
      </div>

      {/* KPI Cards */}
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardStats />
      </Suspense>
    </div>
  );
}

/**
 * Componente che mostra le statistiche
 */
async function DashboardStats() {
  const result = await getDashboardStats();

  if (!result.success) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-destructive">Errore: {result.error}</p>
      </div>
    );
  }

  const stats = result.data;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Anagrafiche */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Anagrafiche</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.entities.total}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.entities.customers} clienti • {stats.entities.suppliers} fornitori
          </p>
          <Link href="/entities">
            <Button variant="link" className="p-0 h-auto mt-2 text-xs">
              Vedi tutte →
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Documenti */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Documenti</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.documents.total}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.documents.invoices} fatture • {stats.documents.quotes} preventivi
          </p>
          <Link href="/documents">
            <Button variant="link" className="p-0 h-auto mt-2 text-xs">
              Vedi tutti →
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Prodotti */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Prodotti</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.products.total}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.products.active} attivi
          </p>
          <Link href="/products">
            <Button variant="link" className="p-0 h-auto mt-2 text-xs">
              Vedi tutti →
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Magazzini */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Magazzini</CardTitle>
          <Warehouse className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.warehouses.total}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Magazzini configurati
          </p>
          <Link href="/warehouse">
            <Button variant="link" className="p-0 h-auto mt-2 text-xs">
              Vedi tutti →
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Skeleton per caricamento dashboard
 */
function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-20 bg-muted animate-pulse rounded" />
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
            <div className="h-3 w-32 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
