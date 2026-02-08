/**
 * Pagina scheda Prodotto
 *
 * Dati prodotto (form modifica) e statistiche valorizzazione.
 * MULTITENANT: Verifica che il prodotto appartenga all'organizzazione corrente.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getProductAction } from '@/services/actions/product-actions';
import { ProductPageContent } from '@/components/features/products/ProductPageContent';
import { Button } from '@/components/ui/button';

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;

  const result = await getProductAction(id);

  if (!result.success) {
    if (result.error.includes('non trovato') || result.error.includes('Accesso negato')) {
      notFound();
    }
    notFound();
  }

  const product = result.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">
            {product.name}
            <span className="ml-2 font-mono text-xl font-normal text-muted-foreground">
              ({product.code})
            </span>
          </h1>
          <p className="text-muted-foreground mt-1">Scheda prodotto</p>
        </div>
      </div>

      <ProductPageContent
        product={{
          id: product.id,
          code: product.code,
          name: product.name,
          description: product.description,
          categoryId: product.categoryId,
          typeId: product.typeId,
          price: product.price,
          vatRateId: product.vatRateId,
          defaultWarehouseId: product.defaultWarehouseId ?? null,
          active: product.active,
        }}
      />
    </div>
  );
}
