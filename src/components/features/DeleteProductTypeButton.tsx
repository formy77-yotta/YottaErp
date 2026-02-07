/**
 * Pulsante per eliminare una tipologia articolo
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
import { deleteProductTypeAction } from '@/services/actions/product-type-actions';
import { Trash2, Loader2 } from 'lucide-react';

interface DeleteProductTypeButtonProps {
  typeId: string;
}

export function DeleteProductTypeButton({ typeId }: DeleteProductTypeButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  async function handleDelete() {
    startTransition(async () => {
      try {
        const result = await deleteProductTypeAction(typeId);
        
        if (result.success) {
          setOpen(false);
          // Ricarica la pagina per mostrare i nuovi dati
          router.refresh();
        } else {
          console.error('Errore eliminazione tipologia:', result.error);
          // TODO: Mostrare toast di errore
          alert(result.error);
        }
      } catch (error) {
        console.error('Errore eliminazione tipologia:', error);
        alert('Errore durante l\'eliminazione della tipologia');
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
          <AlertDialogDescription>
            Sei sicuro di voler eliminare questa tipologia? 
            L'operazione non può essere annullata.
            <br />
            <strong className="text-destructive">
              Nota: Non è possibile eliminare una tipologia se ci sono prodotti associati.
            </strong>
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
