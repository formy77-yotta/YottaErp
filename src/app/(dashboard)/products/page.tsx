/**
 * Pagina gestione Anagrafica Prodotti
 *
 * DataTable con ricerca e ordinamento server-side; parametri nell'URL
 * (page, perPage, sort, q). MULTITENANT: prodotti filtrati per organizationId.
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { getProductsAction } from '@/services/actions/product-actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { CreateProductDialog } from '@/components/features/CreateProductDialog';
import { DeleteProductButton } from '@/components/features/DeleteProductButton';
import { RecalculateStatsButton } from '@/components/features/products/RecalculateStatsButton';
import { ProductStatsPopup } from '@/components/features/products/ProductStatsPopup';
import { Badge } from '@/components/ui/badge';
import { Package, ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import { formatCurrency } from '@/lib/decimal-utils';
import { Decimal } from 'decimal.js';
import { parseSearchParams } from '@/lib/validations/search-params';
import { ProductsDataTableHeader } from '@/components/features/products/ProductsDataTableHeader';
import type { ProductRow } from '@/services/actions/product-actions';

export const dynamic = 'force-dynamic';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParamsRaw = await searchParams;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Anagrafica Prodotti</h1>
          <p className="text-muted-foreground mt-1">
            Gestisci i prodotti e servizi della tua organizzazione
          </p>
        </div>
        <div className="flex items-center gap-4">
          <RecalculateStatsButton />
          <CreateProductDialog />
        </div>
      </div>

      <Suspense fallback={<ProductsTableSkeleton />}>
        <ProductsTable searchParamsRaw={searchParamsRaw} />
      </Suspense>
    </div>
  );
}

async function ProductsTable({
  searchParamsRaw,
}: {
  searchParamsRaw: Record<string, string | string[] | undefined>;
}) {
  const result = await getProductsAction(undefined, searchParamsRaw);

  if (!result.success) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-destructive">Errore: {result.error}</p>
      </div>
    );
  }

  const { data: products, count } = result.data;
  const searchParams = parseSearchParams(searchParamsRaw);
  const { page, perPage } = searchParams;
  const totalPages = Math.max(1, Math.ceil(count / perPage));
  const isEmpty = products.length === 0;

  const baseQuery = new URLSearchParams();
  if (searchParams.q) baseQuery.set('q', searchParams.q);
  if (searchParams.sort) baseQuery.set('sort', searchParams.sort);
  baseQuery.set('perPage', String(perPage));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <ProductsDataTableHeader />
          {isEmpty ? (
            <TableBody>
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nessun prodotto configurato</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {searchParams.q
                      ? 'Prova a modificare o cancellare la ricerca per vedere tutti i risultati.'
                      : 'Crea il tuo primo prodotto.'}
                  </p>
                </TableCell>
              </TableRow>
            </TableBody>
          ) : (
            <TableBody>
              {products.map((product) => (
                <ProductRow key={product.id} product={product} />
              ))}
            </TableBody>
          )}
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Pagina {page} di {totalPages} · {count} prodotti in totale
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

function ProductRow({ product }: { product: ProductRow }) {
  const priceDecimal = new Decimal(product.price);
  const vatPercent = product.vatRate
    ? (parseFloat(product.vatRate.value) * 100).toFixed(0)
    : null;

  return (
    <TableRow>
      <TableCell className="font-medium font-mono">{product.code}</TableCell>
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
          <Badge variant="outline">{product.category.code}</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
      <TableCell>
        {product.type ? (
          <Badge variant="outline">{product.type.code}</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
      <TableCell className="text-right font-mono text-sm tabular-nums">
        {product.stock != null && String(product.stock).trim() !== ''
          ? product.stock
          : '-'}
      </TableCell>
      <TableCell className="font-medium">
        {formatCurrency(priceDecimal)}
      </TableCell>
      <TableCell>
        {vatPercent ? (
          <Badge variant="outline">{vatPercent}%</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={product.active ? 'default' : 'secondary'}>
          {product.active ? 'Attivo' : 'Disattivo'}
        </Badge>
      </TableCell>
      <TableCell />
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <ProductStatsPopup
            productId={product.id}
            productCode={product.code}
            productName={product.name}
          />
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/products/${product.id}`} title="Apri scheda prodotto">
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
          <DeleteProductButton productId={product.id} />
        </div>
      </TableCell>
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
  const href = `/products?${q.toString()}`;
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

function ProductsTableSkeleton() {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Codice</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Tipologia</TableHead>
            <TableHead className="text-right">Giacenza</TableHead>
            <TableHead>Prezzo</TableHead>
            <TableHead>IVA</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead className="text-right" />
            <TableHead className="text-right">Azioni</TableHead>
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
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-12 bg-muted animate-pulse rounded ml-auto" />
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
              <TableCell />
              <TableCell className="text-right">
                <div className="h-8 w-16 bg-muted animate-pulse rounded ml-auto" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
