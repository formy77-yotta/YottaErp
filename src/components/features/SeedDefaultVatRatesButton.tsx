/**
 * Pulsante per caricare aliquote IVA standard italiane
 */

'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { seedDefaultVatRatesAction } from '@/services/actions/vat-actions';
import { Download, Loader2 } from 'lucide-react';

export function SeedDefaultVatRatesButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleSeed() {
    startTransition(async () => {
      try {
        const result = await seedDefaultVatRatesAction();
        
        if (result.success) {
          // Ricarica la pagina per mostrare le nuove aliquote
          router.refresh();
        } else {
          console.error('Errore caricamento aliquote standard:', result.error);
          // TODO: Mostrare toast di errore
          alert(result.error);
        }
      } catch (error) {
        console.error('Errore caricamento aliquote standard:', error);
        alert('Errore durante il caricamento delle aliquote standard');
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
          Carica Standard Italiane
        </>
      )}
    </Button>
  );
}
