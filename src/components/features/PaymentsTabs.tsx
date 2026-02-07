/**
 * Componente Client per gestire i Tabs della pagina pagamenti
 * 
 * Gestisce lo stato dei tabs (Tipi di Pagamento / Condizioni di Pagamento)
 */

'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreatePaymentTypeDialog } from '@/components/features/CreatePaymentTypeDialog';
import { CreatePaymentConditionDialog } from '@/components/features/CreatePaymentConditionDialog';
import { PaymentTypesTable } from './PaymentTypesTable';
import { PaymentConditionsTable } from './PaymentConditionsTable';
import { PaymentTypesTableSkeleton } from './PaymentTypesTableSkeleton';
import { PaymentConditionsTableSkeleton } from './PaymentConditionsTableSkeleton';
import { Suspense } from 'react';

export function PaymentsTabs() {
  const [activeTab, setActiveTab] = useState('types');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="types">Tipi di Pagamento</TabsTrigger>
        <TabsTrigger value="conditions">Condizioni di Pagamento</TabsTrigger>
      </TabsList>

      {/* Tab Tipi di Pagamento */}
      <TabsContent value="types" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Tipi di Pagamento</h2>
            <p className="text-sm text-muted-foreground">
              Metodi di pagamento conformi SDI (MP01-MP23) e SEPA
            </p>
          </div>
          <CreatePaymentTypeDialog />
        </div>

        <Suspense fallback={<PaymentTypesTableSkeleton />}>
          <PaymentTypesTable />
        </Suspense>
      </TabsContent>

      {/* Tab Condizioni di Pagamento */}
      <TabsContent value="conditions" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Condizioni di Pagamento</h2>
            <p className="text-sm text-muted-foreground">
              Logica di calcolo scadenze (rate, giorni, fine mese)
            </p>
          </div>
          <CreatePaymentConditionDialog />
        </div>

        <Suspense fallback={<PaymentConditionsTableSkeleton />}>
          <PaymentConditionsTable />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}
