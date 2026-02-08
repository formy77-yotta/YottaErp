/**
 * Dialog per modificare un prodotto esistente
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ProductForm } from './ProductForm';
import { ProductStatsCard } from './products/ProductStatsCard';
import { Edit } from 'lucide-react';

interface EditProductDialogProps {
  product: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    categoryId: string | null;
    typeId: string | null;
    price: string; // Decimal come stringa
    vatRateId: string | null;
    active: boolean;
  };
}

export function EditProductDialog({ product }: EditProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifica Prodotto</DialogTitle>
          <DialogDescription>
            Modifica i dati del prodotto. Il codice non può essere modificato.
          </DialogDescription>
        </DialogHeader>
        <ProductForm
          key={key}
          product={product}
          onSuccess={() => {
            setOpen(false);
            setKey((k) => k + 1); // Reset form
            // Ricarica la pagina per mostrare i nuovi dati
            window.location.reload();
          }}
          onError={(error) => {
            console.error('Errore aggiornamento prodotto:', error);
            // TODO: Mostrare toast di errore
            alert(error);
          }}
        />
        <div className="mt-6 border-t pt-6">
          <ProductStatsCard productId={product.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
