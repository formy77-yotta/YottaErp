/**
 * Pagina Amministrazione – Gestione pagamenti
 *
 * Elenco pagamenti, Nuovo pagamento e Collega scadenze.
 */

import { Wallet } from 'lucide-react';
import { PaymentsSection } from '@/components/features/payments/PaymentsSection';

export const dynamic = 'force-dynamic';

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Wallet className="h-8 w-8" />
          Pagamenti
        </h1>
        <p className="text-muted-foreground mt-1">
          Elenco movimenti di cassa e banche. Registra nuovi pagamenti o collega pagamenti esistenti alle scadenze.
        </p>
      </div>

      <PaymentsSection />
    </div>
  );
}
