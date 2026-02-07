/**
 * Componente pulsante per eliminare un'anagrafica
 * 
 * Verifica automaticamente le dipendenze prima di eliminare
 */

'use client';

import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
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
import { deleteEntityAction, checkEntityDependenciesAction } from '@/services/actions/entity-actions';
import { useRouter } from 'next/navigation';

interface DeleteEntityButtonProps {
  entityId: string;
  entityName: string;
}

export function DeleteEntityButton({ entityId, entityName }: DeleteEntityButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [dependencies, setDependencies] = useState<{
    hasDependencies: boolean;
    documentCount: number;
    documentTypes: Array<{ type: string; count: number }>;
  } | null>(null);
  const router = useRouter();

  const documentTypeLabels: Record<string, string> = {
    QUOTE: 'Preventivi',
    ORDER: 'Ordini',
    DELIVERY_NOTE: 'DDT',
    INVOICE: 'Fatture',
    CREDIT_NOTE: 'Note di credito',
  };

  async function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    
    // Quando si apre il dialog, verifica le dipendenze
    if (newOpen) {
      setIsPending(true);
      const result = await checkEntityDependenciesAction(entityId);
      setIsPending(false);
      
      if (result.success) {
        setDependencies(result.data);
      } else {
        alert(result.error);
        setOpen(false);
      }
    } else {
      setDependencies(null);
    }
  }

  async function handleDelete() {
    setIsPending(true);
    
    try {
      const result = await deleteEntityAction(entityId);
      
      if (result.success) {
        setOpen(false);
        router.refresh();
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Errore eliminazione anagrafica:', error);
      alert('Errore durante l\'eliminazione dell\'anagrafica');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
          <AlertDialogDescription>
            {isPending && !dependencies ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifica dipendenze in corso...</span>
              </div>
            ) : dependencies?.hasDependencies ? (
              <>
                <p className="mb-2">
                  Impossibile eliminare l'anagrafica <strong>{entityName}</strong> perché ha documenti collegati.
                </p>
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">
                    Documenti trovati: <strong>{dependencies.documentCount}</strong>
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {dependencies.documentTypes.map((dt) => (
                      <li key={dt.type}>
                        {documentTypeLabels[dt.type] || dt.type}: {dt.count}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-destructive font-medium mt-4">
                    ⚠️ Elimina prima tutti i documenti associati per poter eliminare l'anagrafica.
                  </p>
                </div>
              </>
            ) : (
              <>
                <p className="mb-2">
                  Sei sicuro di voler eliminare l'anagrafica <strong>{entityName}</strong>?
                </p>
                <p className="text-destructive font-medium">
                  ⚠️ Questa operazione è irreversibile e non può essere annullata.
                </p>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {dependencies?.hasDependencies ? 'Chiudi' : 'Annulla'}
          </AlertDialogCancel>
          {!dependencies?.hasDependencies && (
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Elimina
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
