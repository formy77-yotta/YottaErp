/**
 * Dialog per creare un nuovo tipo di pagamento
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
import { Plus } from 'lucide-react';

export function CreatePaymentTypeDialog() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuovo Tipo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuovo Tipo di Pagamento</DialogTitle>
          <DialogDescription>
            Crea un nuovo tipo di pagamento conforme SDI (codice MP01-MP23) e opzionalmente SEPA.
          </DialogDescription>
        </DialogHeader>
        <PaymentTypeForm
          key={key}
          onSuccess={() => {
            setOpen(false);
            setKey((k) => k + 1); // Reset form
          }}
          onError={(error) => {
            console.error('Errore creazione tipo di pagamento:', error);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
