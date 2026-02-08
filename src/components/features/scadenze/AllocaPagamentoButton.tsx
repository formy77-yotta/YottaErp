'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';
import { ReconcilePaymentDialog, type ScadenzaRow } from './ReconcilePaymentDialog';

export function AllocaPagamentoButton({ row }: { row: ScadenzaRow }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        title="Pagamento"
      >
        <Wallet className="h-4 w-4 mr-1" />
        Pagamento
      </Button>
      <ReconcilePaymentDialog
        open={open}
        onOpenChange={setOpen}
        scadenza={open ? row : null}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
