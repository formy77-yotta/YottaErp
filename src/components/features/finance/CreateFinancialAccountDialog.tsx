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
import { FinancialAccountForm } from './FinancialAccountForm';
import { Plus } from 'lucide-react';

interface CreateFinancialAccountDialogProps {
  onSuccess?: () => void;
}

export function CreateFinancialAccountDialog({ onSuccess }: CreateFinancialAccountDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Aggiungi conto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuovo conto finanziario</DialogTitle>
          <DialogDescription>
            Aggiungi una banca, cassa o conto virtuale. Il saldo iniziale può essere zero o un valore di apertura.
          </DialogDescription>
        </DialogHeader>
        <FinancialAccountForm
          onSuccess={handleSuccess}
          onError={(err) => console.error('Errore creazione conto:', err)}
        />
      </DialogContent>
    </Dialog>
  );
}
