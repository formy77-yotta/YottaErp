/**
 * Dialog per modificare una tipologia articolo esistente
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
import { Edit } from 'lucide-react';

interface EditProductTypeDialogProps {
  type: {
    id: string;
    code: string;
    description: string;
    manageStock: boolean;
    active: boolean;
  };
}

export function EditProductTypeDialog({ type }: EditProductTypeDialogProps) {
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
          <DialogTitle>Modifica Tipologia Articolo</DialogTitle>
          <DialogDescription>
            Modifica i dati della tipologia articolo. Il codice deve essere univoco per organizzazione.
          </DialogDescription>
        </DialogHeader>
        <ProductTypeForm
          key={key}
          type={type}
          onSuccess={() => {
            setOpen(false);
            setKey((k) => k + 1); // Reset form
          }}
          onError={(error) => {
            console.error('Errore aggiornamento tipologia:', error);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
