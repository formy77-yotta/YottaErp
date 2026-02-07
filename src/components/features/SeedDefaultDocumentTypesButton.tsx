/**
 * Pulsante per caricare configurazioni tipi documento standard
 */

'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { seedDefaultDocumentTypesAction } from '@/services/actions/document-type-actions';
import { Download, Loader2 } from 'lucide-react';

export function SeedDefaultDocumentTypesButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleSeed() {
    startTransition(async () => {
      try {
        const result = await seedDefaultDocumentTypesAction();
        
        if (result.success) {
          // Ricarica la pagina per mostrare le nuove configurazioni
          router.refresh();
        } else {
          console.error('Errore caricamento configurazioni standard:', result.error);
          alert(result.error);
        }
      } catch (error) {
        console.error('Errore caricamento configurazioni standard:', error);
        alert('Errore durante il caricamento delle configurazioni standard');
      }
    });
  }

  return (
    <Button
      variant="outline"
      onClick={handleSeed}
      disabled={isPending}
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Caricamento...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Carica Standard
        </>
      )}
    </Button>
  );
}
