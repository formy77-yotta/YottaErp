/**
 * Pagina gestione Anagrafica Prodotti
 * 
 * Permette di visualizzare, creare e modificare i prodotti dell'organizzazione.
 * MULTITENANT: Tutti i prodotti sono filtrati per organizationId
 */

import { Suspense } from 'react';
import { getProductsAction } from '@/services/actions/product-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreateProductDialog } from '@/components/features/CreateProductDialog';
import { EditProductDialog } from '@/components/features/EditProductDialog';
import { DeleteProductButton } from '@/components/features/DeleteProductButton';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
import { formatCurrency } from '@/lib/decimal-utils';
import { Decimal } from 'decimal.js';

/**
 * Componente principale della pagina
 */
export default function ProductsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Anagrafica Prodotti</h1>
          <p className="text-muted-foreground mt-1">
            Gestisci i prodotti e servizi della tua organizzazione
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CreateProductDialog />
        </div>
      </div>

      {/* Tabella Prodotti */}
      <Suspense fallback={<ProductsTableSkeleton />}>
        <ProductsTable />
      </Suspense>
    </div>
  );
}

/**
 * Tabella prodotti con dati dal server
 */
async function ProductsTable() {
  const result = await getProductsAction();

  if (!result.success) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-destructive">Errore: {result.error}</p>
      </div>
    );
  }

  const products = result.data;

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nessun prodotto configurato</p>
          <p className="text-sm text-muted-foreground mt-2">
            Crea il tuo primo prodotto
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prodotti Configurati</CardTitle>
        <CardDescription>
          {products.length} prodotto{products.length !== 1 ? 'i' : ''} configurato{products.length !== 1 ? 'i' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipologia</TableHead>
                <TableHead>Prezzo</TableHead>
                <TableHead>IVA</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <ProductRow key={product.id} product={product} />
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
function ProductRow({ product }: { product: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  category: { id: string; code: string; description: string } | null;
  typeId: string | null;
  type: { id: string; code: string; description: string; manageStock: boolean } | null;
  price: string; // Decimal come stringa
  vatRateId: string | null;
  vatRate: { id: string; name: string; value: string } | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
} }) {
  const priceDecimal = new Decimal(product.price);
  const vatPercent = product.vatRate 
    ? (parseFloat(product.vatRate.value) * 100).toFixed(0)
    : null;

  return (
    <TableRow>
      <TableCell className="font-medium font-mono">
        {product.code}
      </TableCell>
      <TableCell>
        <div>
          <div className="font-medium">{product.name}</div>
          {product.description && (
            <div className="text-sm text-muted-foreground line-clamp-1">
              {product.description}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        {product.category ? (
          <Badge variant="outline">
            {product.category.code}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
      <TableCell>
        {product.type ? (
          <div className="flex items-center gap-1">
            <Badge variant="outline">
              {product.type.code}
            </Badge>
            {product.type.manageStock && (
              <Badge variant="secondary" className="text-xs">
                Magazzino
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
      <TableCell className="font-medium">
        {formatCurrency(priceDecimal)}
      </TableCell>
      <TableCell>
        {vatPercent ? (
          <Badge variant="outline">
            {vatPercent}%
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={product.active ? 'default' : 'secondary'}>
          {product.active ? 'Attivo' : 'Disattivo'}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <EditProductDialog product={product} />
          <DeleteProductButton productId={product.id} />
        </div>
      </TableCell>
    </TableRow>
  );
}

/**
 * Skeleton per caricamento tabella
 */
function ProductsTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Prodotti Configurati</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipologia</TableHead>
                <TableHead>Prezzo</TableHead>
                <TableHead>IVA</TableHead>
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
                  <TableCell>
                    <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-12 bg-muted animate-pulse rounded" />
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
