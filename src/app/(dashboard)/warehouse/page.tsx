/**
 * Pagina gestione Anagrafica Magazzini
 * 
 * Permette di visualizzare, creare e modificare i magazzini dell'organizzazione.
 * MULTITENANT: Tutti i magazzini sono filtrati per organizationId
 */

import { Suspense } from 'react';
import { getWarehousesAction } from '@/services/actions/warehouse-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Warehouse } from 'lucide-react';
import { CreateWarehouseDialog } from '@/components/features/CreateWarehouseDialog';
import { EditWarehouseDialog } from '@/components/features/EditWarehouseDialog';
import { DeleteWarehouseButton } from '@/components/features/DeleteWarehouseButton';

/**
 * Componente principale della pagina
 */
export default function WarehousePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Anagrafica Magazzini</h1>
          <p className="text-muted-foreground mt-1">
            Gestisci i magazzini della tua organizzazione
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CreateWarehouseDialog />
        </div>
      </div>

      {/* Tabella Magazzini */}
      <Suspense fallback={<WarehousesTableSkeleton />}>
        <WarehousesTable />
      </Suspense>
    </div>
  );
}

/**
 * Tabella magazzini con dati dal server
 */
async function WarehousesTable() {
  const result = await getWarehousesAction();

  if (!result.success) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-destructive">Errore: {result.error}</p>
        </CardContent>
      </Card>
    );
  }

  const warehouses = result.data;

  if (warehouses.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Warehouse className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nessun magazzino configurato</p>
          <p className="text-sm text-muted-foreground mt-2">
            Crea il tuo primo magazzino
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Magazzini Configurati</CardTitle>
        <CardDescription>
          {warehouses.length} magazzino{warehouses.length !== 1 ? 'i' : ''} configurato{warehouses.length !== 1 ? 'i' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Indirizzo</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouses.map((warehouse) => (
                <WarehouseRow key={warehouse.id} warehouse={warehouse} />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Riga singola della tabella
 */
function WarehouseRow({ warehouse }: { warehouse: {
  id: string;
  code: string;
  name: string;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
} }) {
  return (
    <TableRow>
      <TableCell className="font-medium font-mono">
        {warehouse.code}
      </TableCell>
      <TableCell>
        <div className="font-medium">{warehouse.name}</div>
      </TableCell>
      <TableCell>
        {warehouse.address ? (
          <span className="text-sm text-muted-foreground">{warehouse.address}</span>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <EditWarehouseDialog warehouse={warehouse} />
          <DeleteWarehouseButton warehouseId={warehouse.id} />
        </div>
      </TableCell>
    </TableRow>
  );
}

/**
 * Skeleton per caricamento tabella
 */
function WarehousesTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Magazzini Configurati</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Indirizzo</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map((i) => (
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
                  <TableCell className="text-right">
                    <div className="h-8 w-16 bg-muted animate-pulse rounded ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
