/**
 * Dialog per creare una nuova condizione di pagamento
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
import { PaymentConditionForm } from './PaymentConditionForm';
import { Plus } from 'lucide-react';

export function CreatePaymentConditionDialog() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuova Condizione
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuova Condizione di Pagamento</DialogTitle>
          <DialogDescription>
            Crea una nuova condizione di pagamento per calcolare automaticamente le scadenze.
          </DialogDescription>
        </DialogHeader>
        <PaymentConditionForm
          key={key}
          onSuccess={() => {
            setOpen(false);
            setKey((k) => k + 1); // Reset form
          }}
          onError={(error) => {
            console.error('Errore creazione condizione di pagamento:', error);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
