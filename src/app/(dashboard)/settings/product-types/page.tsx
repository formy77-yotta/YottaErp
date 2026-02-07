/**
 * Pagina gestione Tipologie Articoli
 * 
 * Permette di visualizzare, creare e modificare le tipologie articoli dell'organizzazione.
 * MULTITENANT: Tutte le tipologie sono filtrate per organizationId
 */

import { Suspense } from 'react';
import { getProductTypesAction } from '@/services/actions/product-type-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreateProductTypeDialog } from '@/components/features/CreateProductTypeDialog';
import { EditProductTypeDialog } from '@/components/features/EditProductTypeDialog';
import { DeleteProductTypeButton } from '@/components/features/DeleteProductTypeButton';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';

/**
 * Componente principale della pagina
 */
export default function ProductTypesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tipologie Articoli</h1>
          <p className="text-muted-foreground mt-1">
            Gestisci le tipologie articoli della tua organizzazione
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CreateProductTypeDialog />
        </div>
      </div>

      {/* Tabella Tipologie */}
      <Suspense fallback={<ProductTypesTableSkeleton />}>
        <ProductTypesTable />
      </Suspense>
    </div>
  );
}

/**
 * Tabella tipologie con dati dal server
 */
async function ProductTypesTable() {
  const result = await getProductTypesAction();

  if (!result.success) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-destructive">Errore: {result.error}</p>
      </div>
    );
  }

  const types = result.data;

  if (types.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nessuna tipologia articolo configurata</p>
          <p className="text-sm text-muted-foreground mt-2">
            Crea la tua prima tipologia articolo
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tipologie Configurate</CardTitle>
        <CardDescription>
          {types.length} tipologia{types.length !== 1 ? 'e' : ''} configurata{types.length !== 1 ? 'e' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead>Gestione Magazzino</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((type) => (
                <ProductTypeRow key={type.id} type={type} />
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
function ProductTypeRow({ type }: { type: {
  id: string;
  code: string;
  description: string;
  manageStock: boolean;
  active: boolean;
} }) {
  return (
    <TableRow>
      <TableCell className="font-medium font-mono">
        {type.code}
      </TableCell>
      <TableCell>
        {type.description}
      </TableCell>
      <TableCell>
        <Badge variant={type.manageStock ? 'default' : 'secondary'}>
          {type.manageStock ? 'Sì' : 'No'}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={type.active ? 'default' : 'secondary'}>
          {type.active ? 'Attiva' : 'Disattiva'}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <EditProductTypeDialog type={type} />
          <DeleteProductTypeButton typeId={type.id} />
        </div>
      </TableCell>
    </TableRow>
  );
}

/**
 * Skeleton per caricamento tabella
 */
function ProductTypesTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tipologie Configurate</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead>Gestione Magazzino</TableHead>
                <TableHead>Stato</TableHead>
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
                    <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-16 bg-muted animate-pulse rounded" />
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
