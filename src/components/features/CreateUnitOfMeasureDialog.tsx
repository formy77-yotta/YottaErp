/**
 * Dialog per creare una nuova unità di misura
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
import { UnitOfMeasureForm } from './UnitOfMeasureForm';
import { Plus } from 'lucide-react';

export function CreateUnitOfMeasureDialog() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuova Unità di Misura
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuova Unità di Misura</DialogTitle>
          <DialogDescription>
            Inserisci i dati dell'unità di misura. Il codice deve essere univoco per organizzazione.
          </DialogDescription>
        </DialogHeader>
        <UnitOfMeasureForm
          key={key}
          onSuccess={() => {
            setOpen(false);
            setKey((k) => k + 1); // Reset form
          }}
          onError={(error) => {
            console.error('Errore creazione unità di misura:', error);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
