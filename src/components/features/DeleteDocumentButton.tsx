/**
 * Pulsante per eliminare un documento
 * 
 * Elimina il documento e tutti i movimenti di magazzino collegati
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { deleteDocumentAction } from '@/services/actions/document-actions';
import { Trash2, Loader2 } from 'lucide-react';

interface DeleteDocumentButtonProps {
  documentId: string;
  documentNumber: string;
  documentType: string;
}

export function DeleteDocumentButton({ 
  documentId, 
  documentNumber,
  documentType 
}: DeleteDocumentButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleDelete() {
    startTransition(async () => {
      const result = await deleteDocumentAction(documentId);

      if (result.success) {
        setOpen(false);
        router.push('/documents');
        router.refresh();
      } else {
        alert(`Errore durante l'eliminazione del documento: ${result.error}`);
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="destructive" 
          size="sm"
          className="text-destructive-foreground"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Elimina
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
          <AlertDialogDescription>
            Sei sicuro di voler eliminare il documento <strong>{documentType} {documentNumber}</strong>?
            <br />
            <br />
            <strong className="text-destructive">
              ⚠️ Questa operazione eliminerà:
            </strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Il documento e tutte le sue righe</li>
              <li>Tutti i movimenti di magazzino collegati</li>
            </ul>
            <br />
            <strong>L'operazione non può essere annullata.</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Elimina
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
