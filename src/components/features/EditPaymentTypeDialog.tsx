/**
 * Dialog per modificare un tipo di pagamento esistente
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
import { PaymentTypeForm } from './PaymentTypeForm';
import { Pencil } from 'lucide-react';

interface EditPaymentTypeDialogProps {
  type: {
    id: string;
    name: string;
    sdiCode: string;
    sepaCode: string | null;
    active: boolean;
  };
}

export function EditPaymentTypeDialog({ type }: EditPaymentTypeDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifica Tipo di Pagamento</DialogTitle>
          <DialogDescription>
            Modifica i dati del tipo di pagamento. Il codice SDI deve essere univoco.
          </DialogDescription>
        </DialogHeader>
        <PaymentTypeForm
          type={type}
          onSuccess={() => {
            setOpen(false);
          }}
          onError={(error) => {
            console.error('Errore modifica tipo di pagamento:', error);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
