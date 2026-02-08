'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Calculator, Loader2 } from 'lucide-react';
import { recalculateStatsForYearAction } from '@/services/actions/stats-actions';

const currentYear = new Date().getFullYear();

export function RecalculateStatsButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleRecalculate = () => {
    const confirmed = window.confirm(
      `Ricalcolare tutte le statistiche di valorizzazione per l'anno ${currentYear}?\n\nVerranno eliminati i dati esistenti e ricalcolati da tutti i documenti con valorizzazione. Questa operazione può richiedere alcuni secondi.`
    );
    if (!confirmed) return;

    setMessage(null);
    startTransition(async () => {
      const result = await recalculateStatsForYearAction(currentYear);
      if (result.success) {
        setMessage({
          type: 'success',
          text: `Statistiche ricalcolate. Processati ${result.data.documentsProcessed} documenti.`,
        });
        router.refresh();
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleRecalculate}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Calculator className="h-4 w-4 mr-2" />
        )}
        Ricalcola statistiche
      </Button>
      {message && (
        <p
          className={`text-sm ${
            message.type === 'success' ? 'text-green-600' : 'text-destructive'
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
