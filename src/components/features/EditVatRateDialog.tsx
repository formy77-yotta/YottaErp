/**
 * Dialog per modificare un'aliquota IVA esistente
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
import { Edit } from 'lucide-react';

interface EditVatRateDialogProps {
  rate: {
    id: string;
    name: string;
    value: string;
    nature: string | null;
    description: string | null;
    active: boolean;
    isDefault: boolean;
  };
}

export function EditVatRateDialog({ rate }: EditVatRateDialogProps) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifica Aliquota IVA</DialogTitle>
          <DialogDescription>
            Modifica i dati dell'aliquota IVA. Il valore può essere inserito come percentuale (es. 22 per 22%).
          </DialogDescription>
        </DialogHeader>
        <VatRateForm
          key={key}
          rate={rate}
          onSuccess={() => {
            setOpen(false);
            setKey((k) => k + 1); // Reset form
          }}
          onError={(error) => {
            console.error('Errore aggiornamento aliquota:', error);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
