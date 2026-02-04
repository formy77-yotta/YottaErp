/**
 * Dialog per creare una nuova aliquota IVA
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
import { VatRateForm } from './VatRateForm';
import { Plus } from 'lucide-react';

export function CreateVatRateDialog() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuova Aliquota
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuova Aliquota IVA</DialogTitle>
          <DialogDescription>
            Inserisci i dati dell'aliquota IVA. Il valore può essere inserito come percentuale (es. 22 per 22%).
          </DialogDescription>
        </DialogHeader>
        <VatRateForm
          key={key}
          onSuccess={() => {
            setOpen(false);
            setKey((k) => k + 1); // Reset form
          }}
          onError={(error) => {
            console.error('Errore creazione aliquota:', error);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
