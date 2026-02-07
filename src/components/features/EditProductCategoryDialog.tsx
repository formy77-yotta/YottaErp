/**
 * Dialog per modificare una categoria articolo esistente
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
import { ProductCategoryForm } from './ProductCategoryForm';
import { Edit } from 'lucide-react';

interface EditProductCategoryDialogProps {
  category: {
    id: string;
    code: string;
    description: string;
    manageStock: boolean;
    active: boolean;
  };
}

export function EditProductCategoryDialog({ category }: EditProductCategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modifica Categoria Articolo</DialogTitle>
          <DialogDescription>
            Modifica i dati della categoria articolo. Il codice deve essere univoco per organizzazione.
          </DialogDescription>
        </DialogHeader>
        <ProductCategoryForm
          key={key}
          category={category}
          onSuccess={() => {
            setOpen(false);
            setKey((k) => k + 1); // Reset form
          }}
          onError={(error) => {
            console.error('Errore aggiornamento categoria:', error);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
