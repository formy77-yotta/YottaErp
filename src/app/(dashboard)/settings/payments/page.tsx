/**
 * Pagina gestione Pagamenti
 * 
 * Permette di visualizzare, creare e modificare:
 * - Tipi di Pagamento (PaymentType) - SDI/SEPA compliant
 * - Condizioni di Pagamento (PaymentCondition) - Logica scadenze
 * 
 * MULTITENANT: Tutti i dati sono filtrati per organizationId
 */

import { Suspense } from 'react';
import { PaymentsTabs } from '@/components/features/PaymentsTabs';
import { getPaymentTypes, getPaymentConditions } from '@/services/queries/payment-queries';
import { PaymentTypesTable } from '@/components/features/PaymentTypesTable';
import { PaymentConditionsTable } from '@/components/features/PaymentConditionsTable';
import { PaymentTypesTableSkeleton } from '@/components/features/PaymentTypesTableSkeleton';
import { PaymentConditionsTableSkeleton } from '@/components/features/PaymentConditionsTableSkeleton';

// Forza rendering dinamico perché usa cookies per autenticazione
export const dynamic = 'force-dynamic';

/**
 * Componente principale della pagina
 */
export default async function PaymentsPage() {
  // Fetch dati in parallelo
  const [paymentTypes, paymentConditions] = await Promise.all([
    getPaymentTypes(false),
    getPaymentConditions(false),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Gestione Pagamenti</h1>
        <p className="text-muted-foreground mt-1">
          Configura tipi di pagamento (SDI/SEPA) e condizioni di pagamento per lo scadenziario
        </p>
      </div>

      {/* Tabs per Tipi e Condizioni */}
      <PaymentsTabs
        paymentTypes={paymentTypes}
        paymentConditions={paymentConditions}
      />
    </div>
  );
}
