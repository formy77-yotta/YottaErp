/**
 * Pulsante per eliminare un'unità di misura
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
import { deleteUnitOfMeasureAction } from '@/services/actions/unit-of-measure-actions';
import { Trash2, Loader2 } from 'lucide-react';

interface DeleteUnitOfMeasureButtonProps {
  unitId: string;
}

export function DeleteUnitOfMeasureButton({ unitId }: DeleteUnitOfMeasureButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  async function handleDelete() {
    startTransition(async () => {
      try {
        const result = await deleteUnitOfMeasureAction(unitId);
        
        if (result.success) {
          setOpen(false);
          // Ricarica la pagina per mostrare i nuovi dati
          router.refresh();
        } else {
          console.error('Errore eliminazione unità di misura:', result.error);
          // TODO: Mostrare toast di errore
          alert(result.error);
        }
      } catch (error) {
        console.error('Errore eliminazione unità di misura:', error);
        alert('Errore durante l\'eliminazione dell\'unità di misura');
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
            Sei sicuro di voler eliminare questa unità di misura? 
            L'operazione non può essere annullata.
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
