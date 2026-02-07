/**
 * Pagina gestione Movimenti Magazzino
 * 
 * Permette di visualizzare tutti i movimenti di magazzino dell'organizzazione
 * con i relativi documenti collegati.
 * MULTITENANT: Tutti i movimenti sono filtrati per organizationId
 */

import { Suspense } from 'react';
import { getStockMovementsAction } from '@/services/actions/stock-movement-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Activity, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { Decimal } from 'decimal.js';
import type { MovementType } from '@prisma/client';

/**
 * Mappa MovementType a label italiano e colore
 */
function getMovementTypeLabel(type: MovementType): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  const labels: Record<MovementType, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    CARICO_INIZIALE: { label: 'Carico Iniziale', variant: 'default' },
    CARICO_FORNITORE: { label: 'Carico Fornitore', variant: 'default' },
    SCARICO_VENDITA: { label: 'Scarico Vendita', variant: 'destructive' },
    SCARICO_DDT: { label: 'Scarico DDT', variant: 'destructive' },
    RETTIFICA_INVENTARIO: { label: 'Rettifica Inventario', variant: 'secondary' },
    RESO_CLIENTE: { label: 'Reso Cliente', variant: 'default' },
    RESO_FORNITORE: { label: 'Reso Fornitore', variant: 'destructive' },
    TRASFERIMENTO_USCITA: { label: 'Trasferimento Uscita', variant: 'outline' },
    TRASFERIMENTO_ENTRATA: { label: 'Trasferimento Entrata', variant: 'outline' },
  };
  return labels[type];
}

/**
 * Formatta la quantità con segno e colore
 */
function formatQuantity(quantity: string): { display: string; isPositive: boolean } {
  const qty = new Decimal(quantity);
  const isPositive = qty.greaterThanOrEqualTo(0);
  return {
    display: `${isPositive ? '+' : ''}${qty.toFixed(4)}`,
    isPositive,
  };
}

/**
 * Componente principale della pagina
 */
export default function StockMovementsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Movimenti Magazzino</h1>
        <p className="text-muted-foreground mt-1">
          Visualizza tutti i movimenti di magazzino e i documenti collegati
        </p>
      </div>

      {/* Tabella Movimenti */}
      <Suspense fallback={<StockMovementsTableSkeleton />}>
        <StockMovementsTable />
      </Suspense>
    </div>
  );
}

/**
 * Tabella movimenti con dati dal server
 */
async function StockMovementsTable() {
  const result = await getStockMovementsAction();

  if (!result.success) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-destructive">Errore: {result.error}</p>
        </CardContent>
      </Card>
    );
  }

  const movements = result.data;

  if (movements.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nessun movimento registrato</p>
          <p className="text-sm text-muted-foreground mt-2">
            I movimenti vengono creati automaticamente quando si generano documenti
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Movimenti Magazzino</CardTitle>
        <CardDescription>
          {movements.length} movimento{movements.length !== 1 ? 'i' : ''} registrato{movements.length !== 1 ? 'i' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Prodotto</TableHead>
                <TableHead>Magazzino</TableHead>
                <TableHead>Quantità</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((movement) => (
                <StockMovementRow key={movement.id} movement={movement} />
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
function StockMovementRow({ movement }: { movement: {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: string;
  type: MovementType;
  documentTypeId: string | null;
  documentId: string | null;
  documentNumber: string | null;
  notes: string | null;
  userId: string | null;
  createdAt: Date;
  product: { id: string; code: string; name: string };
  warehouse: { id: string; code: string; name: string };
  documentType: { id: string; code: string; description: string } | null;
  document: { id: string; number: string; date: Date; category: string } | null;
} }) {
  const { display: quantityDisplay, isPositive } = formatQuantity(movement.quantity);
  const typeInfo = getMovementTypeLabel(movement.type);
  const date = new Date(movement.createdAt);
  const formattedDate = date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{formattedDate}</span>
          <span className="text-xs text-muted-foreground">{formattedTime}</span>
        </div>
      </TableCell>
      <TableCell>
        <div>
          <div className="font-medium font-mono text-sm">{movement.product.code}</div>
          <div className="text-sm text-muted-foreground">{movement.product.name}</div>
        </div>
      </TableCell>
      <TableCell>
        <div>
          <div className="font-medium font-mono text-sm">{movement.warehouse.code}</div>
          <div className="text-sm text-muted-foreground">{movement.warehouse.name}</div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {isPositive ? (
            <ArrowUp className="h-4 w-4 text-green-600" />
          ) : (
            <ArrowDown className="h-4 w-4 text-red-600" />
          )}
          <span
            className={`font-mono font-medium ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {quantityDisplay}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={typeInfo.variant}>
          {typeInfo.label}
        </Badge>
      </TableCell>
      <TableCell>
        {movement.document ? (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              {movement.documentType?.code || 'DOC'} {movement.document.number}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(movement.document.date).toLocaleDateString('it-IT')}
            </span>
          </div>
        ) : movement.documentNumber ? (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              {movement.documentType?.code || 'DOC'} {movement.documentNumber}
            </span>
            <span className="text-xs text-muted-foreground">Documento eliminato</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
      <TableCell>
        {movement.notes ? (
          <span className="text-sm text-muted-foreground line-clamp-2">
            {movement.notes}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
    </TableRow>
  );
}

/**
 * Skeleton per caricamento tabella
 */
function StockMovementsTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Movimenti Magazzino</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Prodotto</TableHead>
                <TableHead>Magazzino</TableHead>
                <TableHead>Quantità</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-6 w-28 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
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
