/**
 * Dialog per creare una nuova tipologia articolo
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
import { ProductTypeForm } from './ProductTypeForm';
import { Plus } from 'lucide-react';

export function CreateProductTypeDialog() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuova Tipologia
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuova Tipologia Articolo</DialogTitle>
          <DialogDescription>
            Inserisci i dati della tipologia articolo. Il codice deve essere univoco per organizzazione.
          </DialogDescription>
        </DialogHeader>
        <ProductTypeForm
          key={key}
          onSuccess={() => {
            setOpen(false);
            setKey((k) => k + 1); // Reset form
          }}
          onError={(error) => {
            console.error('Errore creazione tipologia:', error);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
