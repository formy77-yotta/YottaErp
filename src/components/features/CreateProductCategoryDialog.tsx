/**
 * Dialog per creare una nuova categoria articolo
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
import { Plus } from 'lucide-react';

export function CreateProductCategoryDialog() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuova Categoria
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuova Categoria Articolo</DialogTitle>
          <DialogDescription>
            Inserisci i dati della categoria articolo. Il codice deve essere univoco per organizzazione.
          </DialogDescription>
        </DialogHeader>
        <ProductCategoryForm
          key={key}
          onSuccess={() => {
            setOpen(false);
            setKey((k) => k + 1); // Reset form
          }}
          onError={(error) => {
            console.error('Errore creazione categoria:', error);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
