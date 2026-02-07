/**
 * Dialog per creare una nuova configurazione tipo documento
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
import { DocumentTypeForm } from './DocumentTypeForm';
import { Plus } from 'lucide-react';

export function CreateDocumentTypeDialog() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuova Configurazione
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuova Configurazione Tipo Documento</DialogTitle>
          <DialogDescription>
            Inserisci i dati della configurazione tipo documento. Il codice deve essere univoco per organizzazione.
          </DialogDescription>
        </DialogHeader>
        <DocumentTypeForm
          key={key}
          onSuccess={() => {
            setOpen(false);
            setKey((k) => k + 1); // Reset form
            window.location.reload();
          }}
          onError={(error) => {
            console.error('Errore creazione configurazione:', error);
            alert(error);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
