/**
 * Dialog per creare una nuova entità
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
import { EntityForm } from '@/components/features/EntityForm';
import { Plus } from 'lucide-react';

export function CreateEntityDialog() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuova Anagrafica
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuova Anagrafica</DialogTitle>
          <DialogDescription>
            Inserisci i dati dell'anagrafica. La P.IVA deve essere unica per organizzazione.
          </DialogDescription>
        </DialogHeader>
        <EntityForm
          key={key}
          onSuccess={() => {
            setOpen(false);
            setKey((k) => k + 1); // Reset form
            // La revalidazione viene fatta automaticamente dalla Server Action
          }}
          onError={(error) => {
            console.error('Errore creazione entità:', error);
            // L'errore viene mostrato nel form tramite setError
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
