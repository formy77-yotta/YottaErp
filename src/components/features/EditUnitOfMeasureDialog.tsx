/**
 * Dialog per modificare un'unità di misura esistente
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
import { Edit } from 'lucide-react';

interface EditUnitOfMeasureDialogProps {
  unit: {
    id: string;
    code: string;
    name: string;
    measureClass: string;
    baseFactor: string;
    active: boolean;
  };
}

export function EditUnitOfMeasureDialog({ unit }: EditUnitOfMeasureDialogProps) {
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
          <DialogTitle>Modifica Unità di Misura</DialogTitle>
          <DialogDescription>
            Modifica i dati dell'unità di misura. Il codice deve essere univoco per organizzazione.
          </DialogDescription>
        </DialogHeader>
        <UnitOfMeasureForm
          key={key}
          unit={unit}
          onSuccess={() => {
            setOpen(false);
            setKey((k) => k + 1); // Reset form
          }}
          onError={(error) => {
            console.error('Errore aggiornamento unità di misura:', error);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
