/**
 * Pulsante per eliminare un magazzino
 */

'use client';

import { useState } from 'react';
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
import { deleteWarehouseAction } from '@/services/actions/warehouse-actions';
import { Trash2 } from 'lucide-react';

interface DeleteWarehouseButtonProps {
  warehouseId: string;
}

export function DeleteWarehouseButton({ warehouseId }: DeleteWarehouseButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = await deleteWarehouseAction(warehouseId);
      if (result.success) {
        setOpen(false);
        // Ricarica la pagina per mostrare i dati aggiornati
        window.location.reload();
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Errore sconosciuto');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Elimina Magazzino</AlertDialogTitle>
          <AlertDialogDescription>
            Sei sicuro di voler eliminare questo magazzino? Questa azione non può essere annullata.
            <br />
            <br />
            <strong>Attenzione:</strong> Non è possibile eliminare un magazzino se ci sono movimenti
            di magazzino o documenti collegati.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Eliminazione...' : 'Elimina'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
