'use client';

import { useRouter } from 'next/navigation';
import { ProductForm } from '@/components/features/ProductForm';
import { ProductStatsCard } from '@/components/features/products/ProductStatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ProductPageContentProps {
  product: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    categoryId: string | null;
    typeId: string | null;
    price: string;
    vatRateId: string | null;
    defaultWarehouseId?: string | null;
    active: boolean;
  };
}

export function ProductPageContent({ product }: ProductPageContentProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dati prodotto</CardTitle>
          <CardDescription>
            Modifica i dati del prodotto. Il codice non può essere modificato.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductForm
            product={product}
            onSuccess={() => router.refresh()}
            onError={(error) => {
              console.error('Errore aggiornamento prodotto:', error);
              alert(error);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statistiche valorizzazione</CardTitle>
          <CardDescription>
            Acquisti, vendite, CMP e ultimo costo per anno
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductStatsCard productId={product.id} />
        </CardContent>
      </Card>
    </div>
  );
}
