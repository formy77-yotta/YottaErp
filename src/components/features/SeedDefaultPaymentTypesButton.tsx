/**
 * Pulsante per caricare tipi di pagamento standard SDI/SEPA
 */

'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { seedDefaultPaymentTypesAction } from '@/services/actions/payment-actions';
import { Download, Loader2 } from 'lucide-react';

export function SeedDefaultPaymentTypesButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleSeed() {
    startTransition(async () => {
      try {
        const result = await seedDefaultPaymentTypesAction();
        
        if (result.success) {
          // Ricarica la pagina per mostrare i nuovi tipi
          router.refresh();
        } else {
          console.error('Errore caricamento tipi di pagamento standard:', result.error);
          // TODO: Mostrare toast di errore
          alert(result.error);
        }
      } catch (error) {
        console.error('Errore caricamento tipi di pagamento standard:', error);
        alert('Errore durante il caricamento dei tipi di pagamento standard');
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
          Carica Standard SDI/SEPA
        </>
      )}
    </Button>
  );
}
