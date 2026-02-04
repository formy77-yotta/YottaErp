/**
 * Pagina gestione Anagrafiche (Entities)
 * 
 * Mostra una DataTable con tutte le entità dell'organizzazione corrente
 * filtrate per tipo (CUSTOMER, SUPPLIER, LEAD) tramite query parameter.
 * MULTITENANT: Tutte le entità sono filtrate per organizationId
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
import { EntityTable } from '@/components/features/EntityTable';

/**
 * Props per la pagina entities
 */
interface EntitiesPageProps {
  searchParams: Promise<{ type?: string }>;
}

/**
 * Componente principale della pagina
 */
export default async function EntitiesPage({ searchParams }: EntitiesPageProps) {
  const params = await searchParams;
  const entityType = params.type as 'CUSTOMER' | 'SUPPLIER' | 'LEAD' | undefined;

  // Mappa tipo a label per il titolo
  const typeLabels: Record<string, string> = {
    CUSTOMER: 'Clienti',
    SUPPLIER: 'Fornitori',
    LEAD: 'Lead',
  };

  const pageTitle = entityType ? typeLabels[entityType] || 'Anagrafiche' : 'Anagrafiche';
  const pageDescription = entityType
    ? `Gestisci ${pageTitle.toLowerCase()} della tua organizzazione`
    : 'Gestisci clienti, fornitori e lead';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{pageTitle}</h1>
          <p className="text-muted-foreground mt-1">{pageDescription}</p>
        </div>
        <CreateEntityDialog defaultType={entityType} />
      </div>

      {/* Tabella Entità */}
      <Suspense fallback={<EntitiesTableSkeleton />}>
        <EntitiesTable entityType={entityType} />
      </Suspense>
    </div>
  );
}

/**
 * Tabella entità con dati dal server
 */
async function EntitiesTable({ entityType }: { entityType?: 'CUSTOMER' | 'SUPPLIER' | 'LEAD' }) {
  const result = await getEntitiesAction(entityType);

  if (!result.success) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-destructive">Errore: {result.error}</p>
      </div>
    );
  }

  const entities = result.data;

  if (entities.length === 0) {
    const typeLabel = entityType
      ? entityType === 'CUSTOMER'
        ? 'clienti'
        : entityType === 'SUPPLIER'
        ? 'fornitori'
        : 'lead'
      : 'anagrafiche';

    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">Nessun {typeLabel} trovato</p>
        <p className="text-sm text-muted-foreground mt-2">
          Crea la tua prima anagrafica utilizzando il pulsante "Nuova Anagrafica"
        </p>
      </div>
    );
  }

  return <EntityTable entities={entities} />;
}

/**
 * Skeleton per caricamento tabella
 */
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
