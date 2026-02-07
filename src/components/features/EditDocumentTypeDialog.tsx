/**
 * Dialog per modificare una configurazione tipo documento esistente
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
import { Edit } from 'lucide-react';

interface EditDocumentTypeDialogProps {
  documentType: {
    id: string;
    code: string;
    description: string;
    numeratorCode: string;
    inventoryMovement: boolean;
    valuationImpact: boolean;
    operationSignStock: number | null;
    operationSignValuation: number | null;
    active: boolean;
  };
}

export function EditDocumentTypeDialog({ documentType }: EditDocumentTypeDialogProps) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifica Configurazione Tipo Documento</DialogTitle>
          <DialogDescription>
            Modifica i dati della configurazione tipo documento. Il codice non può essere modificato.
          </DialogDescription>
        </DialogHeader>
        <DocumentTypeForm
          key={key}
          documentType={documentType}
          onSuccess={() => {
            setOpen(false);
            setKey((k) => k + 1); // Reset form
            window.location.reload();
          }}
          onError={(error) => {
            console.error('Errore aggiornamento configurazione:', error);
            alert(error);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
