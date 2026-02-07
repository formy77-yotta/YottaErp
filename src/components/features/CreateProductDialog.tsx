/**
 * Dialog per creare un nuovo prodotto
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
import { Plus } from 'lucide-react';

export function CreateProductDialog() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuovo Prodotto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuovo Prodotto</DialogTitle>
          <DialogDescription>
            Inserisci i dati del prodotto. Il codice deve essere univoco per organizzazione.
          </DialogDescription>
        </DialogHeader>
        <ProductForm
          key={key}
          onSuccess={() => {
            setOpen(false);
            setKey((k) => k + 1); // Reset form
            // Ricarica la pagina per mostrare i nuovi dati
            window.location.reload();
          }}
          onError={(error) => {
            console.error('Errore creazione prodotto:', error);
            // TODO: Mostrare toast di errore
            alert(error);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
