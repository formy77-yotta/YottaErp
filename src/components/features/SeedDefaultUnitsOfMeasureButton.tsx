/**
 * Pulsante per caricare unità di misura standard italiane
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { seedDefaultUnitsOfMeasureAction } from '@/services/actions/unit-of-measure-actions';
import { Download, Loader2 } from 'lucide-react';

export function SeedDefaultUnitsOfMeasureButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleSeed() {
    startTransition(async () => {
      try {
        const result = await seedDefaultUnitsOfMeasureAction();
        
        if (result.success) {
          // Ricarica la pagina per mostrare le nuove unità di misura
          router.refresh();
        } else {
          console.error('Errore caricamento unità di misura standard:', result.error);
          // TODO: Mostrare toast di errore
          alert(result.error);
        }
      } catch (error) {
        console.error('Errore caricamento unità di misura standard:', error);
        alert('Errore durante il caricamento delle unità di misura standard');
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
