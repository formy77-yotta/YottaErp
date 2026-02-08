/**
 * Pagina Amministrazione – Gestione banche e conti finanziari
 *
 * Elenco conti (Banca, Cassa, Virtuale) con saldo attuale e azioni Aggiungi / Elimina.
 */

import { Landmark } from 'lucide-react';
import { FinancialAccountsSection } from '@/components/features/finance/FinancialAccountsSection';

export const dynamic = 'force-dynamic';

export default function FinancialAccountsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Landmark className="h-8 w-8" />
          Banche e conti
        </h1>
        <p className="text-muted-foreground mt-1">
          Gestisci conti correnti, cassa e conti virtuali. Il saldo è calcolato come saldo iniziale + entrate − uscite.
        </p>
      </div>

      <FinancialAccountsSection />
    </div>
  );
}
