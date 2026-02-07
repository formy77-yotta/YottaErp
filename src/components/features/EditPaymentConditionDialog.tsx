/**
 * Dialog per modificare una condizione di pagamento esistente
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
import { Pencil } from 'lucide-react';

interface EditPaymentConditionDialogProps {
  condition: {
    id: string;
    name: string;
    paymentTypeId: string;
    daysToFirstDue: number;
    gapBetweenDues: number;
    numberOfDues: number;
    isEndOfMonth: boolean;
    active: boolean;
  };
}

export function EditPaymentConditionDialog({ condition }: EditPaymentConditionDialogProps) {
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
          <DialogTitle>Modifica Condizione di Pagamento</DialogTitle>
          <DialogDescription>
            Modifica i parametri della condizione di pagamento. Le scadenze esistenti sui documenti non verranno modificate.
          </DialogDescription>
        </DialogHeader>
        <PaymentConditionForm
          condition={condition}
          onSuccess={() => {
            setOpen(false);
          }}
          onError={(error) => {
            console.error('Errore modifica condizione di pagamento:', error);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
