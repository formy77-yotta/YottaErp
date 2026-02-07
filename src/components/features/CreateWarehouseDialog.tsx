/**
 * Dialog per creare un nuovo magazzino
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
import { Plus } from 'lucide-react';

export function CreateWarehouseDialog() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuovo Magazzino
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuovo Magazzino</DialogTitle>
          <DialogDescription>
            Inserisci i dati del magazzino. Il codice deve essere univoco per organizzazione.
          </DialogDescription>
        </DialogHeader>
        <WarehouseForm
          key={key}
          onSuccess={() => {
            setOpen(false);
            setKey((k) => k + 1); // Reset form
            // Ricarica la pagina per mostrare i nuovi dati
            window.location.reload();
          }}
          onError={(error) => {
            console.error('Errore creazione magazzino:', error);
            // TODO: Mostrare toast di errore
            alert(error);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
