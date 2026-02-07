/**
 * Pagina gestione Categorie Articoli
 * 
 * Permette di visualizzare, creare e modificare le categorie articoli dell'organizzazione.
 * MULTITENANT: Tutte le categorie sono filtrate per organizationId
 */

import { Suspense } from 'react';
import { getProductCategoriesAction } from '@/services/actions/product-category-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreateProductCategoryDialog } from '@/components/features/CreateProductCategoryDialog';
import { EditProductCategoryDialog } from '@/components/features/EditProductCategoryDialog';
import { DeleteProductCategoryButton } from '@/components/features/DeleteProductCategoryButton';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';

// Forza rendering dinamico perché usa cookies per autenticazione
export const dynamic = 'force-dynamic';

/**
 * Componente principale della pagina
 */
export default function ProductCategoriesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categorie Articoli</h1>
          <p className="text-muted-foreground mt-1">
            Gestisci le categorie articoli della tua organizzazione
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CreateProductCategoryDialog />
        </div>
      </div>

      {/* Tabella Categorie */}
      <Suspense fallback={<ProductCategoriesTableSkeleton />}>
        <ProductCategoriesTable />
      </Suspense>
    </div>
  );
}

/**
 * Tabella categorie con dati dal server
 */
async function ProductCategoriesTable() {
  const result = await getProductCategoriesAction();

  if (!result.success) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-destructive">Errore: {result.error}</p>
      </div>
    );
  }

  const categories = result.data;

  if (categories.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nessuna categoria articolo configurata</p>
          <p className="text-sm text-muted-foreground mt-2">
            Crea la tua prima categoria articolo
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categorie Configurate</CardTitle>
        <CardDescription>
          {categories.length} categoria{categories.length !== 1 ? 'e' : ''} configurata{categories.length !== 1 ? 'e' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <ProductCategoryRow key={category.id} category={category} />
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
function ProductCategoryRow({ category }: { category: {
  id: string;
  code: string;
  description: string;
  active: boolean;
} }) {
  return (
    <TableRow>
      <TableCell className="font-medium font-mono">
        {category.code}
      </TableCell>
      <TableCell>
        {category.description}
      </TableCell>
      <TableCell>
        <Badge variant={category.active ? 'default' : 'secondary'}>
          {category.active ? 'Attiva' : 'Disattiva'}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <EditProductCategoryDialog category={category} />
          <DeleteProductCategoryButton categoryId={category.id} />
        </div>
      </TableCell>
    </TableRow>
  );
}

/**
 * Skeleton per caricamento tabella
 */
function ProductCategoriesTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Categorie Configurate</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Descrizione</TableHead>
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
