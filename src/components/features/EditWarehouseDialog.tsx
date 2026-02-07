/**
 * Dialog per modificare un magazzino esistente
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
import { WarehouseForm } from './WarehouseForm';
import { Pencil } from 'lucide-react';

interface EditWarehouseDialogProps {
  warehouse: {
    id: string;
    code: string;
    name: string;
    address: string | null;
  };
}

export function EditWarehouseDialog({ warehouse }: EditWarehouseDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modifica Magazzino</DialogTitle>
          <DialogDescription>
            Modifica i dati del magazzino. Il codice non può essere modificato.
          </DialogDescription>
        </DialogHeader>
        <WarehouseForm
          warehouse={warehouse}
          onSuccess={() => {
            setOpen(false);
            // Ricarica la pagina per mostrare i dati aggiornati
            window.location.reload();
          }}
          onError={(error) => {
            console.error('Errore aggiornamento magazzino:', error);
            // TODO: Mostrare toast di errore
            alert(error);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
