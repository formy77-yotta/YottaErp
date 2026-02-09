'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ReconcilePaymentDialog } from '@/components/features/scadenze/ReconcilePaymentDialog';
import { PaymentsTable } from './PaymentsTable';
import { Plus } from 'lucide-react';

export function PaymentsSection() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [newPaymentOpen, setNewPaymentOpen] = useState(false);
  const [linkPaymentId, setLinkPaymentId] = useState<string | null>(null);

  const handleSuccess = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setNewPaymentOpen(false);
    setLinkPaymentId(null);
    router.refresh();
  }, [router]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => { setLinkPaymentId(null); setNewPaymentOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Nuovo pagamento
        </Button>
      </div>

      <PaymentsTable
        refreshKey={refreshKey}
        onCollegaScadenze={(paymentId) => setLinkPaymentId(paymentId)}
        onDeleted={handleSuccess}
      />

      <ReconcilePaymentDialog
        open={newPaymentOpen}
        onOpenChange={setNewPaymentOpen}
        scadenza={null}
        onSuccess={handleSuccess}
      />
      <ReconcilePaymentDialog
        open={!!linkPaymentId}
        onOpenChange={(open) => !open && setLinkPaymentId(null)}
        scadenza={null}
        initialPaymentId={linkPaymentId}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
